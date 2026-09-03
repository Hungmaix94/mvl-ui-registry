import { useQueryClient } from '@tanstack/react-query'
import { useProposalTypeLabel } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalTypeLabel'
import {
  getProposalApproveRejectTitle,
  getProposalDetailQueryKey,
  getProposalListQueryKey,
} from '@/features/decision-and-proposal/proposal/_shares/utils/proposal-type-utils'
import { useProposalApproveReject } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalApproveReject'
import { useProposalMutations } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalMutations'
import type { MiscApprovePayload } from '@/features/decision-and-proposal/proposal/_shares/utils/proposal-approve-content'
import { ProposalType } from '@/constants/api-schema-aliases'

type UseProposalApproveRejectWithInvalidationOptions = {
  proposalType: ProposalType
  /** Fires after a successful approve, once queries are invalidated (e.g. show a follow-up info dialog). */
  onApproveSuccess?: () => void
}

export function useProposalApproveRejectWithInvalidation({
  proposalType,
  onApproveSuccess,
}: UseProposalApproveRejectWithInvalidationOptions) {
  const queryClient = useQueryClient()
  const typeLabel = useProposalTypeLabel(proposalType)
  const { approveMutation, rejectMutation } = useProposalMutations(proposalType)
  const listQueryKey = getProposalListQueryKey(proposalType)

  const { handleApprove, handleReject } = useProposalApproveReject<MiscApprovePayload>({
    onApprove: async (id: number, data) => {
      await approveMutation.mutateAsync({ id, data })
      const detailQueryKey = getProposalDetailQueryKey(proposalType, id)
      if (detailQueryKey) {
        await queryClient.invalidateQueries({
          queryKey: detailQueryKey,
        })
      }
      await queryClient.invalidateQueries({
        queryKey: listQueryKey,
      })
      await queryClient.invalidateQueries({
        queryKey: ['hrm', 'proposals', 'mine', 'list'],
      })
      onApproveSuccess?.()
    },
    onReject: async (id: number, data) => {
      await rejectMutation.mutateAsync({ id, data })
      const detailQueryKey = getProposalDetailQueryKey(proposalType, id)
      if (detailQueryKey) {
        await queryClient.invalidateQueries({
          queryKey: detailQueryKey,
        })
      }
      await queryClient.invalidateQueries({
        queryKey: listQueryKey,
      })
      await queryClient.invalidateQueries({
        queryKey: ['hrm', 'proposals', 'mine', 'list'],
      })
    },
    approveTitle: getProposalApproveRejectTitle(proposalType, 'approve', typeLabel),
    rejectTitle: getProposalApproveRejectTitle(proposalType, 'reject', typeLabel),
  })

  return {
    handleApprove,
    handleReject,
  }
}
