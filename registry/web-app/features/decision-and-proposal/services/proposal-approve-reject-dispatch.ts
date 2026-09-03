import type {
  ProposalApproveRequest,
  ProposalRejectRequest,
} from '@/features/decision-and-proposal/services/proposal-base-service'
import { getProposalLeaveService } from '@/features/decision-and-proposal/services/proposal-leave-service'
import type { ProposalTimesheetEntryComplaintApproveRequest } from '@/features/decision-and-proposal/services/proposal-misc-service'
import { getProposalMiscService } from '@/features/decision-and-proposal/services/proposal-misc-service'
import { ProposalType } from '@/constants/api-schema-aliases'

export type ProposalTypeForDispatch = ProposalType

export type ProposalApproveDispatchPayload =
  | ProposalApproveRequest
  | ProposalTimesheetEntryComplaintApproveRequest

/**
 * Routes approve to the resource-specific POST …/{id}/approve/ per OpenAPI (see schema operations
 * hrm_proposals_*_approve_create). Timesheet complaint uses ProposalTimesheetEntryComplaintApproveRequest;
 * other types use ProposalApproveRequest (or structurally equivalent, e.g. return-to-work).
 */
export async function approveProposalByType(
  proposalType: ProposalTypeForDispatch,
  id: number,
  data: ProposalApproveDispatchPayload
) {
  const leave = getProposalLeaveService()
  const misc = getProposalMiscService()
  const base = data as ProposalApproveRequest

  switch (proposalType) {
    case ProposalType.paid_leave:
      return leave.approveProposalPaidLeave(id, base)
    case ProposalType.unpaid_leave:
      return leave.approveProposalUnpaidLeave(id, base)
    case ProposalType.maternity_leave:
      return leave.approveProposalMaternityLeave(id, base)
    case ProposalType.post_maternity_benefits:
      return leave.approveProposalPostMaternityBenefits(id, base)
    case ProposalType.overtime_work:
      return misc.approveProposalOvertimeWork(id, base)
    case ProposalType.late_exemption:
      return misc.approveProposalLateExemption(id, base)
    case ProposalType.job_transfer:
      return misc.approveProposalJobTransfer(id, base)
    case ProposalType.bulk_job_transfer:
      return misc.approveProposalBulkJobTransfer(id, base)
    case ProposalType.asset_allocation:
      return misc.approveProposalAssetAllocation(id, base)
    case ProposalType.device_change:
      return misc.approveProposalDeviceChange(id, base)
    case ProposalType.return_to_work:
      return misc.approveProposalReturnToWork(id, base)
    case ProposalType.statutory_paid_leave:
      return misc.approveProposalStatutoryLeave(id, base)
    case ProposalType.timesheet_entry_complaint:
      return misc.approveProposalTimesheetEntryComplaint(
        id,
        data as ProposalTimesheetEntryComplaintApproveRequest
      )
    default: {
      const _exhaustive: never = proposalType
      throw new Error(`Unsupported proposal type for approve: ${String(_exhaustive)}`)
    }
  }
}

/**
 * Routes reject to the resource-specific POST …/{id}/reject/. Reject bodies are approval_note required
 * (ProposalRejectRequest / ProposalTimesheetEntryComplaintRejectRequest — same shape).
 */
export async function rejectProposalByType(
  proposalType: ProposalTypeForDispatch,
  id: number,
  data: ProposalRejectRequest
) {
  const leave = getProposalLeaveService()
  const misc = getProposalMiscService()

  switch (proposalType) {
    case ProposalType.paid_leave:
      return leave.rejectProposalPaidLeave(id, data)
    case ProposalType.unpaid_leave:
      return leave.rejectProposalUnpaidLeave(id, data)
    case ProposalType.maternity_leave:
      return leave.rejectProposalMaternityLeave(id, data)
    case ProposalType.post_maternity_benefits:
      return leave.rejectProposalPostMaternityBenefits(id, data)
    case ProposalType.overtime_work:
      return misc.rejectProposalOvertimeWork(id, data)
    case ProposalType.late_exemption:
      return misc.rejectProposalLateExemption(id, data)
    case ProposalType.job_transfer:
      return misc.rejectProposalJobTransfer(id, data)
    case ProposalType.bulk_job_transfer:
      return misc.rejectProposalBulkJobTransfer(id, data)
    case ProposalType.asset_allocation:
      return misc.rejectProposalAssetAllocation(id, data)
    case ProposalType.device_change:
      return misc.rejectProposalDeviceChange(id, data)
    case ProposalType.return_to_work:
      return misc.rejectProposalReturnToWork(id, data)
    case ProposalType.statutory_paid_leave:
      return misc.rejectProposalStatutoryLeave(id, data)
    case ProposalType.timesheet_entry_complaint:
      return misc.rejectProposalTimesheetEntryComplaint(id, data)
    default: {
      const _exhaustive: never = proposalType
      throw new Error(`Unsupported proposal type for reject: ${String(_exhaustive)}`)
    }
  }
}
