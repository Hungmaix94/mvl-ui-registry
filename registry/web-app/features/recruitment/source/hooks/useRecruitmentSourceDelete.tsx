import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteRecruitmentSource,
  type RecruitmentSource,
} from '@/features/recruitment/services/recruitment-source-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export const useRecruitmentSourceDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deleteRecruitmentSourceMutation = useDeleteRecruitmentSource()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (source: RecruitmentSource) => {
      displayConfirm({
        title: 'Xoá nguồn tuyển dụng',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{source.name}</b> không?
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
            await deleteRecruitmentSourceMutation.mutateAsync(source.id)

            // Invalidate all recruitment sources queries to refresh the list
            await invalidateQueries.invalidateByPrefix('hrm')

            toastService.success('Xoá nguồn tuyển dụng thành công')

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
      deleteRecruitmentSourceMutation,
      invalidateQueries,
      onSuccessfullyDelete,
      setLoading,
    ]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteRecruitmentSourceMutation.isPending,
  }
}
