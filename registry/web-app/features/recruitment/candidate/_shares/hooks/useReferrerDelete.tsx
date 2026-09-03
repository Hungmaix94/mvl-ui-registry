import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useUpdateRecruitmentCandidateReferrer } from '@/services'
import { useToast } from '@/hooks/useToast.ts'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import type { RecruitmentCandidate } from '@/services'

export function useReferrerDelete() {
  const { displayConfirm, displayClose } = useDialog()
  const { success: showSuccessToast } = useToast()
  const updateReferrerMutation = useUpdateRecruitmentCandidateReferrer()
  const queryClient = useQueryClient()

  const deleteReferrer = useCallback(
    (candidate: RecruitmentCandidate) => {
      displayConfirm({
        title: 'Xoá người giới thiệu',
        content: 'Bạn có chắc chắn muốn xoá không?',
        onConfirm: async () => {
          try {
            await updateReferrerMutation.mutateAsync({
              id: candidate.id,
              data: { referrer_id: null },
            })

            // Invalidate candidate detail query to refetch updated data
            await queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.HRM.RECRUITMENT_CANDIDATES.DETAIL(candidate.id),
            })

            showSuccessToast('Xoá người giới thiệu thành công')
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
    [displayConfirm, displayClose, updateReferrerMutation, queryClient, showSuccessToast]
  )

  return {
    deleteReferrer,
    isDeleting: updateReferrerMutation.isPending,
  }
}
