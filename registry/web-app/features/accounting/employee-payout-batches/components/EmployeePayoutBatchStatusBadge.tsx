import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { formatPayoutBatchStatus } from '@/features/accounting/employee-payout-batches/constants'
import { EmployeePayoutBatchStatus as EmployeeCommissionPayoutBatchStatus } from '@/constants/api-schema-aliases'

const STATUS_VARIANTS: Record<EmployeeCommissionPayoutBatchStatus, ColoredValueVariant> = {
  [EmployeeCommissionPayoutBatchStatus.DRAFT]: ColoredValueVariant.GREY,
  [EmployeeCommissionPayoutBatchStatus.CONFIRMED]: ColoredValueVariant.BLUE,
  [EmployeeCommissionPayoutBatchStatus.SENT_TO_BANK]: ColoredValueVariant.ORANGE,
  [EmployeeCommissionPayoutBatchStatus.PAID]: ColoredValueVariant.GREEN,
  [EmployeeCommissionPayoutBatchStatus.CANCELLED]: ColoredValueVariant.RED,
}

type Props = {
  status: EmployeeCommissionPayoutBatchStatus
  className?: string
}

export function EmployeePayoutBatchStatusBadge({ status, className }: Props) {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.EMPLOYEE_COMMISSION_PAYOUT_BATCH_STATUS_CHOICES],
  })

  const statusLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.EMPLOYEE_COMMISSION_PAYOUT_BATCH_STATUS_CHOICES
  ) as Record<string, string> | null

  const label = formatPayoutBatchStatus(status, statusLabels)

  const variant = STATUS_VARIANTS[status] ?? ColoredValueVariant.GREY

  return <Chip label={label} variant={variant} size="small" className={className} />
}

export default EmployeePayoutBatchStatusBadge
