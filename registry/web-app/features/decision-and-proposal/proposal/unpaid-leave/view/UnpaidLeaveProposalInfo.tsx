import { Grid } from '@radix-ui/themes'
import { type ProposalUnpaidLeave } from '@/features/decision-and-proposal/services/proposal-leave-service'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useMemo } from 'react'
import ProposalInfoRow from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRow.tsx'
// import ProposalInfoRowStatus from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRowStatus.tsx'
import { formatDate } from '@/utils/date-utils.ts'

type UnpaidLeaveProposalInfoProps = {
  proposal: ProposalUnpaidLeave
}

const UnpaidLeaveProposalInfo = ({ proposal }: UnpaidLeaveProposalInfoProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_PAID_LEAVE_SHIFT_CHOICES],
  })

  const shiftMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_PAID_LEAVE_SHIFT_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_PAID_LEAVE_SHIFT_CHOICES) as Record<
          string,
          string
        >) || {}
      : {}
  }, [keysMap])

  const formatDateRange = () => {
    if (proposal.unpaid_leave_start_date && proposal.unpaid_leave_end_date) {
      return `${format(new Date(proposal.unpaid_leave_start_date), DATE_FORMAT)} - ${format(new Date(proposal.unpaid_leave_end_date), DATE_FORMAT)}`
    }
    if (proposal.unpaid_leave_start_date) {
      return format(new Date(proposal.unpaid_leave_start_date), DATE_FORMAT)
    }
    return '-'
  }

  const formatShift = () => {
    if (!proposal.unpaid_leave_shift) return '-'
    return shiftMapping[proposal.unpaid_leave_shift] || proposal.unpaid_leave_shift
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <p className="typo-body-xl-semibold text-content-dark-1">Thông tin đề xuất</p>
      <Grid columns="2" gap="5" className="w-full">
        <div className="flex flex-col">
          <ProposalInfoRow label="Mã đề xuất" value={proposal.code} />
          {/*<ProposalInfoRowStatus status={proposal.colored_proposal_status} />*/}
          <ProposalInfoRow label="Ngày bắt đầu - kết thúc" value={formatDateRange()} />
          <ProposalInfoRow label="Lý do" value={proposal.unpaid_leave_reason} isLast />
          {/*<ProposalInfoRow label="Ghi chú" value={proposal.note} isLast />*/}
        </div>
        <div className="flex flex-col pl-6">
          <ProposalInfoRow label="Buổi" value={formatShift()} />
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

export default UnpaidLeaveProposalInfo
