import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { cn } from '@/utils'
import {
  useDeleteInterviewSchedule,
  type InterviewSchedule,
} from '@/features/recruitment/services/interview-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export const useInterviewScheduleDelete = (onSuccess?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deleteInterviewScheduleMutation = useDeleteInterviewSchedule()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (interviewSchedule: InterviewSchedule) => {
      displayConfirm({
        title: 'Xác nhận xóa lịch phỏng vấn',
        content: (
          <div className="text-content-dark-1">
            Bạn có chắc chắn muốn xóa lịch phỏng vấn{' '}
            <span className="text-content-dark-1 font-semibold">"{interviewSchedule.title}"</span>{' '}
            không?
            <br />
            <span className="text-content-dark-3 text-sm">Hành động này không thể hoàn tác.</span>
          </div>
        ),
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        confirmButtonClassName: cn(
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white'
        ),
        onConfirm: async () => {
          setLoading(true)
          try {
            await deleteInterviewScheduleMutation.mutateAsync(interviewSchedule.id)

            // Invalidate queries to refresh the list
            await invalidateQueries.invalidateByPrefix('hrm')

            toastService.success('Xóa lịch phỏng vấn thành công')
            onSuccess?.()
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, deleteInterviewScheduleMutation, invalidateQueries, onSuccess]
  )

  return {
    openDeleteDialog,
  }
}
