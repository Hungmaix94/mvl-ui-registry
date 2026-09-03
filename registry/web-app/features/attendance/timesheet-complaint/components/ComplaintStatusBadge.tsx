import type { Proposal } from '@/features/decision-and-proposal/services/proposal-base-service'
import TimesheetProposalStatusBadge from '@/features/attendance/timesheet/view-details/TimesheetProposalStatusBadge.tsx'

type TimesheetProposalStatusBadgeProps = {
  status?: Proposal['colored_proposal_status']
}

const ComplaintStatusBadge = ({ status }: TimesheetProposalStatusBadgeProps) => {
  return <TimesheetProposalStatusBadge status={status} />
}

export default ComplaintStatusBadge
