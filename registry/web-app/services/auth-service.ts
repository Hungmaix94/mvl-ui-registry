import { type ApiResponse, BaseApiService } from '@/api/base-service'
import { ApiPaths, type components } from '@/api/schema.ts'
import { TOKEN_CONFIG } from '@/constants'
import { useApiMutation } from '@/hooks/useApiQuery'
import { clearAuthData, hasAuthData, storeAuthData, type TokenData } from '@/utils/auth'
import { tokenManager } from '@/services/token-manager'
import { APP_PATH } from '@/routes'
import { getConstantsService } from './constants-service'
import { useConstantsStore } from '@/store/constants-store'
import { getTokenExpirationTime } from '@/utils/jwt'
import { Me } from '@/services/user-service.ts'

// Type definitions from generated schema
export type LoginRequest = components['schemas']['LoginRequest']
// OTP flow types - preserved for future use if business logic changes
// These types may not exist in schema but kept for reference
export type LoginResponse = { message: string; username: string; email_hint: string }
export type OTPVerificationRequest = {
  username: string
  otp_code: string
  device_id?: string | null
}
export type OTPVerificationResponse = {
  message: string
  user: { id: string; username: string; email: string; full_name: string }
  tokens: Tokens
}
export type UserBasicInfo = { id: string; username: string; email: string; full_name: string }
// End of OTP flow types
export type User = Me
export type PasswordChangeRequest = components['schemas']['PasswordChangeRequest']
export type PasswordChangeResponse = components['schemas']['PasswordChangeResponse']
export type PasswordResetRequest = components['schemas']['PasswordResetRequest']
export type PasswordResetResponse = components['schemas']['PasswordResetResponse']
export type PasswordResetOTPVerificationRequest =
  components['schemas']['PasswordResetOTPVerificationRequest']
export type PasswordResetOTPVerificationResponse =
  components['schemas']['PasswordResetOTPVerificationResponse']
export type PasswordResetChangePasswordRequest =
  components['schemas']['PasswordResetChangePasswordRequest']
export type PasswordResetChangePasswordResponse =
  components['schemas']['PasswordResetChangePasswordResponse']
export type TokenRefreshRequest = components['schemas']['ClientAwareTokenRefreshRequest']
export type TokenRefreshResponse = components['schemas']['TokenRefreshResponse']
export type TokenVerifyRequest = components['schemas']['TokenVerifyRequest']
export type Tokens = components['schemas']['Tokens']

/**
 * Authentication service extending the base API service
 * Provides authentication-related API operations
 */
export class AuthService extends BaseApiService {
  /**
   * Login user with username and password
   * Returns tokens directly and stores them
   * OTP flow is no longer used - login returns tokens immediately
   *
   * NOTE: Login API returns 200 with tokens (schema shows content?: never but tokens are returned)
   * Tokens may be in response body or Set-Cookie headers
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<Tokens>> {
    const response = await this.client.POST(ApiPaths.auth_login_create, {
      body: credentials,
    })

    // Check for error response
    if (response.error) {
      throw response.error
    }

    // Extract tokens from response
    // The API returns tokens in response body with format:
    // { success: true, data: { message: string, user: {...}, tokens: { access: string, refresh: string } } }
    let tokens: Tokens | undefined

    // Try to extract from response.data (standard API response format)
    if (response.data && typeof response.data === 'object') {
      const data = response.data as any

      // Format: { success: true, data: { tokens: { access: string, refresh: string }, user: {...}, message: string } }
      if (data.success && data.data && data.data.tokens) {
        tokens = data.data.tokens as Tokens
      }
      // Fallback: { success: true, data: { access: string, refresh: string } } (direct tokens)
      else if (data.success && data.data && data.data.access && data.data.refresh) {
        tokens = data.data as Tokens
      }
      // Fallback: { access: string, refresh: string } directly
      else if (data.access && data.refresh) {
        tokens = data as Tokens
      }
    }

    // If no tokens found, throw error
    if (!tokens || !tokens.access || !tokens.refresh) {
      throw new Error('No tokens received from login API. Please check API response format.')
    }

    // Store tokens and load user data
    const jwtExpirationTime = getTokenExpirationTime(tokens.access)
    const expiresIn = jwtExpirationTime || Date.now() + TOKEN_CONFIG.DEFAULT_EXPIRY

    const tokenData: TokenData = {
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
      expiresIn,
      tokenType: 'Bearer',
    }

    // Extract user data from response if available
    let userData: { id: string; username: string; email: string; full_name: string } | null = null
    if (response.data && typeof response.data === 'object') {
      const data = response.data as any
      if (data.success && data.data && data.data.user) {
        userData = data.data.user
      }
    }

    // Store tokens and user data (user data from response, or will be loaded by useAuthInit if not available)
    storeAuthData(userData, tokenData)
    tokenManager.resetRefreshAuthFailure()

    // Load constants after successful authentication
    try {
      const constantsResponse = await getConstantsService().getConstants()
      if (constantsResponse) {
        const { setConstants } = useConstantsStore.getState()
        setConstants(constantsResponse)
      }
    } catch (error) {
      console.error('Failed to load constants:', error)
      // Don't throw error here as constants loading is not critical for login
    }

    return {
      data: tokens,
      success: true,
    }
  }

  /**
   * Verify OTP code after login
   * NOTE: This method is preserved for backward compatibility with OTP flow files
   * OTP flow is currently disabled - login returns tokens directly
   * This method can be re-enabled if business logic changes in the future
   */
  async verifyOtp(_otpData: OTPVerificationRequest) {
    // OTP endpoint no longer exists in new API schema
    // This method is kept for reference but will throw error
    throw new Error('OTP verification is no longer supported. Login returns tokens directly.')
  }

  /**
   * Change user password (when current password is known)
   */
  async changePassword(passwordData: PasswordChangeRequest, signal?: AbortSignal) {
    return await this.post(ApiPaths.auth_change_password_create, passwordData, { signal })
  }

  /**
   * Request password reset
   */
  async forgotPassword(request: PasswordResetRequest): Promise<PasswordResetResponse> {
    return await this.post(ApiPaths.auth_forgot_password_create, request)
  }

  /**
   * Verify OTP for password reset (Step 2)
   */
  async forgotPasswordVerifyOtp(
    request: PasswordResetOTPVerificationRequest
  ): Promise<PasswordResetOTPVerificationResponse> {
    return await this.post(ApiPaths.auth_forgot_password_verify_otp_create, request)
  }

  /**
   * Change password after OTP verification (Step 3)
   */
  async forgotPasswordChangePassword(request: PasswordResetChangePasswordRequest) {
    return await this.post(ApiPaths.auth_forgot_password_change_password_create, request)
  }

  /**
   * Refresh access token
   */
  async refreshToken(request: TokenRefreshRequest): Promise<TokenRefreshResponse> {
    return await this.post(ApiPaths.token_refresh_create, request)
  }

  /**
   * Verify token validity
   */
  async verifyToken(request: TokenVerifyRequest): Promise<boolean> {
    try {
      await this.post(ApiPaths.token_verify_create, request)
      return true
    } catch {
      return false
    }
  }

  /**
   * Logout user (clear local storage)
   */
  async logout(): Promise<void> {
    try {
      // No logout endpoint in new schema, just clear local data
      clearAuthData()
      window.location.href = APP_PATH.LOGIN
    } catch (error) {
      console.error('Logout error:', error)
      clearAuthData()
      window.location.href = APP_PATH.LOGIN
    }
  }

  /**
   * Check if user is authenticated (based on stored token and user data)
   */
  isAuthenticated(): boolean {
    return hasAuthData()
  }
}

// Create service instance via factory (lazy construction)
let _authService: AuthService | null = null

export function getAuthService(): AuthService {
  if (!_authService) {
    _authService = new AuthService()
  }
  return _authService
}

// For backward compatibility, export a getter
export const authService = {
  get instance() {
    return getAuthService()
  },
}

// React Query hooks for authentication operations
export function useLogin() {
  return useApiMutation((credentials: LoginRequest) => getAuthService().login(credentials))
}

export function useVerifyOtp() {
  return useApiMutation((otpData: OTPVerificationRequest) => getAuthService().verifyOtp(otpData), {
    onSuccess: () => {
      // Redirect to dashboard after successful OTP verification
      window.location.href = '/'
    },
  })
}

export function useChangePassword() {
  return useApiMutation(
    ({
      old_password,
      new_password,
      confirm_password,
      signal,
    }: PasswordChangeRequest & { signal?: AbortSignal }) =>
      getAuthService().changePassword({ old_password, new_password, confirm_password }, signal)
  )
}

export function useForgotPassword() {
  return useApiMutation((request: PasswordResetRequest) => getAuthService().forgotPassword(request))
}

export function useForgotPasswordVerifyOtp() {
  return useApiMutation((request: PasswordResetOTPVerificationRequest) =>
    getAuthService().forgotPasswordVerifyOtp(request)
  )
}

export function useForgotPasswordChangePassword() {
  return useApiMutation(
    (request: PasswordResetChangePasswordRequest) =>
      getAuthService().forgotPasswordChangePassword(request),
    {
      retry: false, // Disable retry to prevent double submission
    }
  )
}

export function useRefreshToken() {
  return useApiMutation((request: TokenRefreshRequest) => getAuthService().refreshToken(request))
}

export function useVerifyToken() {
  return useApiMutation((request: TokenVerifyRequest) => getAuthService().verifyToken(request))
}
