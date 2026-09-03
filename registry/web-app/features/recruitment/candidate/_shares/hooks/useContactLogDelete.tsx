import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useDeleteRecruitmentCandidateContactLog } from '@/services'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { cn } from '@/utils'
import { formatDate } from '@/utils/date-utils.ts'

export function useContactLogDelete() {
  const { displayConfirm, setLoading } = useDialog()
  const deleteContactLogMutation = useDeleteRecruitmentCandidateContactLog()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (contactLog: any) => {
      displayConfirm({
        title: 'Xoá lần liên hệ',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc chắn muốn xoá lần liên hệ sau đây không?
            <br />
            <br />
            <div
              className={cn('flex flex-col justify-start gap-2', 'bg-background-2 rounded-md p-3')}
            >
              <div className={'text-left'}>
                <strong>Ngày liên hệ:</strong> {formatDate(contactLog.date)}
              </div>
              <div className={'text-left'}>
                <strong>Phương thức:</strong> {contactLog.method}
              </div>
              {contactLog.note && (
                <div className={'max-w-[200px] truncate text-left'}>
                  <strong>Ghi chú:</strong> {contactLog.note}
                </div>
              )}
            </div>
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
            await deleteContactLogMutation.mutateAsync(contactLog.id)

            // Invalidate contact logs query to refresh the table
            await invalidateQueries.invalidateByPrefix(`hrm/recruitment-candidate-contact-logs`)

            toastService.success('Xoá lần liên hệ thành công')
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, deleteContactLogMutation, invalidateQueries, setLoading]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteContactLogMutation.isPending,
  }
}
