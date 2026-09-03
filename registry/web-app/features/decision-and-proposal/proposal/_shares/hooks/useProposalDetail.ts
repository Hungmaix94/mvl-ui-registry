import {
  useProposalPaidLeave,
  useProposalUnpaidLeave,
  useProposalMaternityLeave,
  useProposalPostMaternityBenefits,
} from '@/features/decision-and-proposal/services/proposal-leave-service'
import {
  useProposalAssetAllocation,
  useProposalBulkJobTransfer,
  useProposalDeviceChange,
  useProposalJobTransfer,
  useProposalLateExemption,
  useProposalOvertimeWork,
  useProposalReturnToWork,
  useProposalStatutoryLeave,
  useProposalTimesheetEntryComplaint,
} from '@/features/decision-and-proposal/services/proposal-misc-service'
import { ProposalType } from '@/constants/api-schema-aliases'

/**
 * Custom hook to fetch proposal detail based on proposal type
 * This creates a unified interface for fetching different proposal types
 */
export function useProposalDetail(proposalId: number, proposalType: ProposalType | null) {
  // We need to call all hooks unconditionally, but only one will be enabled
  const paidLeave = useProposalPaidLeave(proposalType === ProposalType.paid_leave ? proposalId : 0)
  const unpaidLeave = useProposalUnpaidLeave(
    proposalType === ProposalType.unpaid_leave ? proposalId : 0
  )
  const maternityLeave = useProposalMaternityLeave(
    proposalType === ProposalType.maternity_leave ? proposalId : 0
  )
  const postMaternityBenefits = useProposalPostMaternityBenefits(
    proposalType === ProposalType.post_maternity_benefits ? proposalId : 0
  )
  const assetAllocation = useProposalAssetAllocation(
    proposalType === ProposalType.asset_allocation ? proposalId : 0
  )
  const deviceChange = useProposalDeviceChange(
    proposalType === ProposalType.device_change ? proposalId : 0
  )
  const jobTransfer = useProposalJobTransfer(
    proposalType === ProposalType.job_transfer ? proposalId : 0
  )
  const bulkJobTransfer = useProposalBulkJobTransfer(
    proposalType === ProposalType.bulk_job_transfer ? proposalId : 0
  )
  const lateExemption = useProposalLateExemption(
    proposalType === ProposalType.late_exemption ? proposalId : 0
  )
  const overtimeWork = useProposalOvertimeWork(
    proposalType === ProposalType.overtime_work ? proposalId : 0
  )
  const timesheetEntryComplaint = useProposalTimesheetEntryComplaint(
    proposalType === ProposalType.timesheet_entry_complaint ? proposalId : 0
  )
  const returnToWork = useProposalReturnToWork(
    proposalType === ProposalType.return_to_work ? proposalId : 0
  )
  const statutoryLeave = useProposalStatutoryLeave(
    proposalType === ProposalType.statutory_paid_leave ? proposalId : 0
  )

  // Select the correct result based on proposal type
  switch (proposalType) {
    case ProposalType.paid_leave:
      return paidLeave
    case ProposalType.unpaid_leave:
      return unpaidLeave
    case ProposalType.maternity_leave:
      return maternityLeave
    case ProposalType.post_maternity_benefits:
      return postMaternityBenefits
    case ProposalType.asset_allocation:
      return assetAllocation
    case ProposalType.device_change:
      return deviceChange
    case ProposalType.job_transfer:
      return jobTransfer
    case ProposalType.bulk_job_transfer:
      return bulkJobTransfer
    case ProposalType.late_exemption:
      return lateExemption
    case ProposalType.overtime_work:
      return overtimeWork
    case ProposalType.timesheet_entry_complaint:
      return timesheetEntryComplaint
    case ProposalType.return_to_work:
      return returnToWork
    case ProposalType.statutory_paid_leave:
      return statutoryLeave
    default:
      return {
        data: undefined,
        isLoading: false,
        error: null,
      }
  }
}
