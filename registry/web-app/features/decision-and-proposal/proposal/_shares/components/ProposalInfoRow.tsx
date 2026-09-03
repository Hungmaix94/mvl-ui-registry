import { ReactNode } from 'react'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'

const ProposalInfoRow = ({
  label,
  value,
  isLast = false,
}: {
  label: string
  value: string | null | undefined | ReactNode
  isLast?: boolean
}) => (
  <>
    <div className="flex min-h-[59px] items-center gap-5 px-0 py-4">
      <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">{label}</p>
      {value == null || typeof value === 'string' ? (
        <p className="typo-body-lg-regular text-content-dark-1 flex-1 text-left break-all">
          {value || '-'}
        </p>
      ) : (
        value
      )}
    </div>
    {!isLast && <SeparatorHorizontal />}
  </>
)
export default ProposalInfoRow
