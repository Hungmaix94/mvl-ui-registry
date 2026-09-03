import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { DealPeriodAllocationStatus as DealPeriodAllocationStatus } from '@/constants/api-schema-aliases'

const STATUS_VARIANTS: Record<DealPeriodAllocationStatus, ColoredValueVariant> = {
  [DealPeriodAllocationStatus.DRAFT]: ColoredValueVariant.ORANGE,
  [DealPeriodAllocationStatus.APPROVED]: ColoredValueVariant.GREEN,
  [DealPeriodAllocationStatus.LOCKED]: ColoredValueVariant.BLUE,
  [DealPeriodAllocationStatus.VOIDED]: ColoredValueVariant.RED,
}

type Props = {
  status: DealPeriodAllocationStatus
  className?: string
}

export function DealPeriodAllocationStatusBadge({ status, className }: Props) {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.DEAL_PERIOD_ALLOCATION_STATUS_CHOICES],
  })

  const statusLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.DEAL_PERIOD_ALLOCATION_STATUS_CHOICES
  ) as Record<string, string> | null

  const normalizedStatus = (status || '').toUpperCase() as DealPeriodAllocationStatus

  let label = statusLabels?.[normalizedStatus] ?? statusLabels?.[status] ?? status

  if (normalizedStatus === DealPeriodAllocationStatus.DRAFT) {
    label = 'Chờ duyệt'
  }

  const variant = STATUS_VARIANTS[normalizedStatus] ?? ColoredValueVariant.GREY

  return <Chip label={label} variant={variant} size="small" className={className} />
}

export default DealPeriodAllocationStatusBadge
