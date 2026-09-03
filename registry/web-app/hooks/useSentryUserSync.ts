import { useEffect } from 'react'
import * as Sentry from '@sentry/react'

import { useAuth } from '@/store/auth-store'

/**
 * Syncs auth user context to Sentry for error tracking.
 * Enables identifying which account encountered an error.
 */
export function useSentryUserSync() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      Sentry.setUser(null)
      return
    }

    Sentry.setUser({
      id: user.id.toString(),
      email: user.email,
      username: user.username,
      ...(user.employee?.code && { employee_code: user.employee.code }),
    })
  }, [user])
}
