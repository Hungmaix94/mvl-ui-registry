import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { parsePermissionCode, useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes/AppRoute.constant'

type PermissionGuardProps = {
  children: ReactNode
  permissions?: string | string[]
  fallback?: ReactNode
  redirectTo?: string
}

export function PermissionGuard({
  children,
  permissions,
  fallback,
  redirectTo = APP_PATH.UNAUTHORIZED,
}: PermissionGuardProps) {
  const ability = useAbility()
  const location = useLocation()

  if (!permissions) {
    return <>{children}</>
  }

  const permissionList = Array.isArray(permissions) ? permissions : [permissions]

  const hasPermission = permissionList.every((permission) => {
    const parsed = parsePermissionCode(permission)
    return parsed ? ability.can(parsed.action, parsed.subject) : false
  })

  if (hasPermission) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return <Navigate to={redirectTo} state={{ from: location }} replace />
}

export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permissions: string | string[],
  fallback?: ReactNode,
  redirectTo?: string
) {
  return (props: P) => (
    <PermissionGuard permissions={permissions} fallback={fallback} redirectTo={redirectTo}>
      <Component {...props} />
    </PermissionGuard>
  )
}
