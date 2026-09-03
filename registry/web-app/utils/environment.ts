import { TEnvironment } from '@/types'
import { ENVIRONMENT } from '@/constants'

/**
 * Checks if an environment variable value should be treated as empty/null
 * @param value - The environment variable value to check
 * @returns true if the value is empty string, undefined, null, or "NO_VALUE", false otherwise
 */
export function isEnvValueEmpty(value: string | undefined | null): boolean {
  return value === '' || value === undefined || value === null || value === 'NO_VALUE'
}

export function isLocalEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.') || // Local network IPv4
      window.location.hostname.startsWith('10.'))
  )
}

export function getEnvironmentFromUrl(): TEnvironment | undefined {
  if (typeof window === 'undefined') {
    console.warn(
      'Window object is not available. Function can only be run in a browser environment.'
    )
    return undefined
  }

  const hostname = window.location.hostname

  if (isLocalEnvironment()) {
    return ENVIRONMENT.LOCAL
  }

  if (hostname.includes('.dev.')) {
    return ENVIRONMENT.DEV
  }

  if (hostname.includes('.staging.')) {
    return ENVIRONMENT.STAGING
  }

  return ENVIRONMENT.PRODUCTION
}

/**
 * Get current environment
 * Combines development mode check with URL-based detection
 */
export function getCurrentEnvironment(): string {
  // For development mode (yarn dev), always use DEV
  if (typeof window !== 'undefined' && import.meta?.env?.DEV) {
    const env = import.meta.env.MODE
    return env === ENVIRONMENT.LOCAL ? ENVIRONMENT.LOCAL : ENVIRONMENT.DEV
  }

  // For production builds, detect from URL
  const environmentFromUrl = getEnvironmentFromUrl()
  return environmentFromUrl || ENVIRONMENT.PRODUCTION
}

/**
 * Check if current environment is allowed for a route
 */
export function isEnvironmentAllowed(allowedEnvironments?: string[]): boolean {
  if (!allowedEnvironments) return true

  const currentEnvironment = getCurrentEnvironment()
  return allowedEnvironments.includes(currentEnvironment)
}
