import { createApiClient } from './config/create-client'
import { authMiddleware, errorMiddleware, devLoggingMiddleware } from './config/middlewares'
import { getApiBaseUrl } from '@/config/environment'

// Create the base client with environment-based URL
export const apiClient = createApiClient(getApiBaseUrl())

// Apply middlewares
apiClient.use(authMiddleware)
apiClient.use(errorMiddleware)

// Add development logging in dev mode
if (import.meta.env.DEV) {
  apiClient.use(devLoggingMiddleware)
}

export { apiClient as default }
