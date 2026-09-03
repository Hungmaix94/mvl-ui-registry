import UnpaidLeaveProposalInfo from '@/features/decision-and-proposal/proposal/unpaid-leave/view/UnpaidLeaveProposalInfo.tsx'
import PaidLeaveProposalInfo from '@/features/decision-and-proposal/proposal/paid-leave/view/PaidLeaveProposalInfo.tsx'
import OvertimeWorkProposalInfo from '@/features/decision-and-proposal/proposal/overtime-work/view/OvertimeWorkProposalInfo.tsx'
import LateExemptionProposalInfo from '@/features/decision-and-proposal/proposal/late-exemption/view/LateExemptionProposalInfo.tsx'
import MaternityLeaveProposalInfo from '@/features/decision-and-proposal/proposal/maternity-leave/view/MaternityLeaveProposalInfo.tsx'
import PostMaternityBenefitProposalInfo from '@/features/decision-and-proposal/proposal/post-maternity-benefit/view/PostMaternityBenefitProposalInfo.tsx'
import JobTransferProposalInfo from '@/features/decision-and-proposal/proposal/job-transfer/view/JobTransferProposalInfo.tsx'
import BulkJobTransferProposalInfo from '@/features/decision-and-proposal/proposal/bulk-job-transfer/view/BulkJobTransferProposalInfo.tsx'
import AssetAllocationProposalInfo from '@/features/decision-and-proposal/proposal/asset-allocation/view/AssetAllocationProposalInfo.tsx'
import DeviceChangeProposalInfo from '@/features/decision-and-proposal/proposal/device-change/view/DeviceChangeProposalInfo.tsx'
import ReturnToWorkProposalInfo from '@/features/decision-and-proposal/proposal/return-to-work/view/ReturnToWorkProposalInfo.tsx'
import StatutoryLeaveProposalInfo from '@/features/decision-and-proposal/proposal/statutory-leave/view/StatutoryLeaveProposalInfo.tsx'
import ComplaintInfoSection from '@/features/attendance/timesheet-complaint/components/ComplaintInfoSection.tsx'
import ProposalConflictingWorkdays from '@/features/decision-and-proposal/proposal/_shares/components/ProposalConflictingWorkdays.tsx'
import { ProposalStatus, ProposalType } from '@/constants/api-schema-aliases'

type ProposalTypeInfoProps = {
  proposalType: ProposalType | ProposalStatus | null
  proposal: any
}

function renderProposalTypeContent(proposalType: ProposalType | ProposalStatus, proposal: any) {
  switch (proposalType) {
    case ProposalType.unpaid_leave:
      return <UnpaidLeaveProposalInfo proposal={proposal} />

    case ProposalType.paid_leave:
      return <PaidLeaveProposalInfo proposal={proposal} />

    case ProposalType.overtime_work:
      return <OvertimeWorkProposalInfo proposal={proposal} />

    case ProposalType.late_exemption:
      return <LateExemptionProposalInfo proposal={proposal} />

    case ProposalType.maternity_leave:
      return <MaternityLeaveProposalInfo proposal={proposal} />

    case ProposalType.post_maternity_benefits:
      return <PostMaternityBenefitProposalInfo proposal={proposal} />

    case ProposalType.job_transfer:
      return <JobTransferProposalInfo proposal={proposal} />

    case ProposalType.bulk_job_transfer:
      return <BulkJobTransferProposalInfo proposal={proposal} />

    case ProposalType.asset_allocation:
      return <AssetAllocationProposalInfo proposal={proposal} />

    case ProposalType.device_change:
      return <DeviceChangeProposalInfo proposal={proposal} />

    case ProposalType.return_to_work:
      return <ReturnToWorkProposalInfo proposal={proposal} />

    case ProposalType.statutory_paid_leave:
      return <StatutoryLeaveProposalInfo proposal={proposal} />

    case ProposalType.timesheet_entry_complaint:
      return <ComplaintInfoSection complaint={proposal} />

    default:
      return (
        <div className="flex w-full items-center justify-center py-8">
          <span className="text-content-dark-3">Loại đề xuất không hợp lệ</span>
        </div>
      )
  }
}

const ProposalTypeInfo = ({ proposalType, proposal }: ProposalTypeInfoProps) => {
  if (!proposalType || !proposal) {
    return (
      <div className="flex w-full items-center justify-center py-8">
        <span className="text-content-dark-3">Không có thông tin đề xuất</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {renderProposalTypeContent(proposalType, proposal)}
      <ProposalConflictingWorkdays conflictingWorkdays={proposal?.conflicting_workdays} />
    </div>
  )
}

export default ProposalTypeInfo
