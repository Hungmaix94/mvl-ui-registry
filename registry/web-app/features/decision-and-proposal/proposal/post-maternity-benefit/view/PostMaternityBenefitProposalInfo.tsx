import { Grid } from '@radix-ui/themes'
import { type ProposalPostMaternityBenefits } from '@/features/decision-and-proposal/services/proposal-leave-service'
import { useMemo } from 'react'
// import ProposalInfoRowStatus from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRowStatus.tsx'
import { formatDate } from '@/utils/date-utils.ts'
import ProposalInfoRow from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRow.tsx'

type PostMaternityBenefitProposalInfoProps = {
  proposal: ProposalPostMaternityBenefits
}

const PostMaternityBenefitProposalInfo = ({ proposal }: PostMaternityBenefitProposalInfoProps) => {
  const formatDateRange = useMemo(() => {
    if (proposal.post_maternity_benefits_start_date && proposal.post_maternity_benefits_end_date) {
      return `${formatDate(proposal.post_maternity_benefits_start_date)} - ${formatDate(proposal.post_maternity_benefits_end_date)}`
    }
    if (proposal.post_maternity_benefits_start_date) {
      return formatDate(proposal.post_maternity_benefits_start_date)
    }
    return '-'
  }, [proposal.post_maternity_benefits_start_date, proposal.post_maternity_benefits_end_date])

  return (
    <div className="flex w-full flex-col gap-1">
      <p className="typo-body-xl-semibold text-content-dark-1">Thông tin đề xuất</p>
      <Grid columns="2" gap="5" className="w-full">
        <div className="flex flex-col">
          <ProposalInfoRow label="Mã đề xuất" value={proposal.code} />
          {/*<ProposalInfoRowStatus status={proposal.colored_proposal_status} />*/}
          <ProposalInfoRow label="Ngày bắt đầu - kết thúc" value={formatDateRange} />
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

export default PostMaternityBenefitProposalInfo
