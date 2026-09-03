import { create } from 'zustand'
import { getNotificationService, type Notification } from '@/services/notification-service'
import { extractErrorMessage } from '@/utils/error-utils'

type NotificationStore = {
  notifications: Notification[]
  totalCount: number // Total count of notifications from API
  isLoading: boolean
  error: string | null
  hasNextPage: boolean // Track if there are more notifications
  nextUrl: string | null // Store the next URL from API response

  // Actions
  fetchNotifications: () => Promise<void>
  loadMoreNotifications: () => Promise<boolean> // Returns hasNextPage, uses nextUrl internally
  markAsReadLocal: (id: number) => void // Local state update only, no API call
  markAllAsReadLocal: () => void // Local state update only, no API call
  addNotification: (notification: Notification) => void
  clearNotifications: () => void
}

/**
 * Extract page number from next URL
 * Example: "https://api.mvl.glinteco.com/api/notifications/?page=2" -> 2
 */
function extractPageFromUrl(url: string | null | undefined): number | undefined {
  if (!url) return undefined
  try {
    const urlObj = new URL(url)
    const pageParam = urlObj.searchParams.get('page')
    if (pageParam) {
      const page = parseInt(pageParam, 10)
      return isNaN(page) ? undefined : page
    }
  } catch {
    // Invalid URL, return undefined
  }
  return undefined
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  totalCount: 0, // Total count from API
  isLoading: false,
  error: null,
  hasNextPage: false, // Initialize as false, will be set based on API response
  nextUrl: null, // Store next URL from API response

  fetchNotifications: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await getNotificationService().getNotifications()

      if (response.results) {
        const notifications = response.results
        const hasNextPage = !!response.next
        const totalCount = response.count ?? 0

        set({
          notifications,
          totalCount,
          hasNextPage,
          nextUrl: response.next || null,
          isLoading: false,
        })
      } else {
        set({
          error: 'Không thể tải thông báo',
          hasNextPage: false,
          nextUrl: null,
          totalCount: 0,
          isLoading: false,
        })
      }
    } catch (error) {
      set({
        error: extractErrorMessage(error, 'Không thể tải thông báo'),
        hasNextPage: false,
        nextUrl: null,
        totalCount: 0,
        isLoading: false,
      })
    }
  },

  loadMoreNotifications: async () => {
    try {
      const { nextUrl } = get()

      // If no next URL, there's nothing to load
      if (!nextUrl) {
        return false
      }

      // Extract page number from next URL
      const page = extractPageFromUrl(nextUrl)
      if (!page) {
        console.error('Failed to extract page number from next URL:', nextUrl)
        return false
      }

      // Call API with page number from next URL
      const response = await getNotificationService().getNotifications({ page })

      if (response.results) {
        const { notifications: currentNotifications } = get()
        const newNotifications = response.results

        // Append new notifications to existing ones
        const updatedNotifications = [...currentNotifications, ...newNotifications]

        const hasMore = !!response.next

        set({
          notifications: updatedNotifications,
          hasNextPage: hasMore,
          nextUrl: response.next || null, // Update nextUrl for next load
        })

        return hasMore
      }

      return false
    } catch (error) {
      console.error('Failed to load more notifications:', error)
      return false
    }
  },

  markAsReadLocal: (id: number) => {
    const { notifications } = get()
    const updatedNotifications = notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification
    )

    set({
      notifications: updatedNotifications,
    })
  },

  markAllAsReadLocal: () => {
    const { notifications } = get()
    const updatedNotifications = notifications.map((notification) => ({
      ...notification,
      read: true,
    }))

    set({
      notifications: updatedNotifications,
    })
  },

  addNotification: (notification: Notification) => {
    const { notifications } = get()
    const updatedNotifications = [notification, ...notifications]

    set({
      notifications: updatedNotifications,
    })
  },

  clearNotifications: () => {
    set({
      notifications: [],
      totalCount: 0,
      error: null,
      hasNextPage: false,
      nextUrl: null,
    })
  },
}))

// Selectors
export const useNotifications = () => useNotificationStore((state) => state.notifications)
export const useNotificationLoading = () => useNotificationStore((state) => state.isLoading)
export const useNotificationError = () => useNotificationStore((state) => state.error)

// Action selectors
export const useNotificationActions = () =>
  useNotificationStore((state) => ({
    fetchNotifications: state.fetchNotifications,
    loadMoreNotifications: state.loadMoreNotifications,
    markAsReadLocal: state.markAsReadLocal,
    markAllAsReadLocal: state.markAllAsReadLocal,
    addNotification: state.addNotification,
    clearNotifications: state.clearNotifications,
  }))
