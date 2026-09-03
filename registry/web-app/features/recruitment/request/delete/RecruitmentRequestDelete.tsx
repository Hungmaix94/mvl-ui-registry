import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteRecruitmentRequest,
  type RecruitmentRequest,
} from '@/features/recruitment/services/recruitment-request-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export const useRecruitmentRequestDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deleteRecruitmentRequestMutation = useDeleteRecruitmentRequest()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (request: RecruitmentRequest) => {
      displayConfirm({
        title: 'Xoá yêu cầu tuyển dụng',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">
              {request.name || request.code}
            </b>{' '}
            không?
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
            await deleteRecruitmentRequestMutation.mutateAsync(request.id)

            // Invalidate recruitment request list queries
            await invalidateQueries.invalidateByPrefix('hrm/recruitment-requests')

            toastService.success('Xoá yêu cầu tuyển dụng thành công')

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
      deleteRecruitmentRequestMutation,
      invalidateQueries,
      onSuccessfullyDelete,
      setLoading,
    ]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteRecruitmentRequestMutation.isPending,
  }
}
