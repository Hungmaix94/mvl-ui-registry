import { useMemo } from 'react'
import { Grid } from '@radix-ui/themes'
import { type ProposalDeviceChange } from '@/features/decision-and-proposal/services/proposal-misc-service'
import ProposalInfoRow from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRow.tsx'
import { formatDate } from '@/utils/date-utils'

type DeviceChangeProposalInfoProps = {
  proposal: ProposalDeviceChange
}

const DeviceChangeProposalInfo = ({ proposal }: DeviceChangeProposalInfoProps) => {
  // Map platform enum to display labels
  const platformMapping: Record<string, string> = {
    ios: 'iOS',
    android: 'Android',
    web: 'Web',
  }

  const newPlatformDisplay = useMemo(() => {
    return proposal.device_change_new_platform
      ? platformMapping[proposal.device_change_new_platform] || proposal.device_change_new_platform
      : '-'
  }, [proposal.device_change_new_platform])

  return (
    <div className="flex w-full flex-col gap-5">
      <p className="typo-body-xl-semibold text-content-dark-1">Thông tin đề xuất</p>

      {/* Device information */}
      <Grid columns="2" gap="5" className="w-full">
        <div className="flex flex-col">
          <ProposalInfoRow label="Mã đề xuất" value={proposal.code} />
          {/*<ProposalInfoRowStatus status={proposal.colored_proposal_status} />*/}
          <ProposalInfoRow
            label="Thiết bị cũ (Device ID)"
            value={proposal.device_change_old_device_id || '-'}
          />
          <ProposalInfoRow
            label="Thiết bị mới (Device ID)"
            value={proposal.device_change_new_device_id || '-'}
          />
          <ProposalInfoRow label="Lý do" value={proposal.note || '-'} isLast />
        </div>
        <div className="flex flex-col pl-6">
          <ProposalInfoRow
            label="Ngày tạo đề xuất"
            value={proposal.created_at ? formatDate(proposal.created_at) : null}
          />
          <ProposalInfoRow
            label="Ngày cập nhật cuối cùng"
            value={proposal.updated_at ? formatDate(proposal.updated_at) : null}
          />
          <ProposalInfoRow label="Nền tảng mới" value={newPlatformDisplay} isLast />
        </div>
      </Grid>
    </div>
  )
}

export default DeviceChangeProposalInfo
