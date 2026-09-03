import { Grid } from '@radix-ui/themes'
import { type Employee } from '@/features/employee/services/employee-service'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'

type ProposalProposerInfoProps = {
  proposer: Employee | null | undefined
}

const ProposalProposerInfo = ({ proposer }: ProposalProposerInfoProps) => {
  const InfoRow = ({
    label,
    value,
    isLast = false,
  }: {
    label: string
    value: string | null | undefined
    isLast?: boolean
  }) => (
    <>
      <div className="flex h-[59px] items-center gap-5 px-0 py-4">
        <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">{label}</p>
        <p className="typo-body-lg-regular text-content-dark-1 flex-1 text-left">{value || '-'}</p>
      </div>
      {!isLast && <SeparatorHorizontal />}
    </>
  )

  if (!proposer) {
    return (
      <div className="flex w-full flex-col gap-1">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin người đề xuất</p>
        <div className="flex w-full items-center justify-center py-8">
          <span className="text-content-dark-3">Không có thông tin</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <p className="typo-body-xl-semibold text-content-dark-1">Thông tin người đề xuất</p>
      <Grid columns="2" gap="5" className="w-full">
        <div className="flex flex-col">
          <InfoRow label="Người đề xuất" value={proposer.fullname} />
          <InfoRow label="Mã nhân viên" value={proposer.code} />
          <InfoRow label="Chức vụ" value={proposer.position?.name} isLast />
        </div>
        <div className="flex flex-col pl-6">
          <InfoRow label="Chi nhánh" value={proposer.branch?.name} />
          <InfoRow label="Khối" value={proposer.block?.name} />
          <InfoRow label="Phòng ban" value={proposer.department?.name} isLast />
        </div>
      </Grid>
    </div>
  )
}

export default ProposalProposerInfo
