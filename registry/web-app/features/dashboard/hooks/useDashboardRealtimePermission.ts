import { hasPermission } from '@/utils'
import { useAuth } from '@/hooks/useAuth.ts'
import { useMemo } from 'react'

export function useDashboardRealtimePermission(permissionCode: string) {
  const { user } = useAuth()

  const canViewChart = useMemo(
    () => hasPermission(user?.permissions || [], permissionCode),
    [user?.permissions, permissionCode]
  )

  return {
    canViewChart,
  }
}
