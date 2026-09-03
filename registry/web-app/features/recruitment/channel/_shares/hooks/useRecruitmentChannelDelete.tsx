import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteRecruitmentChannel,
  type RecruitmentChannel,
} from '@/features/recruitment/services/recruitment-channel-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export const useRecruitmentChannelDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deleteRecruitmentChannelMutation = useDeleteRecruitmentChannel()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (channel: RecruitmentChannel) => {
      displayConfirm({
        title: 'Xoá kênh tuyển dụng',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{channel.name}</b> không?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        confirmText: 'Xoá',
        cancelText: 'Huỷ',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        size: 'xl',
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteRecruitmentChannelMutation.mutateAsync(channel.id)

            // Invalidate all recruitment channels queries to refresh the list
            await invalidateQueries.invalidateByPrefix('hrm')

            toastService.success('Xoá kênh tuyển dụng thành công')

            if (typeof onSuccessfullyDelete === 'function' && onSuccessfullyDelete) {
              onSuccessfullyDelete()
            }
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [
      displayConfirm,
      deleteRecruitmentChannelMutation,
      invalidateQueries,
      onSuccessfullyDelete,
      setLoading,
    ]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteRecruitmentChannelMutation.isPending,
  }
}
