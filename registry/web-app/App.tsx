import { RouterProvider } from 'react-router-dom'
import { useEffect, useMemo } from 'react'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import GlobalDialog from '@/components/global-dialog/GlobalDialog.tsx'
import ToastProvider from '@/components/ToastProvider'
import { useAuthInit } from '@/hooks/useAuth'
import { useClarityUserSync } from '@/hooks/useClarityUserSync'
import { useSentryUserSync } from '@/hooks/useSentryUserSync'
import { appRouter } from '@/routes'
import { tokenManager } from '@/services/token-manager'
import { AbilityContext, defineAbilitiesFor } from '@/lib/ability'
import { useAuth } from '@/store/auth-store'
import { useFirebaseMessaging } from '@/hooks/useFirebaseMessaging'

const App = () => {
  useAuthInit()
  useClarityUserSync()
  useSentryUserSync()
  useFirebaseMessaging()
  const { user } = useAuth()
  const ability = useMemo(
    () => defineAbilitiesFor(user?.permissions, user?.is_superuser),
    [user?.permissions, user?.is_superuser, user?.role?.is_system_role]
  )

  useEffect(() => {
    tokenManager.startAutoRefresh()
  }, [])

  return (
    <ErrorBoundary>
      <AbilityContext.Provider value={ability}>
        <RouterProvider router={appRouter} />
        <ToastProvider />
        <GlobalDialog />
      </AbilityContext.Provider>
    </ErrorBoundary>
  )
}

export default App
