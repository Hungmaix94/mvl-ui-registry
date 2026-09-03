import type { UseMutationResult } from '@tanstack/react-query'
import type { ProposalApproveRequest, ProposalRejectRequest } from '@/services'
import {
  useApproveProposalUnpaidLeave,
  useRejectProposalUnpaidLeave,
  useApproveProposalPaidLeave,
  useRejectProposalPaidLeave,
  useApproveProposalMaternityLeave,
  useRejectProposalMaternityLeave,
  useApproveProposalPostMaternityBenefits,
  useRejectProposalPostMaternityBenefits,
} from '@/features/decision-and-proposal/services/proposal-leave-service'
import {
  useApproveProposalAssetAllocation,
  useRejectProposalAssetAllocation,
  useApproveProposalDeviceChange,
  useRejectProposalDeviceChange,
  useApproveProposalOvertimeWork,
  useRejectProposalOvertimeWork,
  useApproveProposalLateExemption,
  useRejectProposalLateExemption,
  useApproveProposalJobTransfer,
  useRejectProposalJobTransfer,
  useApproveProposalBulkJobTransfer,
  useRejectProposalBulkJobTransfer,
  useApproveProposalReturnToWork,
  useRejectProposalReturnToWork,
  useApproveProposalStatutoryLeave,
  useRejectProposalStatutoryLeave,
} from '@/features/decision-and-proposal/services/proposal-misc-service'
import { ProposalType } from '@/constants/api-schema-aliases'

type ProposalMutations = {
  approveMutation: UseMutationResult<any, Error, { id: number; data?: ProposalApproveRequest }>
  rejectMutation: UseMutationResult<any, Error, { id: number; data: ProposalRejectRequest }>
}

export function useProposalMutations(proposalType: ProposalType): ProposalMutations {
  switch (proposalType) {
    case ProposalType.unpaid_leave:
      return {
        approveMutation: useApproveProposalUnpaidLeave(),
        rejectMutation: useRejectProposalUnpaidLeave(),
      }
    case ProposalType.paid_leave:
      return {
        approveMutation: useApproveProposalPaidLeave(),
        rejectMutation: useRejectProposalPaidLeave(),
      }
    case ProposalType.maternity_leave:
      return {
        approveMutation: useApproveProposalMaternityLeave(),
        rejectMutation: useRejectProposalMaternityLeave(),
      }
    case ProposalType.post_maternity_benefits:
      return {
        approveMutation: useApproveProposalPostMaternityBenefits(),
        rejectMutation: useRejectProposalPostMaternityBenefits(),
      }
    case ProposalType.asset_allocation:
      return {
        approveMutation: useApproveProposalAssetAllocation(),
        rejectMutation: useRejectProposalAssetAllocation(),
      }
    case ProposalType.device_change:
      return {
        approveMutation: useApproveProposalDeviceChange(),
        rejectMutation: useRejectProposalDeviceChange(),
      }
    case ProposalType.overtime_work:
      return {
        approveMutation: useApproveProposalOvertimeWork(),
        rejectMutation: useRejectProposalOvertimeWork(),
      }
    case ProposalType.late_exemption:
      return {
        approveMutation: useApproveProposalLateExemption(),
        rejectMutation: useRejectProposalLateExemption(),
      }
    case ProposalType.job_transfer:
      return {
        approveMutation: useApproveProposalJobTransfer(),
        rejectMutation: useRejectProposalJobTransfer(),
      }
    case ProposalType.bulk_job_transfer:
      return {
        approveMutation: useApproveProposalBulkJobTransfer(),
        rejectMutation: useRejectProposalBulkJobTransfer(),
      }
    case ProposalType.return_to_work:
      return {
        approveMutation: useApproveProposalReturnToWork(),
        rejectMutation: useRejectProposalReturnToWork(),
      }
    case ProposalType.statutory_paid_leave:
      return {
        approveMutation: useApproveProposalStatutoryLeave(),
        rejectMutation: useRejectProposalStatutoryLeave(),
      }
    default:
      throw new Error(`Unsupported proposal type: ${proposalType}`)
  }
}
