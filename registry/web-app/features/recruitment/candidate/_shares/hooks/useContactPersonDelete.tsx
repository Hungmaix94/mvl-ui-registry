import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { usePartialUpdateRecruitmentCandidate } from '@/features/recruitment/services/recruitment-candidate-service'
import { useToast } from '@/hooks/useToast.ts'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import type { RecruitmentCandidate } from '@/features/recruitment/services/recruitment-candidate-service'

export function useContactPersonDelete() {
  const { displayConfirm, displayClose } = useDialog()
  const { success: showSuccessToast } = useToast()
  const partialUpdateMutation = usePartialUpdateRecruitmentCandidate()
  const queryClient = useQueryClient()

  const deleteContactPerson = useCallback(
    (candidate: RecruitmentCandidate) => {
      displayConfirm({
        title: 'Xoá người liên hệ',
        content: 'Bạn có chắc chắn muốn xoá không?',
        onConfirm: async () => {
          try {
            await partialUpdateMutation.mutateAsync({
              id: candidate.id,
              data: { contact_person_id: null, force_save: false },
            })
            await queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.HRM.RECRUITMENT_CANDIDATES.DETAIL(candidate.id),
            })
            showSuccessToast('Xoá người liên hệ thành công')
            displayClose()
          } catch {
            // Error toast is handled by service layer
          }
        },
        onCancel: () => {
          displayClose()
        },
      })
    },
    [displayConfirm, displayClose, partialUpdateMutation, queryClient, showSuccessToast]
  )

  return {
    deleteContactPerson,
    isDeleting: partialUpdateMutation.isPending,
  }
}
