import { PropsWithChildren, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store'
import { useIdleTimer } from 'react-idle-timer'
import { tokenManager } from '@/services/token-manager'
import { STORAGE_KEYS } from '@/constants'
import { getIdleTimeout } from '@/config/environment'
import toastService from '@/services/toast-service'

const AuthProvider = ({ children }: Readonly<PropsWithChildren>) => {
  const { logout, isAuthenticated, checkAuth } = useAuthStore()

  // Cross-tab auth state sync with proper cleanup
  const storageSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key) return

      // Listen for auth-related storage changes
      if (
        [
          STORAGE_KEYS.AUTH_TOKEN,
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.TOKEN_EXPIRY,
        ].includes(e.key as any)
      ) {
        // Debounce to prevent multiple rapid calls
        if (storageSyncTimeoutRef.current) {
          clearTimeout(storageSyncTimeoutRef.current)
        }
        storageSyncTimeoutRef.current = setTimeout(() => {
          const hasToken = !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
          if (!hasToken) {
            // Token was removed (logout from another tab)
            logout({ fromStorageSync: true })
            toastService.info('Bạn đã đăng xuất ở tab khác')
          } else {
            // Token was added/updated (login/refresh from another tab)
            checkAuth()
          }
          storageSyncTimeoutRef.current = null
        }, 100) // 100ms debounce
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      if (storageSyncTimeoutRef.current) {
        clearTimeout(storageSyncTimeoutRef.current)
      }
    }
  }, [logout, checkAuth])

  // Idle timer integration with validation
  const IDLE_TIMEOUT = getIdleTimeout()

  useIdleTimer({
    onIdle: () => {
      // Set idle state in token manager to pause background refresh
      tokenManager.setIdle(true)
    },
    onActive: () => {
      // Clear idle state and check if refresh is needed
      tokenManager.setIdle(false)
      tokenManager.checkAndRefreshIfNeeded()
    },
    timeout: IDLE_TIMEOUT,
    disabled: !isAuthenticated,
    crossTab: true,
    throttle: 500,
  })

  return <>{children}</>
}

export default AuthProvider
