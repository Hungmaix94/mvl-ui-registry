import { useEffect } from 'react'
import { clarity } from 'react-microsoft-clarity'

import { useAuth } from '@/store/auth-store'

/**
 * Syncs auth user context to Clarity for session analytics.
 * Enables identifying which account in session recordings.
 */
export function useClarityUserSync() {
  const { user } = useAuth()

  useEffect(() => {
    if (!clarity.hasStarted()) return

    if (user) {
      const friendlyName = user.employee?.code
        ? `${user.username ?? ''} (${user.employee.code})`
        : (user.username ?? '')
      window.clarity?.('identify', user.id.toString(), '', '', friendlyName)
      clarity.setTag('username', user.username ?? '')
      if (user.employee?.code) {
        clarity.setTag('employee_code', user.employee.code)
      }
    } else {
      window.clarity?.('identify', 'anonymous', '', '', '')
    }
  }, [user])
}
