import { getEnvironmentFromUrl } from '@/utils/environment.ts'
import { ENVIRONMENT } from '@/constants'
import type { FeatureKey } from '@/constants/feature-flags'
import { parseForbiddenFeatures } from '@/utils/feature-flags'

type EnvironmentConfig = {
  apiBaseUrl: string
  appName: string
  appVersion: string
}

/**
 * Get current environment based on runtime detection
 */
function getCurrentEnvironment(): string {
  if (import.meta.env.DEV) {
    return import.meta.env.MODE === 'localhost' ? ENVIRONMENT.LOCAL : ENVIRONMENT.DEV
  }

  // For production builds, detect from URL
  const environmentFromUrl = getEnvironmentFromUrl()
  return environmentFromUrl || ENVIRONMENT.PRODUCTION
}

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL
}

/**
 * Get token refresh duration from environment or fallback to default
 */
export function getTokenRefreshDuration(): number {
  const envValue = import.meta.env.VITE_API_REFRESH_DURATION
  return envValue ? Number(envValue) : 30 * 1000 // Default: 30 seconds
}

/**
 * Get dashboard API refresh interval from environment (milliseconds in .env) or fallback to 60 seconds.
 * Returns value in milliseconds for use with refetchInterval.
 * Example: VITE_DASHBOARD_API_REFRESH_DURATION=5000 → refresh every 5 seconds.
 */
export function getDashboardApiRefreshDuration(): number {
  const envValue = import.meta.env.VITE_DASHBOARD_API_REFRESH_DURATION
  const ms = envValue ? Number(envValue) : 60 * 1000
  return Number.isFinite(ms) && ms > 0 ? ms : 60 * 1000
}

/**
 * Whether the per-reconciliation approval workflow (submit → pending → approve/reject) is required.
 * When false (default), reconciliations are confirmed in a single step. Toggle via
 * VITE_RECON_REQUIRE_APPROVAL=true.
 */
export function getReconRequireApproval(): boolean {
  return import.meta.env.VITE_RECON_REQUIRE_APPROVAL === 'true'
}

/**
 * Danh sách cụm tính năng bị tắt ở môi trường hiện tại.
 *
 * Khai báo qua `VITE_FORBIDDEN_FEATURES` dạng danh sách key ngăn cách bởi dấu phẩy,
 * ví dụ `VITE_FORBIDDEN_FEATURES=elibrary,chat`. Key không hợp lệ được bỏ qua.
 * Xem `FEATURE_KEY` trong `@/constants/feature-flags` để biết các key hợp lệ.
 */
export function getForbiddenFeatures(): ReadonlySet<FeatureKey> {
  return parseForbiddenFeatures(import.meta.env.VITE_FORBIDDEN_FEATURES)
}

export function getGoongMapsApiKey(): string {
  return import.meta.env.VITE_GOONG_MAPS_API_KEY
}
export function getGoongApiKey(): string {
  return import.meta.env.VITE_GOONG_API_KEY
}

export function getGoongApiUrl(): string {
  return import.meta.env.VITE_GOONG_API_URL
}

/**
 * Get idle timeout from environment or fallback to default
 */
export function getIdleTimeout(): number {
  const envValue = Number(import.meta.env.VITE_IDLE_TIMEOUT)
  return Number.isFinite(envValue) && envValue > 0 ? envValue : 30 * 60 * 1000 // Default: 30 minutes
}

/**
 * Get full environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return {
    apiBaseUrl: getApiBaseUrl(),
    appName: import.meta.env.VITE_APP_NAME,
    appVersion: import.meta.env.VITE_APP_VERSION,
  }
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return Boolean(import.meta.env.DEV)
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return Boolean(import.meta.env.PROD)
}

/**
 * Get current environment name for display
 */
export function getCurrentEnvironmentName(): string {
  const currentEnvironment = getCurrentEnvironment()

  switch (currentEnvironment) {
    case ENVIRONMENT.LOCAL: {
      return 'Local'
    }
    case ENVIRONMENT.DEV: {
      return 'Development'
    }
    case ENVIRONMENT.STAGING: {
      return 'Staging'
    }
    case ENVIRONMENT.PRODUCTION: {
      return 'Production'
    }
    default: {
      return 'Unknown'
    }
  }
}

export function getChatApiBaseUrl(): string {
  return import.meta.env.VITE_CHAT_API_URL || 'https://chat.mvl.glinteco.com'
}

export function getChatWsUrl(): string {
  return import.meta.env.VITE_CHAT_WS_URL || 'wss://chat.mvl.glinteco.com/ws/chat/'
}
