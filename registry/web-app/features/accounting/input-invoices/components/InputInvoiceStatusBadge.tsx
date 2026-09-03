import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { InputInvoiceStatus as InputInvoiceStatus } from '@/constants/api-schema-aliases'

const STATUS_VARIANTS: Record<InputInvoiceStatus, ColoredValueVariant> = {
  [InputInvoiceStatus.DRAFT]: ColoredValueVariant.GREY,
  [InputInvoiceStatus.PENDING]: ColoredValueVariant.ORANGE,
  [InputInvoiceStatus.RECEIVED]: ColoredValueVariant.BLUE,
  [InputInvoiceStatus.VERIFIED]: ColoredValueVariant.BLUE,
  [InputInvoiceStatus.PAID]: ColoredValueVariant.GREEN,
  [InputInvoiceStatus.VOIDED]: ColoredValueVariant.RED,
  [InputInvoiceStatus.REJECTED]: ColoredValueVariant.RED,
  [InputInvoiceStatus.PARTIAL]: ColoredValueVariant.ORANGE,
}

type Props = {
  status: InputInvoiceStatus
  className?: string
}

export function InputInvoiceStatusBadge({ status, className }: Props) {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.INPUT_INVOICE_STATUS_CHOICES],
  })

  const statusLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.INPUT_INVOICE_STATUS_CHOICES
  ) as Record<string, string> | null

  let label = statusLabels?.[status] ?? status

  if (status === InputInvoiceStatus.PAID && label === 'Paid') {
    label = 'Đã thanh toán'
  }
  if (status === InputInvoiceStatus.PARTIAL && label.includes('{model_name}')) {
    label = 'Một phần'
  }

  const variant = STATUS_VARIANTS[status] ?? ColoredValueVariant.GREY

  return <Chip label={label} variant={variant} size="small" className={className} />
}

export default InputInvoiceStatusBadge
