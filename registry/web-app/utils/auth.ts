import { STORAGE_KEYS } from '@/constants'
import { getTokenRefreshDuration } from '@/config/environment'
import { getTimeUntilJWTExpiry, isJWTExpired, isJWTExpiringSoon } from './jwt'
import { Permissions } from '@/services/user-service'

export interface TokenData {
  accessToken: string
  refreshToken: string
  expiresIn: number // milliseconds timestamp from API
  tokenType?: string
}

/**
 * Authentication utility functions
 * Shared logic for handling auth data in localStorage
 */

/**
 * Store user authentication data in localStorage
 */
export function storeAuthData(user: any, tokenData: TokenData): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user))
  }

  if (tokenData.accessToken) {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokenData.accessToken)
  }

  if (tokenData.refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refreshToken)
  }

  // Store expiry time (expiresIn from API is already a timestamp in milliseconds)
  const expiryTime = tokenData.expiresIn
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString())
}

/**
 * Clear user authentication data from localStorage
 */
export function clearAuthData(): void {
  localStorage.removeItem(STORAGE_KEYS.USER_DATA)
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY)
  localStorage.removeItem('auth-storage')
  clearAuthFlowInProgress() // Also clear auth flow flag when clearing auth data

  // Clear chat pinned messages from localStorage
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('mvl_chat_pinned_')) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))
}

/**
 * Check if user authentication data exists in localStorage
 */
export function hasAuthData(): boolean {
  return !!(
    localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) &&
    localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  )
}

/**
 * Get stored user data from localStorage
 */
export function getStoredUser(): any | null {
  const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA)
  return userData ? JSON.parse(userData) : null
}

/**
 * Get stored auth token from localStorage
 */
export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
}

/**
 * Get stored refresh token from localStorage
 */
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
}

/**
 * Check if token is expired
 * Uses JWT parsing for accurate expiration time
 */
export function isTokenExpired(): boolean {
  const token = getStoredToken()
  if (!token) return true

  // Try to get expiration from JWT first
  const jwtExpired = isJWTExpired(token)
  if (jwtExpired !== null) {
    return jwtExpired
  }

  // Fallback to stored expiry time
  const expiryTime = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY)
  if (!expiryTime) return true

  return Date.now() >= parseInt(expiryTime)
}

/**
 * Check if token will expire soon (based on JWT exp claim or fallback to config)
 */
export function isTokenExpiringSoon(): boolean {
  const token = getStoredToken()
  if (!token) return true

  // Try to get expiration from JWT first
  const refreshBeforeExpiry = getTokenRefreshDuration()
  const jwtExpiringSoon = isJWTExpiringSoon(token, refreshBeforeExpiry)
  if (jwtExpiringSoon !== null) {
    return jwtExpiringSoon
  }

  // Fallback to stored expiry time
  const expiryTime = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY)
  if (!expiryTime) return true

  const refreshThreshold = Date.now() + refreshBeforeExpiry
  return refreshThreshold >= parseInt(expiryTime)
}

/**
 * Get time until token expires (in seconds)
 * Uses JWT parsing for accurate expiration time
 */
export function getTimeUntilExpiry(): number {
  const token = getStoredToken()
  if (!token) return 0

  // Try to get expiration from JWT first
  const jwtTimeLeft = getTimeUntilJWTExpiry(token)
  if (jwtTimeLeft !== null) {
    return Math.floor(jwtTimeLeft / 1000)
  }

  // Fallback to stored expiry time
  const expiryTime = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY)
  if (!expiryTime) return 0

  const timeLeft = parseInt(expiryTime) - Date.now()
  return Math.max(0, Math.floor(timeLeft / 1000))
}

/**
 * Set auth flow in progress flag
 * Used to skip token verification during login -> OTP -> verify flow
 */
export function setAuthFlowInProgress(): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_FLOW_IN_PROGRESS, 'true')
}

/**
 * Clear auth flow in progress flag
 * Called when auth flow completes (OTP verified) or is cancelled
 */
export function clearAuthFlowInProgress(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_FLOW_IN_PROGRESS)
}

/**
 * Check if auth flow is in progress
 * Returns true if user is in the middle of login -> OTP -> verify flow
 */
export function isAuthFlowInProgress(): boolean {
  return localStorage.getItem(STORAGE_KEYS.AUTH_FLOW_IN_PROGRESS) === 'true'
}

export function hasPermission(permissions: Permissions, permissionCode: string) {
  return permissions.some((p) => p.code === permissionCode)
}
