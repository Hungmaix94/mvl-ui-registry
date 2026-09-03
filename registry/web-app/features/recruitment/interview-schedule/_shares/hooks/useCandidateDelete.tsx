import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteInterviewCandidate,
  type InterviewCandidate,
} from '@/features/recruitment/services/interview-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { cn } from '@/utils'

export function useCandidateDelete() {
  const { displayConfirm } = useDialog()
  const deleteMutation = useDeleteInterviewCandidate()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteCandidateDialog = useCallback(
    (candidate: InterviewCandidate) => {
      displayConfirm({
        title: 'Xác nhận xóa ứng viên',
        content: (
          <div className="text-content-dark-1">
            Bạn có chắc chắn muốn xóa ứng viên{' '}
            <span className="text-content-dark-1 font-semibold">
              "{candidate.recruitment_candidate?.name || 'N/A'}"
            </span>{' '}
            khỏi lịch phỏng vấn không?
            <br />
            <span className="text-content-dark-2">
              <strong>Thời gian phỏng vấn:</strong>{' '}
              {candidate.interview_time
                ? new Date(candidate.interview_time).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Chưa xác định'}
            </span>
            <br />
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
          try {
            await deleteMutation.mutateAsync(candidate.id)
            await invalidateQueries.invalidateByPrefix('hrm')
            toastService.success('Xóa lịch phỏng vấn ứng viên thành công')
          } catch {
            // Error toast is handled by service layer
          }
        },
      })
    },
    [displayConfirm, deleteMutation, invalidateQueries]
  )

  return {
    openDeleteCandidateDialog,
  }
}
