import { Grid } from '@radix-ui/themes'
import { type ProposalStatutoryLeave } from '@/features/decision-and-proposal/services/proposal-misc-service'
import { formatDate } from '@/utils/date-utils.ts'
import ProposalInfoRow from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRow.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

type StatutoryLeaveProposalInfoProps = {
  proposal: ProposalStatutoryLeave
}

const StatutoryLeaveProposalInfo = ({ proposal }: StatutoryLeaveProposalInfoProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.PROPOSAL_STATUTORY_LEAVE_SHIFT_CHOICES,
      APP_CONSTANT_KEY.HRM.PROPOSAL_STATUTORY_LEAVE_REASON_TYPE_CHOICES,
    ],
  })

  const shiftLabels = keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_STATUTORY_LEAVE_SHIFT_CHOICES) as
    | Record<string, string>
    | undefined
  const reasonLabels = keysMap.get(
    APP_CONSTANT_KEY.HRM.PROPOSAL_STATUTORY_LEAVE_REASON_TYPE_CHOICES
  ) as Record<string, string> | undefined

  const startDisplay =
    proposal.statutory_leave_start_date != null
      ? formatDate(proposal.statutory_leave_start_date)
      : '-'
  const endDisplay =
    proposal.statutory_leave_end_date != null ? formatDate(proposal.statutory_leave_end_date) : '-'
  const reasonDisplay = proposal.statutory_leave_reason_type
    ? (reasonLabels?.[proposal.statutory_leave_reason_type] ?? proposal.statutory_leave_reason_type)
    : '-'
  const shiftDisplay = proposal.statutory_leave_shift
    ? (shiftLabels?.[proposal.statutory_leave_shift] ?? proposal.statutory_leave_shift)
    : '-'

  return (
    <div className="flex w-full flex-col gap-1">
      <p className="typo-body-xl-semibold text-content-dark-1">Thông tin đề xuất</p>
      <Grid columns="2" gap="5" className="w-full">
        <div className="flex flex-col">
          <ProposalInfoRow label="Mã đề xuất" value={proposal.code} />
          <ProposalInfoRow label="Ngày bắt đầu nghỉ" value={startDisplay} />
          <ProposalInfoRow label="Ngày kết thúc nghỉ" value={endDisplay} />
          <ProposalInfoRow label="Lý do" value={reasonDisplay} />
          <ProposalInfoRow label="Ghi chú nghỉ phép" value={proposal.statutory_leave_note} isLast />
        </div>
        <div className="flex flex-col pl-6">
          <ProposalInfoRow label="Buổi nghỉ" value={shiftDisplay} />
          <ProposalInfoRow label="Ghi chú" value={proposal.note} />
          <ProposalInfoRow label="Ngày tạo đề xuất" value={formatDate(proposal.created_at)} />
          <ProposalInfoRow
            label="Ngày cập nhật cuối cùng"
            value={formatDate(proposal.updated_at)}
            isLast
          />
        </div>
      </Grid>
    </div>
  )
}

export default StatutoryLeaveProposalInfo
