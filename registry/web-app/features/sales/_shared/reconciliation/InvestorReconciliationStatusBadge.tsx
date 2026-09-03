import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { ReconciliationStatus } from '@/constants/api-schema-aliases'

const STATUS_VARIANTS: Partial<Record<ReconciliationStatus, ColoredValueVariant>> = {
  [ReconciliationStatus.draft]: ColoredValueVariant.GREY,
  [ReconciliationStatus.pending]: ColoredValueVariant.YELLOW,
  [ReconciliationStatus.confirmed]: ColoredValueVariant.GREEN,
  [ReconciliationStatus.voided]: ColoredValueVariant.RED,
}

type Props = {
  status: ReconciliationStatus
  className?: string
}

export function InvestorReconciliationStatusBadge({ status, className }: Props) {
  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.STATUS_CHOICES],
  })

  const labelMap = keysMap.get(
    APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.STATUS_CHOICES
  ) as Record<string, string> | undefined

  if (!status) return null

  const label = labelMap?.[status] ?? status
  const variant = STATUS_VARIANTS[status] ?? ColoredValueVariant.GREY

  return <Chip label={label} variant={variant} size="small" className={className} />
}

export default InvestorReconciliationStatusBadge
