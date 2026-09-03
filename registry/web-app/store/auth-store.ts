import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { clearAuthData, getStoredUser, hasAuthData } from '@/utils'
import { tokenManager } from '@/services/token-manager'
import { Me, Permissions } from '@/services/user-service'

export type UserWithPermissions = Me & { permissions?: Permissions; is_superuser?: boolean }

type AuthState = {
  // State
  user: UserWithPermissions | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  tokenStatus: {
    isValid: boolean
    isExpired: boolean
    isExpiringSoon: boolean
    timeUntilExpiry: number
  }
  tempLoginCredentials: { username: string; password: string } | null

  // Actions
  setUser: (user: UserWithPermissions | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  login: (user: UserWithPermissions) => void
  logout: (options?: { fromStorageSync?: boolean }) => void
  clearError: () => void
  checkAuth: () => void
  setTempLoginCredentials: (credentials: { username: string; password: string } | null) => void
  clearTempLoginCredentials: () => void
}

const TOKEN_STATUS = {
  isValid: false,
  isExpired: true,
  isExpiringSoon: false,
  timeUntilExpiry: 0,
} as const

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        tokenStatus: { ...TOKEN_STATUS },
        tempLoginCredentials: null,

        // Actions
        setUser: (user) => {
          set(
            {
              user,
              isAuthenticated: !!user,
              error: null,
            },
            false,
            'setUser'
          )
        },

        setLoading: (isLoading) => set({ isLoading }, false, 'setLoading'),

        setError: (error) => set({ error }, false, 'setError'),

        login: (user) => {
          set(
            {
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            },
            false,
            'login'
          )
        },

        logout: (options?: { fromStorageSync?: boolean }) => {
          if (!options?.fromStorageSync) {
            clearAuthData() // Only clear if not from sync
          }

          // Clear chat store state on logout to prevent state leakage
          try {
            import('@/features/chat/store/chat-store')
              .then(({ useChatStore }) => {
                useChatStore.setState({
                  pinnedMessages: {},
                  channels: {},
                  members: {},
                  messages: {},
                  unreadCounts: {},
                  activeChannelId: null,
                  currentUserId: null,
                })
              })
              .catch((err) => {
                console.error('Failed to reset chat store on logout:', err)
              })
          } catch (e) {
            console.error('Failed to import chat store on logout:', e)
          }

          set(
            {
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              tokenStatus: { ...TOKEN_STATUS },
            },
            false,
            'logout'
          )
        },

        clearError: () => set({ error: null }, false, 'clearError'),

        setTempLoginCredentials: (credentials) =>
          set({ tempLoginCredentials: credentials }, false, 'setTempLoginCredentials'),

        clearTempLoginCredentials: () =>
          set({ tempLoginCredentials: null }, false, 'clearTempLoginCredentials'),

        checkAuth: () => {
          if (hasAuthData()) {
            try {
              const user = getStoredUser()
              const tokenStatus = tokenManager.getTokenStatus()

              if (tokenStatus.isValid) {
                set(
                  (state) => ({
                    // Preserve existing permissions when updating user from localStorage
                    user: user
                      ? state.user
                        ? {
                            ...user,
                            permissions: state.user.permissions,
                            is_superuser: state.user.is_superuser,
                          }
                        : user
                      : state.user,
                    isAuthenticated: true,
                    tokenStatus,
                  }),
                  false,
                  'checkAuth'
                )
              } else {
                clearAuthData()
                set(
                  {
                    user: null,
                    isAuthenticated: false,
                    tokenStatus: { ...TOKEN_STATUS },
                  },
                  false,
                  'checkAuth'
                )
              }
            } catch {
              clearAuthData()
              set(
                {
                  user: null,
                  isAuthenticated: false,
                  tokenStatus: { ...TOKEN_STATUS },
                },
                false,
                'checkAuth'
              )
            }
          }
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
)

// Selectors for better performance
export const useAuth = () =>
  useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    tokenStatus: state.tokenStatus,
    tempLoginCredentials: state.tempLoginCredentials,
  }))

export const useAuthActions = () =>
  useAuthStore((state) => ({
    setUser: state.setUser,
    setLoading: state.setLoading,
    setError: state.setError,
    login: state.login,
    logout: state.logout,
    clearError: state.clearError,
    checkAuth: state.checkAuth,
    setTempLoginCredentials: state.setTempLoginCredentials,
    clearTempLoginCredentials: state.clearTempLoginCredentials,
  }))

// User info selectors
export const useUserInfo = () => useAuthStore((state) => state.user)
export const useUserName = () => useAuthStore((state) => state.user?.username)
export const useUserEmail = () => useAuthStore((state) => state.user?.email)
export const useUserFullName = () => useAuthStore((state) => state.user?.full_name)
