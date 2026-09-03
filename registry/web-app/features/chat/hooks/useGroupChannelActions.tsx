import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog'
import {
  useDeleteChatChannel,
  useDisableChatChannel,
  useEnableChatChannel,
} from '../services/chat-service'
import type { GroupChannel } from '../types'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

export function useGroupChannelActions() {
  const { displayConfirm } = useDialog()
  const deleteMutation = useDeleteChatChannel()
  const disableMutation = useDisableChatChannel()
  const enableMutation = useEnableChatChannel()

  const confirmDelete = useCallback(
    (channel: GroupChannel) => {
      displayConfirm({
        title: 'Xóa nhóm chat',
        content: `Bạn có chắc chắn muốn xóa nhóm chat "${channel.name}"? Hành động này không thể hoàn tác.`,
        onConfirm: async () => {
          try {
            await deleteMutation.mutateAsync(channel.id)
          } catch (err) {
            toastService.error(extractErrorMessage(err))
          }
        },
      })
    },
    [displayConfirm, deleteMutation]
  )

  const confirmDisable = useCallback(
    (channel: GroupChannel) => {
      displayConfirm({
        title: 'Tạm dừng nhóm chat',
        content: `Bạn có chắc chắn muốn tạm dừng nhóm chat "${channel.name}"? Thành viên sẽ không thể gửi tin nhắn mới.`,
        confirmText: 'Tạm dừng',
        onConfirm: async () => {
          try {
            await disableMutation.mutateAsync(channel.id)
          } catch (err) {
            toastService.error(extractErrorMessage(err))
          }
        },
      })
    },
    [displayConfirm, disableMutation]
  )

  const confirmEnable = useCallback(
    (channel: GroupChannel) => {
      displayConfirm({
        title: 'Kích hoạt nhóm chat',
        content: `Bạn có chắc chắn muốn kích hoạt lại nhóm chat "${channel.name}"?`,
        confirmText: 'Kích hoạt',
        onConfirm: async () => {
          try {
            await enableMutation.mutateAsync(channel.id)
          } catch (err) {
            toastService.error(extractErrorMessage(err))
          }
        },
      })
    },
    [displayConfirm, enableMutation]
  )

  return {
    confirmDelete,
    confirmDisable,
    confirmEnable,
    isDeleting: deleteMutation.isPending,
    isDisabling: disableMutation.isPending,
    isEnabling: enableMutation.isPending,
  }
}
