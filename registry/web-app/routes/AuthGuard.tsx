import { Navigate, useLocation } from 'react-router-dom'

import { PageLoading } from '@/components/Loading'
import { APP_PATH } from '@/routes'
import { useAuthGuard } from '@/hooks/useAuth'
import type { TUserRole } from '@/types/auth'
import type { ReactNode } from 'react'
import { cn, isAuthFlowInProgress } from '@/utils'

export type AuthGuardProps = {
  children: ReactNode
  /** Whether authentication is required */
  requireAuth?: boolean
  /** Guest only route (redirect if authenticated) */
  guestOnly?: boolean
  /** Specific role required (single role) */
  requiredRole?: TUserRole
  /** Multiple roles allowed (any of these roles) */
  allowedRoles?: TUserRole[]
  /** Component to show when access is denied */
  fallback?: ReactNode
  /** Where to redirect when not authenticated */
  redirectTo?: string
}

/**
 * Unified Authentication and Authorization Route Component
 * Combines ProtectedRoute and RoleRoute functionality
 *
 * @example
 * // Basic protected route
 * <AuthRoute requireAuth>
 *   <DashboardPage />
 * </AuthRoute>
 *
 * @example
 * // Role-based access (single role)
 * <AuthRoute requireAuth requiredRole={USER_ROLES.ADMIN}>
 *   <AdminPage />
 * </AuthRoute>
 *
 * @example
 * // Multiple roles allowed
 * <AuthRoute requireAuth allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.MODERATOR]}>
 *   <ModeratorPage />
 * </AuthRoute>
 *
 * @example
 * // Custom fallback
 * <AuthRoute
 *   requireAuth
 *   allowedRoles={[USER_ROLES.ADMIN]}
 *   fallback={<CustomAccessDenied />}
 * >
 *   <AdminPage />
 * </AuthRoute>
 */
const AuthGuard = ({
  children,
  guestOnly = false,
  requireAuth = !guestOnly,
  redirectTo,
}: AuthGuardProps) => {
  const { isAuthenticated, isLoading } = useAuthGuard()
  const location = useLocation()

  // Show loading state
  if (isLoading) {
    return (
      <PageLoading
        message="Checking authentication"
        className={cn(location.pathname.includes(APP_PATH.LOGIN) ? 'min-h-[50vh]' : '')}
      />
    )
  }

  // Guest only route - redirect if authenticated
  // But skip redirect if auth flow is in progress (login -> OTP -> verify)
  if (guestOnly && isAuthenticated && !isAuthFlowInProgress()) {
    const from = location.state?.from?.pathname || APP_PATH.DASHBOARD
    return <Navigate to={from} replace />
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo || APP_PATH.LOGIN} state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default AuthGuard
