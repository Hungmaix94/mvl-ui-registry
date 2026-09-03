import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'
import {
  useCancelAccessRequest,
  useUpdateAccessRequest,
  type LibraryAccessRequestRead,
} from '@/services/elibrary-service'

/**
 * Actions cho màn Yêu cầu truy cập: owner duyệt/từ chối, requester huỷ.
 * Mỗi action mở confirm dialog rồi gọi mutation tương ứng. Mutation tự
 * invalidate query nên danh sách tự refresh sau khi xử lý.
 */
export function useAccessRequestActions() {
  const { displayConfirm, setLoading } = useDialog()
  const updateMutation = useUpdateAccessRequest()
  const cancelMutation = useCancelAccessRequest()

  const openApproveDialog = useCallback(
    (request: LibraryAccessRequestRead) => {
      displayConfirm({
        title: 'Duyệt yêu cầu truy cập',
        content: (
          <div className="text-content-dark-2">
            Duyệt yêu cầu của <b>{request.requester?.display_name}</b> cho tài liệu{' '}
            <b>{request.item_name}</b>? Hệ thống sẽ tự động chia sẻ quyền xem cho người này.
          </div>
        ),
        confirmText: 'Duyệt',
        cancelText: 'Huỷ',
        onConfirm: async () => {
          try {
            setLoading(true)
            await updateMutation.mutateAsync({ id: request.id, status: 'approved' })
            toastService.success('Đã duyệt yêu cầu truy cập')
          } catch (e: any) {
            toastService.error(e?.message || 'Có lỗi khi duyệt yêu cầu truy cập')
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, setLoading, updateMutation]
  )

  const openRejectDialog = useCallback(
    (request: LibraryAccessRequestRead) => {
      displayConfirm({
        title: 'Từ chối yêu cầu truy cập',
        content: (
          <div className="text-content-dark-2">
            Từ chối yêu cầu của <b>{request.requester?.display_name}</b> cho tài liệu{' '}
            <b>{request.item_name}</b>?
          </div>
        ),
        confirmText: 'Từ chối',
        cancelText: 'Huỷ',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        onConfirm: async () => {
          try {
            setLoading(true)
            await updateMutation.mutateAsync({ id: request.id, status: 'rejected' })
            toastService.success('Đã từ chối yêu cầu truy cập')
          } catch (e: any) {
            toastService.error(e?.message || 'Có lỗi khi từ chối yêu cầu truy cập')
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, setLoading, updateMutation]
  )

  const openCancelDialog = useCallback(
    (request: LibraryAccessRequestRead) => {
      displayConfirm({
        title: 'Huỷ yêu cầu truy cập',
        content: (
          <div className="text-content-dark-2">
            Huỷ yêu cầu truy cập tài liệu <b>{request.item_name}</b>?
          </div>
        ),
        confirmText: 'Huỷ yêu cầu',
        cancelText: 'Đóng',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        onConfirm: async () => {
          try {
            setLoading(true)
            await cancelMutation.mutateAsync(request.id)
            toastService.success('Đã huỷ yêu cầu truy cập')
          } catch (e: any) {
            toastService.error(e?.message || 'Có lỗi khi huỷ yêu cầu truy cập')
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, setLoading, cancelMutation]
  )

  return { openApproveDialog, openRejectDialog, openCancelDialog }
}
