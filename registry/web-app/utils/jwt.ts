/**
 * JWT utility functions for parsing and decoding JWT tokens
 */

export interface JWTPayload {
  token_type: string // "access" or "refresh"
  exp: number // Expiration time (Unix timestamp)
  iat: number // Issued at (Unix timestamp)
  jti: string // JWT ID (unique identifier)
  user_id: string // User ID
  device_id: string | null // Device ID (can be null)
}

/**
 * Decode JWT token without verification (client-side only)
 * Note: This is for reading claims only, not for security verification
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.warn('[JWT] Invalid token format')
      return null
    }

    // Decode base64url encoded payload
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded) as JWTPayload
  } catch (error) {
    console.warn('[JWT] Failed to decode token:', error)
    return null
  }
}

/**
 * Get expiration time from JWT token (in milliseconds)
 * Returns null if token is invalid or doesn't have exp claim
 */
export function getTokenExpirationTime(token: string): number | null {
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) {
    return null
  }

  // Convert Unix timestamp to milliseconds
  return payload.exp * 1000
}

/**
 * Check if JWT token is expired
 */
export function isJWTExpired(token: string): boolean {
  const expTime = getTokenExpirationTime(token)
  if (!expTime) {
    return true // Consider invalid tokens as expired
  }

  return Date.now() >= expTime
}

/**
 * Get time until JWT token expires (in milliseconds)
 * Returns 0 if token is expired or invalid
 */
export function getTimeUntilJWTExpiry(token: string): number {
  const expTime = getTokenExpirationTime(token)
  if (!expTime) {
    return 0
  }

  const timeLeft = expTime - Date.now()
  return Math.max(0, timeLeft)
}

/**
 * Check if JWT token will expire soon (within given threshold)
 */
export function isJWTExpiringSoon(token: string, thresholdMs: number = 5 * 60 * 1000): boolean {
  const timeLeft = getTimeUntilJWTExpiry(token)
  return timeLeft > 0 && timeLeft <= thresholdMs
}
