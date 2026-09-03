import { useMemo } from 'react'
import { Grid, Separator } from '@radix-ui/themes'
import { type ProposalLateExemption } from '@/features/decision-and-proposal/services/proposal-misc-service'
import ProposalInfoRow from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRow.tsx'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection.tsx'
import { formatDate, formatDateRangeText } from '@/utils/date-utils.ts'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

type LateExemptionProposalInfoProps = {
  proposal: ProposalLateExemption
}

const LateExemptionProposalInfo = ({ proposal }: LateExemptionProposalInfoProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.LATE_EXEMPTION_DURATION_TYPE],
  })
  const durationTypeLabel = useMemo(() => {
    const mapping = keysMap.get(APP_CONSTANT_KEY.HRM.LATE_EXEMPTION_DURATION_TYPE) as
      | Record<string, string>
      | undefined
    const typeVal = proposal.late_exemption_duration_type
    return typeVal && mapping?.[typeVal] ? mapping[typeVal] : (typeVal ?? '-')
  }, [keysMap, proposal.late_exemption_duration_type])

  const formatDateRange = () => {
    return formatDateRangeText(
      proposal.late_exemption_start_date || undefined,
      proposal.late_exemption_end_date || undefined
    )
  }

  const formatMinutesPerDay = () => {
    if (!proposal.late_exemption_minutes) return '-'
    return `${proposal.late_exemption_minutes} phút/ngày`
  }

  const attachments = useMemo(
    () =>
      (proposal.attachments ?? []).map((file) => ({
        id: file.id,
        file_name: file.file_name,
        file_path: file.file_path,
        size: file.size,
        download_url: file.download_url,
        view_url: file.view_url,
      })),
    [proposal.attachments]
  )

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-full flex-col gap-1">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin đề xuất</p>
        <Grid columns="2" gap="5" className="w-full">
          <div className="flex flex-col">
            <ProposalInfoRow label="Mã đề xuất" value={proposal.code} />
            {/*<ProposalInfoRowStatus status={proposal.colored_proposal_status} />*/}
            <ProposalInfoRow label="Loại miễn trừ trễ" value={durationTypeLabel} />
            <ProposalInfoRow label="Ngày bắt đầu - kết thúc" value={formatDateRange()} />
            <ProposalInfoRow label="Ghi chú" value={proposal.note} isLast />
          </div>
          <div className="flex flex-col pl-6">
            <ProposalInfoRow label="Ngày tạo đề xuất" value={formatDate(proposal.created_at)} />
            <ProposalInfoRow
              label="Ngày cập nhật cuối cùng"
              value={formatDate(proposal.updated_at)}
            />
            <ProposalInfoRow label="Số phút được trễ" value={formatMinutesPerDay()} isLast />
          </div>
        </Grid>
      </div>

      <Separator orientation="horizontal" className="!w-full" />

      <AttachmentSection attachments={attachments} isRequired={false} />
    </div>
  )
}

export default LateExemptionProposalInfo
