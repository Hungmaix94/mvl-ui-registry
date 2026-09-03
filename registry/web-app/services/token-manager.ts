import { TOKEN_CONFIG } from '@/constants'
import {
  getStoredToken,
  getStoredRefreshToken,
  storeAuthData,
  clearAuthData,
  isTokenExpired,
  isTokenExpiringSoon,
  getTimeUntilExpiry,
  hasAuthData,
} from '@/utils'
import { getStoredUser } from '@/utils'
import { STORAGE_KEYS } from '@/constants'
import { createApiClient } from '@/api/config/create-client'
import { getApiBaseUrl } from '@/config/environment'
import { getTokenExpirationTime } from '@/utils/jwt'
import { APP_PATH } from '@/routes'
import { ApiPaths } from '@/api/schema'
class TokenManager {
  private refreshPromise: Promise<string | null> | null = null
  private lastRefreshAttempt: number = 0
  private readonly MIN_REFRESH_INTERVAL = 1000 // 1 second cooldown between refresh attempts
  private refreshAuthFailed = false
  private isIdle: boolean = false
  private backgroundRefreshFailureCount: number = 0
  private refreshInterval: NodeJS.Timeout | null = null
  private refreshClient = createApiClient(getApiBaseUrl()) // Separate client to avoid circular dependency

  /**
   * Get current valid token, refresh if needed
   * - If expired: block and await refresh, return new token
   * - If expiring soon: trigger background refresh, return current token immediately
   */
  async getValidToken(): Promise<string | null> {
    const token = getStoredToken()

    if (!token) {
      return null
    }

    // If token is expired, block and await refresh
    if (isTokenExpired()) {
      return await this.refreshToken()
    }

    // If token is expiring soon, trigger background refresh but don't wait
    if (isTokenExpiringSoon()) {
      if (!this.refreshPromise) {
        this.refreshTokenInBackground()
      }
      // CRITICAL: Double-check after triggering background refresh
      if (isTokenExpired()) {
        return await this.refreshToken()
      }
      // Return current token immediately - any 401 will be handled by retry logic
    }

    return token
  }

  /**
   * Refresh token using refresh token with validation, rate limiting, and retry logic
   */
  async refreshToken(): Promise<string | null> {
    const now = Date.now()
    const refreshToken = getStoredRefreshToken()

    // 0) Validation: ensure refresh token is present and not expired
    if (!refreshToken) {
      this.handleRefreshFailure()
      return null
    }
    const refreshTokenExpiryStorage = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN_EXPIRY)
    if (refreshTokenExpiryStorage && Date.now() >= parseInt(refreshTokenExpiryStorage)) {
      this.handleRefreshFailure()
      return null
    }

    // Circuit breaker: after refresh returned 401/403, do not call refresh API again
    if (this.refreshAuthFailed) {
      this.handleRefreshFailure()
      return null
    }

    // Check JWT expiry but allow API call to proceed (server will validate and return 401)
    // This handles cases where client time is ahead of server time (clock skew)
    // If JWT exp claim shows expired, we still call API to let server validate

    // 1) Reuse any ongoing refresh first (single-flight)
    if (this.refreshPromise) {
      return await this.refreshPromise
    }

    // 2) Rate limiting check
    const timeSinceLastRefresh = now - this.lastRefreshAttempt
    if (timeSinceLastRefresh < this.MIN_REFRESH_INTERVAL) {
      console.warn('[TokenManager] Refresh throttled - too frequent')
      return null
    }
    // Set lastRefreshAttempt AFTER passing rate limit check
    this.lastRefreshAttempt = now

    // 3) Start new refresh (with retry wrapper)
    this.refreshPromise = this.performRefreshWithRetry()
    try {
      return await this.refreshPromise
    } catch (error: any) {
      // If it's an auth error (401/403), set circuit breaker and handle refresh failure (logout user)
      if (error?.message?.startsWith('AUTH_ERROR:')) {
        this.refreshAuthFailed = true
        this.handleRefreshFailure()
      }
      throw error
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Perform the actual token refresh (base method - no single-flight, no retry)
   */
  private async performRefresh(): Promise<string | null> {
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) throw new Error('No refresh token')

    // Call new refresh endpoint defined in OpenAPI schema: POST /api/token/refresh/
    const res = await this.refreshClient.POST(ApiPaths.token_refresh_create, {
      body: { refresh: refreshToken },
    })

    // Handle auth failure explicitly to avoid retries
    if (res.error) {
      const status = res.response?.status
      if (status === 401 || status === 403) {
        throw new Error(`AUTH_ERROR: ${status}`)
      }
      throw new Error(`Refresh failed: ${status || 500}`)
    }

    if (!res.data) {
      throw new Error('Refresh failed: No data received')
    }

    // Parse response directly since we're using a separate client
    const apiResponse = res.data as any
    if (!apiResponse.success) {
      // Check if error indicates token invalid/expired/blacklisted (treat as auth error)
      // Use only error.errors[].code so we do not depend on detail (may be translated)
      const error = apiResponse.error
      const AUTH_ERROR_CODES = ['token_not_valid', 'authentication_failed']
      const isTokenError =
        error?.errors?.some((e: any) => e?.code && AUTH_ERROR_CODES.includes(e.code)) || false

      // If it's a token validation error, treat as auth error (401 equivalent)
      // This handles cases where server returns 200 with success=false instead of 401
      if (isTokenError) {
        throw new Error('AUTH_ERROR: 401')
      }

      throw new Error('Refresh failed: API returned success=false')
    }

    const payload = apiResponse.data || {}
    const accessToken: string | undefined = payload?.access
    const newRefreshToken: string | undefined = payload?.refresh

    if (!accessToken) {
      throw new Error('Invalid refresh response: missing access token')
    }

    // Get expiration time from JWT token for accurate timing
    const jwtExpirationTime = getTokenExpirationTime(accessToken)
    const expiresIn = jwtExpirationTime || Date.now() + TOKEN_CONFIG.DEFAULT_EXPIRY
    const tokenType = 'Bearer'

    storeAuthData(getStoredUser(), {
      accessToken,
      refreshToken: newRefreshToken || refreshToken,
      expiresIn,
      tokenType,
    })
    return accessToken
  }

  /**
   * Retry wrapper - handles network failures with exponential backoff
   */
  private async performRefreshWithRetry(): Promise<string | null> {
    const maxRetries = 3
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        // Check network status before retry
        if (!navigator.onLine) {
          throw new Error('Network offline')
        }

        return await this.performRefresh()
      } catch (error) {
        if (this.isNetworkError(error) && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay))
          attempt++
          continue
        }
        throw error
      }
    }
    return null
  }

  /**
   * Check if error is network-related and retryable
   */
  private isNetworkError(error: any): boolean {
    // Do not retry auth errors surfaced from performRefresh()
    if (error?.message?.startsWith('AUTH_ERROR:')) return false
    // Narrow network/server indicators; do NOT use navigator.onLine here
    return (
      (error instanceof TypeError &&
        (error.message?.toLowerCase().includes('failed to fetch') ||
          error.message?.toLowerCase().includes('network') ||
          error.message?.toLowerCase().includes('fetch'))) ||
      error?.name === 'NetworkError' ||
      error?.name === 'AbortError' ||
      // Treat 5xx surfaced messages as retryable
      error?.message?.includes('Refresh failed: 5')
    )
  }

  /**
   * Set idle state to control background refresh behavior
   */
  setIdle(isIdle: boolean): void {
    this.isIdle = isIdle
  }

  /**
   * Check if currently refreshing
   */
  isRefreshing(): boolean {
    return this.refreshPromise !== null
  }

  /**
   * Refresh token in background without blocking
   */
  private async refreshTokenInBackground(): Promise<void> {
    // Skip background refresh if user is idle
    if (this.isIdle) {
      return
    }

    try {
      const result = await this.refreshToken()
      if (result) {
        this.backgroundRefreshFailureCount = 0 // Reset on success
      }
    } catch (error) {
      console.error('Background token refresh failed:', error)
      this.backgroundRefreshFailureCount = Math.min(this.backgroundRefreshFailureCount + 1, 1000)

      // Log warning if too many failures
      if (this.backgroundRefreshFailureCount >= 3) {
        console.warn('[TokenManager] Multiple background refresh failures detected')
      }
    }
  }

  /**
   * Handle refresh failure - clear auth data and logout user
   */
  private handleRefreshFailure(): void {
    const hadSession = hasAuthData()

    // Logout user if there was a previous session
    if (hadSession) {
      this.logoutUser()
    }
  }

  /**
   * Logout user and redirect to login
   * Clear auth data synchronously before redirect so localStorage is cleared
   * before the page unloads (logout() in store runs async and may not run in time)
   */
  private logoutUser(): void {
    clearAuthData()
    if (window.location.pathname !== APP_PATH.LOGIN) {
      window.location.href = APP_PATH.LOGIN
    }
  }

  /**
   * Check token status and get time until expiry
   */
  getTokenStatus(): {
    isValid: boolean
    isExpired: boolean
    isExpiringSoon: boolean
    timeUntilExpiry: number
  } {
    const token = getStoredToken()

    return {
      isValid: !!token && !isTokenExpired(),
      isExpired: isTokenExpired(),
      isExpiringSoon: isTokenExpiringSoon(),
      timeUntilExpiry: getTimeUntilExpiry(),
    }
  }

  /**
   * Reset circuit breaker after successful login so next 401 will attempt refresh again
   */
  resetRefreshAuthFailure(): void {
    this.refreshAuthFailed = false
  }

  /**
   * Start automatic token refresh
   */
  startAutoRefresh(): void {
    this.stopAutoRefresh() // Clear existing interval

    // Check at configured interval
    this.refreshInterval = setInterval(() => {
      // Skip background refresh if user is idle
      if (this.isIdle) {
        return
      }

      const status = this.getTokenStatus()
      if (status.isValid && status.isExpiringSoon) {
        const now = Date.now()
        const timeSinceLastRefresh = now - this.lastRefreshAttempt

        if (timeSinceLastRefresh > this.MIN_REFRESH_INTERVAL) {
          // DO NOT set lastRefreshAttempt here - it will be set in refreshToken() after rate limit check
          // This prevents double-throttling
          this.refreshTokenInBackground()
        }
      }
    }, TOKEN_CONFIG.CHECK_INTERVAL)
  }

  /**
   * Stop automatic token refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
  }

  /**
   * Check and refresh if needed (for onActive callback)
   */
  async checkAndRefreshIfNeeded(): Promise<void> {
    // Reuse main logic to ensure consistency
    await this.getValidToken()
  }
}

export const tokenManager = new TokenManager()
