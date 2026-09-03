import { useEffect } from 'react'
import { IconBell } from '@/assets/icons'
import { useNotificationStore } from '@/store'
import { useUnreadNotificationCount } from '@/services/notification-service'
import { cn } from '@/utils'

const NotificationBell = () => {
  const { isLoading, fetchNotifications } = useNotificationStore()
  const { data: unreadCountData, isLoading: isUnreadCountLoading } = useUnreadNotificationCount()
  const unreadCount = unreadCountData?.count ?? 0

  // Fetch notifications when component mounts
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return (
    <>
      <div
        className="bg-action-primary-red-default relative box-border flex size-10 shrink-0 content-stretch items-center justify-center gap-2 rounded p-2"
        data-name="Buttons"
      >
        <div className="relative size-5 shrink-0" data-name="Icon/Bell">
          <IconBell size={20} color="white" />
        </div>

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <div
            className={cn(
              'absolute -top-1 -right-1',
              'bg-action-primary-red-default text-white',
              'h-[18px] min-w-[18px] rounded-full',
              'flex items-center justify-center',
              'text-xs font-medium',
              'border-2 border-white'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}

        {/* Loading indicator */}
        {(isLoading || isUnreadCountLoading) && (
          <div
            className={cn(
              'absolute -top-1 -right-1',
              'bg-action-primary-red-default text-white',
              'h-[18px] w-[18px] rounded-full',
              'flex items-center justify-center',
              'border-2 border-white'
            )}
          >
            <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
          </div>
        )}
      </div>
    </>
  )
}

export default NotificationBell
