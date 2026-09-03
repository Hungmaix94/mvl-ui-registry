import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { SalesInvoiceStatus as SalesInvoiceStatus } from '@/constants/api-schema-aliases'

const STATUS_VARIANTS: Record<SalesInvoiceStatus, ColoredValueVariant> = {
  [SalesInvoiceStatus.DRAFT]: ColoredValueVariant.GREY,
  [SalesInvoiceStatus.ISSUED]: ColoredValueVariant.BLUE,
  [SalesInvoiceStatus.PAID]: ColoredValueVariant.GREEN,
  [SalesInvoiceStatus.ADJUSTED]: ColoredValueVariant.PURPLE,
  [SalesInvoiceStatus.CANCELLED]: ColoredValueVariant.RED,
  [SalesInvoiceStatus.VOIDED]: ColoredValueVariant.RED,
  [SalesInvoiceStatus.PENDING]: ColoredValueVariant.ORANGE,
  [SalesInvoiceStatus.PARTIAL]: ColoredValueVariant.ORANGE,
}

type Props = {
  status: SalesInvoiceStatus
  className?: string
}

export function SalesInvoiceStatusBadge({ status, className }: Props) {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.SALES_INVOICE_STATUS_CHOICES],
  })

  const statusLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.SALES_INVOICE_STATUS_CHOICES
  ) as Record<string, string> | null

  let label = statusLabels?.[status] ?? status

  if (status === SalesInvoiceStatus.PAID && label === 'Paid') {
    label = 'Đã thanh toán'
  }

  const variant = STATUS_VARIANTS[status] ?? ColoredValueVariant.GREY

  return <Chip label={label} variant={variant} size="small" className={className} />
}

export default SalesInvoiceStatusBadge
