import { Flex, Separator, Text } from '@radix-ui/themes'
import InfiniteScroll from 'react-infinite-scroll-component'
import { Button, DotLoader } from '@/components/ui'
import { IconChecks } from '@/assets/icons'
import { Fragment, useCallback, useState } from 'react'
import { useNotificationStore } from '@/store'
import {
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/services/notification-service'
import './collapsible.css'
import NotificationContent from '@/components/navigation/notification/NotificationContent.tsx'

const SCROLL_CONTAINER_ID = 'notification-scroll-container'

const Notification = () => {
  const {
    notifications,
    isLoading,
    hasNextPage: storeHasNextPage,
    loadMoreNotifications,
  } = useNotificationStore()

  const markAsReadMutation = useMarkNotificationAsRead()
  const markAllAsReadMutation = useMarkAllNotificationsAsRead()

  // Local state for infinite scroll
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Load more notifications function
  const loadMore = useCallback(async () => {
    if (!storeHasNextPage || isLoadingMore) {
      return
    }

    setIsLoadingMore(true)
    try {
      await loadMoreNotifications()
      // hasNextPage is managed in store, no need to update local state
    } catch (error) {
      console.error('Failed to load more notifications:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [storeHasNextPage, isLoadingMore, loadMoreNotifications])

  // Removed useInfiniteScroll hook - now using react-infinite-scroll-component

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate(undefined)
    // Update local state optimistically
    useNotificationStore.getState().markAllAsReadLocal()
  }, [markAllAsReadMutation])

  const handleMarkAsRead = useCallback(
    (id: number) => {
      markAsReadMutation.mutate(id)
      // Update local state optimistically
      useNotificationStore.getState().markAsReadLocal(id)
    },
    [markAsReadMutation]
  )

  if (isLoading) {
    return (
      <Flex
        direction={'column'}
        width={'400px'}
        align={'center'}
        justify={'center'}
        height={'400px'}
      >
        <DotLoader size="lg" />
        <Text className="typo-body-base-medium text-content-dark-2 mt-4">
          Đang tải thông báo...
        </Text>
      </Flex>
    )
  }

  return (
    <>
      <Flex direction={'column'} width={'400px'} align={'center'}>
        <Flex justify={'between'} className={'sticky w-full'} p={'4'}>
          <Text className={'typo-body-xl-semibold text-content-dark-1'}>Thông báo</Text>

          <Button
            leftIcon={<IconChecks />}
            variant={'text'}
            onClick={handleMarkAllAsRead}
            disabled={notifications.every((noti) => noti.read) || markAllAsReadMutation.isPending}
          >
            Đánh dấu tất cả đã đọc
          </Button>
        </Flex>

        <div id={SCROLL_CONTAINER_ID} className="max-h-[600px] w-full overflow-auto">
          <InfiniteScroll
            dataLength={notifications.length}
            next={loadMore}
            hasMore={storeHasNextPage}
            loader={
              <Flex direction={'column'} align={'center'} justify={'center'} py={'4'}>
                <DotLoader size="md" />
                <Text className="typo-body-sm-medium text-content-dark-2 mt-2">
                  Đang tải thêm
                  <span className={'dot-loader'} />
                </Text>
              </Flex>
            }
            endMessage={
              notifications.length > 0 ? (
                <Flex direction={'column'} align={'center'} justify={'center'} py={'4'}>
                  <Text className="typo-body-sm-medium text-content-dark-2">
                    Đã hiển thị tất cả thông báo
                  </Text>
                </Flex>
              ) : null
            }
            scrollableTarget={SCROLL_CONTAINER_ID}
            scrollThreshold="100px"
          >
            <Flex direction={'column'} align={'center'} gap={'0'} width={'100%'}>
              {notifications.length === 0 ? (
                <Flex direction={'column'} align={'center'} justify={'center'} height={'200px'}>
                  <Text className="typo-body-base-medium text-content-dark-2">
                    Không có thông báo nào
                  </Text>
                </Flex>
              ) : (
                notifications.map((noti, idx) => (
                  <Fragment key={`${noti.id}_${idx}`}>
                    <NotificationContent notification={noti} onMarkAsRead={handleMarkAsRead} />
                    {idx !== notifications.length - 1 && (
                      <Separator orientation={'horizontal'} className={'!w-full'} />
                    )}
                  </Fragment>
                ))
              )}
            </Flex>
          </InfiniteScroll>
        </div>
      </Flex>
    </>
  )
}

export default Notification
