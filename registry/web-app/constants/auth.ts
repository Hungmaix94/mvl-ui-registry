export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const

export const AUTH_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const

/**
 * Token refresh configuration
 */
export const TOKEN_CONFIG = {
  /** Time before expiry to trigger refresh (in milliseconds) */
  REFRESH_BEFORE_EXPIRY: 5 * 60 * 1000, // 5 minutes
  /** Interval to check token status (in milliseconds) */
  CHECK_INTERVAL: 10 * 1000, // 10 seconds
  /** Default token expiry time if not provided by API (in milliseconds) */
  DEFAULT_EXPIRY: 3600 * 1000, // 1 hour
} as const
