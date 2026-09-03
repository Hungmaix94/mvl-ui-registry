import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ProposalApproveRequest,
  ProposalRejectRequest,
} from '@/features/decision-and-proposal/services/proposal-base-service'
import {
  approveProposalByType,
  rejectProposalByType,
  type ProposalTypeForDispatch,
} from '@/features/decision-and-proposal/services/proposal-approve-reject-dispatch'
import type { ProposalTimesheetEntryComplaintApproveRequest } from '@/features/decision-and-proposal/services/proposal-misc-service'

export type ApproveProposalByTypeVariables = {
  proposalType: ProposalTypeForDispatch
  id: number
  data: ProposalApproveRequest | ProposalTimesheetEntryComplaintApproveRequest
}

export type RejectProposalByTypeVariables = {
  proposalType: ProposalTypeForDispatch
  id: number
  data: ProposalRejectRequest
}

function invalidateProposalListQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['hrm', 'proposals', 'list'] })
}

export function useApproveProposalByType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: ApproveProposalByTypeVariables) =>
      approveProposalByType(vars.proposalType, vars.id, vars.data),
    onSuccess: () => {
      invalidateProposalListQueries(queryClient)
    },
  })
}

export function useRejectProposalByType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: RejectProposalByTypeVariables) =>
      rejectProposalByType(vars.proposalType, vars.id, vars.data),
    onSuccess: () => {
      invalidateProposalListQueries(queryClient)
    },
  })
}
