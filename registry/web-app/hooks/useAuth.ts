import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

import { AUTH_MESSAGES, QUERY_KEYS } from '@/constants'
import { APP_PATH } from '@/routes'
import { getAuthService, LoginRequest } from '@/services/auth-service'
import { useAuth as useAuthState, useAuthActions } from '@/store/auth-store'
import type { TUserRole } from '@/types/auth'
import { getStoredToken, hasAuthData, isAuthFlowInProgress, isTokenExpired } from '@/utils/auth'
import { useMe, useMePermissions } from '@/services'
import toastService from '@/services/toast-service'
import { getFCMToken } from '../lib/firebase'
import { LoginRequestPlatform } from '@/api/schema'
import { handleApiError, extractErrorMessage } from '@/utils/error-utils'

/**
 * Hook to initialize authentication state
 * Should be called once at the app root level
 */
export function useAuthInit() {
  const { checkAuth, setUser } = useAuthActions()
  const { isAuthenticated } = useAuthState()
  const token = getStoredToken()
  const { data: me } = useMe({ options: { enabled: isAuthenticated && !!token } })
  const { data: mePermissions } = useMePermissions({
    options: { enabled: isAuthenticated && !!token },
  })
  const permissions = mePermissions?.permissions
  const isSuperuser = mePermissions?.is_superuser
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (me && permissions) {
      setUser({ ...me, permissions, is_superuser: isSuperuser })
    }
  }, [me, permissions, isSuperuser, setUser])
}

/**
 * Main authentication hook that provides auth state and actions
 */
export function useAuth() {
  const authState = useAuthState()
  const authActions = useAuthActions()

  return {
    ...authState,
    ...authActions,
  } as const
}

/**
 * Hook for authentication operations (login, register, logout)
 */
export function useAuthOperations() {
  const { setLoading, setError, logout, checkAuth } = useAuthActions()
  const { isLoading, error } = useAuthState()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const handleLogin = async (credentials: LoginRequest) => {
    try {
      setLoading(true)
      setError(null)

      const device_id = await getFCMToken()
      const response = await getAuthService().login({
        ...credentials,
        platform: LoginRequestPlatform.web,
        device_id: device_id || undefined,
      })

      if (response?.data) {
        // Login successful - tokens are already stored by login method
        // Update auth state to trigger useMe and useMePermissions queries
        // When isAuthenticated becomes true, queries in useAuthInit will automatically enable and fetch
        checkAuth()

        // Invalidate queries to mark them as stale
        // When queries become enabled (after isAuthenticated update), they will automatically refetch
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER.ME() })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER.PERMISSIONS({}) })

        // User data will be loaded by useAuthInit hook (useMe and useMePermissions)
        // Navigate to the requested page or fallback to dashboard
        const from = location.state?.from?.pathname || APP_PATH.DASHBOARD || '/'
        const search = location.state?.from?.search || ''
        const hash = location.state?.from?.hash || ''
        navigate(from + search + hash)
        setLoading(false)
      } else {
        setError(AUTH_MESSAGES.LOGIN_FAILED)
        setLoading(false)
      }
    } catch (error: any) {
      // Check if error is related to username/password to avoid exposing sensitive information
      const err = error as unknown as {
        type?: string
        errors?: Array<{ attr: string; detail: string }>
        error?: {
          type?: string
          errors?: Array<{ attr: string; detail: string }>
        }
        response?: { data?: { detail?: string } }
      }
      let credentialErrors: Array<{ attr: string; detail: string }> = []

      // Check error structure: { type: "validation_error", errors: [{ attr, detail }] }
      if (err?.type === 'validation_error' && Array.isArray(err.errors)) {
        credentialErrors = err.errors.filter(
          (e: any) => e.attr === 'username' || e.attr === 'password'
        )
      } else if (err?.error?.type === 'validation_error' && Array.isArray(err.error.errors)) {
        credentialErrors = err.error.errors.filter(
          (e: any) => e.attr === 'username' || e.attr === 'password'
        )
      }

      // Chỉ che thông báo "sai thông tin đăng nhập" chung chung để tránh lộ việc
      // tài khoản có tồn tại hay không. Các thông báo trạng thái tài khoản
      // (khoá, vô hiệu hoá, tạm khoá, hết hạn...) hiển thị nguyên văn từ API.
      const ACCOUNT_STATE_KEYWORDS = [
        'khóa',
        'khoá',
        'vô hiệu',
        'disabled',
        'inactive',
        'deactivat',
        'blocked',
        'locked',
        'tạm thời',
        'thử lại sau',
        'hết hạn',
        'expired',
      ]

      let loginErrorMessage: string
      if (credentialErrors.length > 0) {
        const accountStateError = credentialErrors.find((e) =>
          ACCOUNT_STATE_KEYWORDS.some((keyword) =>
            e.detail?.toLowerCase().includes(keyword.toLowerCase())
          )
        )
        loginErrorMessage =
          accountStateError?.detail ?? 'Tên đăng nhập hoặc mật khẩu không chính xác'
        toastService.error(loginErrorMessage)
      } else {
        // For other errors (server errors, network...), show detailed message
        handleApiError(error)
        loginErrorMessage = extractErrorMessage(error, AUTH_MESSAGES.LOGIN_FAILED)
      }

      setError(loginErrorMessage)
      setLoading(false)
    }
  }

  // Register function removed - no longer available in auth service

  const handleLogout = async () => {
    setLoading(true)

    try {
      await getAuthService().logout()
    } catch (error) {
      console.error(AUTH_MESSAGES.LOGOUT_ERROR, error)
    } finally {
      // Still logout locally even if server call fails
      logout()
      navigate(APP_PATH.HOME)
      setLoading(false)
    }
  }

  return {
    login: handleLogin,
    logout: handleLogout,
    isLoading,
    error,
  }
}

/**
 * Hook for checking authentication status with server-side token verification
 */
export function useAuthGuard() {
  const { isAuthenticated, isLoading, user, checkAuth, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)

  // Reset verification when auth data changes
  useEffect(() => {
    if (!hasAuthData()) {
      setVerificationComplete(false)
    }
  }, [isAuthenticated])

  // Verify token with server when needed (for guestOnly routes)
  useEffect(() => {
    const verifyTokenWithServer = async () => {
      // NOTE: OTP flow is disabled - login returns tokens directly
      // This check is kept for backward compatibility but should not trigger in new flow
      if (isAuthFlowInProgress()) {
        setVerificationComplete(true)
        return
      }

      // Only verify if we have auth data and haven't verified yet
      if (!hasAuthData() || verificationComplete || isVerifying) {
        if (!hasAuthData()) {
          setVerificationComplete(true)
        }
        return
      }

      const token = getStoredToken()
      if (!token) {
        setVerificationComplete(true)
        return
      }

      setIsVerifying(true)

      try {
        const isValid = await getAuthService().verifyToken({ token })
        if (!isValid) {
          // Token is invalid on server, clear auth data only if client token is also expired
          if (isTokenExpired()) {
            logout()
          } else {
            checkAuth()
          }
        } else {
          // Token is valid, ensure auth state is synced
          checkAuth()
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER.PERMISSIONS({}) })
        }
      } catch (error) {
        // Network error or other error - for guest routes, allow access
        // The token might be valid but network issue occurred
        // We'll rely on client-side check in this case
        console.warn('Token verification failed, using client-side check:', error)
        checkAuth()
      } finally {
        setIsVerifying(false)
        setVerificationComplete(true)
      }
    }

    // Only verify if we have local auth data but need to confirm with server
    if (hasAuthData() && !verificationComplete) {
      verifyTokenWithServer()
    } else if (!hasAuthData()) {
      // No auth data, mark as complete
      setVerificationComplete(true)
    }
  }, [checkAuth, logout, verificationComplete, isVerifying, queryClient])

  const requireAuth = () => {
    const combinedLoading = isLoading || isVerifying
    if (!combinedLoading && !isAuthenticated) {
      navigate(APP_PATH.LOGIN)
      return false
    }
    return isAuthenticated
  }

  const requireGuest = () => {
    const combinedLoading = isLoading || isVerifying
    if (!combinedLoading && isAuthenticated) {
      navigate(APP_PATH.DASHBOARD)
      return false
    }
    return !isAuthenticated
  }

  const requireRole = (_requiredRole: TUserRole) => {
    const combinedLoading = isLoading || isVerifying
    if (!combinedLoading && !isAuthenticated) {
      navigate(APP_PATH.UNAUTHORIZED)
      return false
    }
    return true // Assume admin role for now
  }

  return {
    requireAuth,
    requireGuest,
    requireRole,
    isAuthenticated,
    isLoading: isLoading || isVerifying,
    user,
  }
}
