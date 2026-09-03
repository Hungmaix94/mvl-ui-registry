import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteJobDescription,
  type JobDescription,
} from '@/features/recruitment/services/job-description-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export const useJobDescriptionDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deleteJobDescriptionMutation = useDeleteJobDescription()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (jobDescription: JobDescription) => {
      displayConfirm({
        title: 'Xoá mô tả công việc',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{jobDescription.title}</b>{' '}
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
            await deleteJobDescriptionMutation.mutateAsync(jobDescription.id)

            // Invalidate all job descriptions queries to refresh the list
            await invalidateQueries.invalidateByPrefix('hrm')

            toastService.success('Xoá mô tả công việc thành công')

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
      deleteJobDescriptionMutation,
      invalidateQueries,
      onSuccessfullyDelete,
      setLoading,
    ]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteJobDescriptionMutation.isPending,
  }
}
