import { Grid } from '@radix-ui/themes'
import { type ProposalReturnToWork } from '@/features/decision-and-proposal/services/proposal-misc-service'
import { formatDate } from '@/utils/date-utils.ts'
import ProposalInfoRow from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRow.tsx'

type ReturnToWorkProposalInfoProps = {
  proposal: ProposalReturnToWork
}

const ReturnToWorkProposalInfo = ({ proposal }: ReturnToWorkProposalInfoProps) => {
  const returnToWorkDateDisplay =
    proposal.return_to_work_date != null ? formatDate(proposal.return_to_work_date) : '-'

  return (
    <div className="flex w-full flex-col gap-1">
      <p className="typo-body-xl-semibold text-content-dark-1">Thông tin đề xuất</p>
      <Grid columns="2" gap="5" className="w-full">
        <div className="flex flex-col">
          <ProposalInfoRow label="Mã đề xuất" value={proposal.code} />
          <ProposalInfoRow label="Ngày quay lại làm việc" value={returnToWorkDateDisplay} />
          <ProposalInfoRow label="Ghi chú" value={proposal.note} isLast />
        </div>
        <div className="flex flex-col pl-6">
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

export default ReturnToWorkProposalInfo
