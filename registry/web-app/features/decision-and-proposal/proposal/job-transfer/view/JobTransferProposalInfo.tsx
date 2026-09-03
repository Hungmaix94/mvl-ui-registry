import { useMemo } from 'react'
import { Grid } from '@radix-ui/themes'
import { type ProposalJobTransfer } from '@/features/decision-and-proposal/services/proposal-misc-service'
// import ProposalInfoRowStatus from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRowStatus.tsx'
import ProposalInfoRow from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRow.tsx'
import { formatDate } from '@/utils/date-utils.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'

type JobTransferProposalInfoProps = {
  proposal: ProposalJobTransfer
}

const JobTransferProposalInfo = ({ proposal }: JobTransferProposalInfoProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_JOB_TRANSFER_TRANSFER_STATUS_CHOICES],
  })
  const transferStatusLabels = useMemo(() => {
    const raw = keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_JOB_TRANSFER_TRANSFER_STATUS_CHOICES)
    return raw && typeof raw === 'object' ? raw : {}
  }, [keysMap])

  return (
    <div className="flex w-full flex-col gap-1">
      <p className="typo-body-xl-semibold text-content-dark-1">Thông tin đề xuất</p>
      <Grid columns="2" gap="5" className="w-full">
        <div className="flex flex-col">
          <ProposalInfoRow label="Mã đề xuất" value={proposal.code} />
          {/*<ProposalInfoRowStatus status={proposal.colored_proposal_status} />*/}
          <ProposalInfoRow label="Chi nhánh mới" value={proposal.job_transfer_new_branch?.name} />
          <ProposalInfoRow label="Khối mới" value={proposal.job_transfer_new_block?.name} />
          <ProposalInfoRow
            label="Phòng ban mới"
            value={proposal.job_transfer_new_department?.name}
          />
          <ProposalInfoRow label="Chức vụ mới" value={proposal.job_transfer_new_position?.name} />
          <ProposalInfoRow label="Lý do điều chuyển" value={proposal.job_transfer_reason} />
          <ProposalInfoRow label="Ghi chú" value={proposal.note} isLast />
        </div>
        <div className="flex flex-col pl-6">
          <ProposalInfoRow
            label="Trạng thái điều chuyển"
            value={
              transferStatusLabels[proposal.job_transfer_transfer_status] ||
              proposal.job_transfer_transfer_status
            }
          />

          <ProposalInfoRow label="Chi nhánh cũ" value={proposal.job_transfer_old_branch?.name} />
          <ProposalInfoRow label="Khối cũ" value={proposal.job_transfer_old_block?.name} />
          <ProposalInfoRow
            label="Phòng ban cũ"
            value={proposal.job_transfer_old_department?.name}
          />
          <ProposalInfoRow label="Chức vụ cũ" value={proposal.job_transfer_old_position?.name} />

          <ProposalInfoRow
            label="Ngày hiệu lực"
            value={formatDate(proposal.job_transfer_effective_date)}
          />
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

export default JobTransferProposalInfo
