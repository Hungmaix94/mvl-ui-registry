import type { Notification } from '@/services/notification-service'
import { useCallback, useState } from 'react'
import { Box, Flex, Text } from '@radix-ui/themes'
import { cn } from '@/utils'
import { Collapsible } from 'radix-ui'
import Button from '@/components/ui/button/Button.tsx'
import { useNavigate } from 'react-router-dom'
import { useAbility } from '@/lib/ability'
import {
  canNavigateNotification,
  getNotificationNavigationTarget,
} from '@/components/navigation/notification/notification-navigation-utils.ts'
import NotificationMessage from '@/components/navigation/notification/NotificationMessage.tsx'

const NotificationContent = ({
  notification,
  onMarkAsRead,
}: {
  notification: Notification
  onMarkAsRead: (id: number) => void
}) => {
  const [open, setOpen] = useState<boolean>(false)
  const navigate = useNavigate()
  const ability = useAbility()

  const navigationTarget = getNotificationNavigationTarget(notification, ability)
  const canNavigate = canNavigateNotification(notification, ability)
  const redirectPath = navigationTarget?.path ?? null

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen)
      // Chỉ gọi API khi mở notification (từ đóng sang mở) và notification chưa đọc
      if (newOpen && notification.id && !notification.read) {
        onMarkAsRead(notification.id)
      }
    },
    [notification.id, notification.read, onMarkAsRead]
  )

  const handleMessageClick = useCallback(() => {
    if (!canNavigate || !redirectPath) {
      return
    }

    if (notification.id && !notification.read) {
      onMarkAsRead(notification.id)
    }

    navigate(redirectPath, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [canNavigate, navigate, notification.id, notification.read, onMarkAsRead, redirectPath])

  // Đánh dấu đã đọc khi điều hướng từ link nhân sự trong message (vd: thông báo HĐ sắp hết hạn).
  const handleMessageNavigate = useCallback(
    (noti: Notification) => {
      if (noti.id && !noti.read) {
        onMarkAsRead(noti.id)
      }
    },
    [onMarkAsRead]
  )

  return (
    <>
      <Box
        height={open ? 'bestFit' : 'unset'}
        width={'100%'}
        position={'relative'}
        py={'4'}
        className={cn(
          'transition-colors duration-200',
          'hover:bg-data-light-grey-hover',
          !notification.read && 'bg-data-light-grey-default'
        )}
      >
        <Collapsible.Root open={open} onOpenChange={handleOpenChange} className={'p-0 pl-4'}>
          <Flex justify={'between'} gap={'1'}>
            {notification.read ? (
              <div className={cn('size-[10px]', 'ml-1')}>&nbsp;</div>
            ) : (
              <div
                className={cn(
                  'size-[10px]',
                  'bg-data-blue-default rounded-full',
                  'self-start',
                  'mt-1 ml-1'
                )}
              />
            )}

            <Flex direction={'column'} flexGrow={'1'}>
              {!open && (
                <Text
                  className={cn(
                    'typo-body-base-medium',
                    notification.read ? 'text-content-dark-2' : 'text-content-dark-1',
                    'block max-w-[330px]',
                    'truncate text-start',
                    canNavigate ? 'cursor-pointer' : 'cursor-default'
                  )}
                  onClick={canNavigate ? handleMessageClick : undefined}
                  title={notification.message || notification.verb}
                >
                  <NotificationMessage
                    notification={notification}
                    onBeforeNavigate={handleMessageNavigate}
                  />
                </Text>
              )}
              <Collapsible.Content className={'CollapsibleContent'}>
                <Text
                  className={cn(
                    'typo-body-base-medium',
                    notification.read ? 'text-content-dark-2' : 'text-content-dark-1',
                    'block max-w-[330px] flex-1 whitespace-pre-line'
                  )}
                >
                  <NotificationMessage
                    notification={notification}
                    onBeforeNavigate={handleMessageNavigate}
                  />
                </Text>
              </Collapsible.Content>
              <Collapsible.Trigger className={'absolute right-0 bottom-0'}>
                <Button
                  variant={'text'}
                  className={cn('typo-body-xs-regular', 'text-content-dark-2')}
                >
                  {open ? 'Thu gọn' : 'Xem thêm'}
                </Button>
              </Collapsible.Trigger>
            </Flex>
          </Flex>
        </Collapsible.Root>
      </Box>
    </>
  )
}

export default NotificationContent
