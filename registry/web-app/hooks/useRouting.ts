import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useAuth } from '../hooks/useAuth'
import type { TUserRole } from '@/types/auth'

/**
 * Custom hook for navigation with authentication checks
 */
export function useNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()

  const navigateTo = useCallback(
    (path: string, options?: { replace?: boolean; state?: any }) => {
      navigate(path, options)
    },
    [navigate]
  )

  const navigateToProtected = useCallback(
    (path: string, _requiredRole?: TUserRole) => {
      if (!isAuthenticated) {
        navigate(APP_PATH.LOGIN, { state: { from: { pathname: path } } })
        return
      }

      // Skip role check for now - assume admin access

      navigate(path)
    },
    [navigate, isAuthenticated, user]
  )

  const navigateBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const navigateToHome = useCallback(() => {
    navigate(APP_PATH.HOME)
  }, [navigate])

  const navigateToDashboard = useCallback(() => {
    if (isAuthenticated) {
      navigate(APP_PATH.DASHBOARD)
    } else {
      navigate(APP_PATH.LOGIN)
    }
  }, [navigate, isAuthenticated])

  const navigateToLogin = useCallback(() => {
    navigate(APP_PATH.LOGIN, { state: { from: location } })
  }, [navigate, location])

  const logout = useCallback(async () => {
    // This will be handled by the auth operations hook
    navigate(APP_PATH.HOME)
  }, [navigate])

  return {
    navigateTo,
    navigateToProtected,
    navigateBack,
    navigateToHome,
    navigateToDashboard,
    navigateToLogin,
    logout,
    currentPath: location.pathname,
    previousPath: location.state?.from?.pathname,
  }
}
