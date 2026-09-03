import type { Middleware } from 'openapi-fetch'
import { ApiPaths } from '@/api/schema'
import { APP_PATH } from '@/routes'
import { tokenManager } from '@/services/token-manager'
import { clearAuthData } from '@/utils/auth'
// Paths that must NOT send Authorization header (e.g. login, forgot-password)
const NO_AUTH_PATHS = new Set<string>([
  ApiPaths.auth_login_create,
  ApiPaths.auth_forgot_password_create,
])

function getRequestPath(request: Request): string {
  try {
    return new URL(request.url).pathname
  } catch {
    return ''
  }
}

function shouldSkipAuth(request: Request): boolean {
  return NO_AUTH_PATHS.has(getRequestPath(request))
}

// Auth middleware for handling authentication with WeakMap request cloning
const requestClones = new WeakMap<Request, Request>()

export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    // Add global uid header
    try {
      const userDataStr = localStorage.getItem('user_data')
      if (userDataStr) {
        const user = JSON.parse(userDataStr)
        if (user && user.id) {
          request.headers.set('uid', String(user.id))
        }
      }
    } catch {
      // Ignore parse error
    }

    if (shouldSkipAuth(request)) {
      requestClones.set(request, request.clone())
      return request
    }
    const token = await tokenManager.getValidToken()
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    // Clone BEFORE any potential body consumption and store in WeakMap
    requestClones.set(request, request.clone())
    return request
  },
  async onResponse({ response, request }) {
    // Always cleanup clone mapping, regardless of status
    const clonedRequest = requestClones.get(request)
    requestClones.delete(request)

    if (shouldSkipAuth(request)) {
      return response
    }

    if (response.status === 401) {
      if (!request.headers.get('x-retried') && clonedRequest) {
        try {
          const newToken = await tokenManager.refreshToken()
          if (newToken) {
            // Use pre-cloned request to avoid "Body has already been used"
            clonedRequest.headers.set('Authorization', `Bearer ${newToken}`)
            clonedRequest.headers.set('x-retried', '1')
            return fetch(clonedRequest)
          }
        } catch (error: any) {
          if (error?.message?.includes('Body has already been used')) {
            console.error('[AuthMiddleware] Cannot retry - body consumed')
            // Return original response without logging out
            return response
          }
          // Do not rethrow AUTH_ERROR so we always run clearAuthData + redirect below
          if (error?.message?.startsWith('AUTH_ERROR:')) {
            // Fall through to "refresh failed or already retried" block
          } else {
            throw error
          }
        }
      }
      // refresh failed or already retried
      clearAuthData()

      // Logout user and redirect to login
      if (window.location.pathname !== APP_PATH.LOGIN) {
        window.location.href = APP_PATH.LOGIN
      }
    }
    return response
  },
}

// Error handling middleware
export const errorMiddleware: Middleware = {
  async onResponse({ response }) {
    if (!response.ok) {
      try {
        const error = await response.json()
        console.error('API Error:', error)
        // Return a new Response with the error data
        return new Response(JSON.stringify(error), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        })
      } catch {
        console.error('API Error: Failed to parse error response')
        // Return original response if parsing fails
        return response
      }
    }
    return response
  },
}

// Development logging middleware
export const devLoggingMiddleware: Middleware = {
  async onRequest({ request }) {
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${request.method} ${request.url}`, {
        headers: Object.fromEntries(request.headers.entries()),
      })
    }
    return request
  },
  async onResponse({ response, request }) {
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${request.url}`, {
        status: response.status,
        statusText: response.statusText,
      })
    }
    return response
  },
}
