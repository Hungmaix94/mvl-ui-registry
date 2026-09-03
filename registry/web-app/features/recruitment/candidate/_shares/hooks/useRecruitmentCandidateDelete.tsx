import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteRecruitmentCandidate,
  type RecruitmentCandidate,
} from '@/features/recruitment/services/recruitment-candidate-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export function useRecruitmentCandidateDelete() {
  const { displayConfirm, setLoading } = useDialog()
  const deleteRecruitmentCandidateMutation = useDeleteRecruitmentCandidate()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (candidate: RecruitmentCandidate) => {
      displayConfirm({
        title: 'Xoá ứng viên tuyển dụng',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">
              {candidate.name || candidate.code}
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
            await deleteRecruitmentCandidateMutation.mutateAsync(candidate.id)

            // Invalidate recruitment candidate list queries
            await invalidateQueries.invalidateByPrefix('hrm/recruitment-candidates')

            toastService.success('Xoá ứng viên tuyển dụng thành công')
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, deleteRecruitmentCandidateMutation, invalidateQueries, setLoading]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteRecruitmentCandidateMutation.isPending,
  }
}
