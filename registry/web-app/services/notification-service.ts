import { BaseApiService } from '@/api/base-service'
import { ApiPaths, type components, type paths } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery, useApiMutation } from '@/hooks/useApiQuery'
import { useQueryClient } from '@tanstack/react-query'

// Type definitions from generated schema
export type Notification = components['schemas']['Notification']
export type PaginatedNotificationList = components['schemas']['PaginatedNotificationList']
export type BulkMarkAsReadRequest = components['schemas']['BulkMarkAsReadRequest']
export type NotificationResponse = components['schemas']['NotificationResponse']

// Request parameter types
export type GetNotificationsParams = paths['/api/notifications/']['get']['parameters']['query']

/**
 * Notification service extending the base API service
 * Provides notification-related API operations
 */
export class NotificationService extends BaseApiService {
  /**
   * Get all notifications
   */
  async getNotifications(params?: GetNotificationsParams) {
    return await this.getPaginated(ApiPaths.notifications_list, params)
  }

  /**
   * Get notification by ID
   */
  async getNotification(id: number) {
    return await this.get(ApiPaths.notifications_retrieve, {
      path: { id },
    })
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: number) {
    return await this.patch(
      ApiPaths.notifications_mark_as_read_partial_update,
      {},
      { path: { id } }
    )
  }

  /**
   * Mark notification as unread
   */
  async markAsUnread(id: number) {
    return await this.patch(
      ApiPaths.notifications_mark_as_unread_partial_update,
      {},
      { path: { id } }
    )
  }

  /**
   * Bulk mark notifications as read
   */
  async bulkMarkAsRead(notificationIds: number[]) {
    return await this.post(ApiPaths.notifications_bulk_mark_as_read_create, {
      notification_ids: notificationIds,
    })
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    return await this.post(ApiPaths.notifications_mark_all_as_read_create, {})
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount() {
    return await this.get(ApiPaths.notifications_unread_count_retrieve)
  }
}

// Create service instance via factory (lazy construction)
let _notificationService: NotificationService | null = null

export function getNotificationService(): NotificationService {
  if (!_notificationService) {
    _notificationService = new NotificationService()
  }
  return _notificationService
}

// For backward compatibility, export a getter
export const notificationService = {
  get instance() {
    return getNotificationService()
  },
}

// React Query hooks for notification operations
export function useNotifications(params?: GetNotificationsParams) {
  return useApiQuery(
    QUERY_KEYS.NOTIFICATIONS.LIST(params || {}),
    () => getNotificationService().getNotifications(params),
    {
      staleTime: 1000 * 60 * 1, // 1 minute
    }
  )
}

export function useNotification(id: number) {
  return useApiQuery(
    QUERY_KEYS.NOTIFICATIONS.DETAIL(id),
    () => getNotificationService().getNotification(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 1, // 1 minute
    }
  )
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()
  return useApiMutation((id: number) => getNotificationService().markAsRead(id), {
    onSuccess: () => {
      // Invalidate unread count to get latest count from server
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.NOTIFICATIONS.UNREAD_COUNT(),
      })
    },
  })
}

export function useMarkNotificationAsUnread() {
  const queryClient = useQueryClient()
  return useApiMutation((id: number) => getNotificationService().markAsUnread(id), {
    onSuccess: () => {
      // Invalidate unread count to get latest count from server
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.NOTIFICATIONS.UNREAD_COUNT(),
      })
    },
  })
}

export function useBulkMarkNotificationsAsRead() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (notificationIds: number[]) => getNotificationService().bulkMarkAsRead(notificationIds),
    {
      onSuccess: () => {
        // Invalidate unread count to get latest count from server
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.NOTIFICATIONS.UNREAD_COUNT(),
        })
      },
    }
  )
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()
  return useApiMutation(() => getNotificationService().markAllAsRead(), {
    onSuccess: () => {
      // Invalidate unread count to get latest count from server
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.NOTIFICATIONS.UNREAD_COUNT(),
      })
    },
  })
}

export function useUnreadNotificationCount() {
  return useApiQuery(
    QUERY_KEYS.NOTIFICATIONS.UNREAD_COUNT(),
    () => getNotificationService().getUnreadCount(),
    {
      staleTime: 1000 * 60 * 1, // 1 minute
      refetchInterval: 1000 * 60 * 1, // Refetch every minute
    }
  )
}
