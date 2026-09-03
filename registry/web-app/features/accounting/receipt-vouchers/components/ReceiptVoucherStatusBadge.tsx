import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import { ReceiptVoucherStatus } from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

const STATUS_VARIANTS: Record<ReceiptVoucherStatus, ColoredValueVariant> = {
  [ReceiptVoucherStatus.DRAFT]: ColoredValueVariant.GREY,
  [ReceiptVoucherStatus.POSTED]: ColoredValueVariant.GREEN,
  [ReceiptVoucherStatus.CANCELLED]: ColoredValueVariant.RED,
}


type Props = {
  status: ReceiptVoucherStatus
  className?: string
}

export function ReceiptVoucherStatusBadge({ status, className }: Props) {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_STATUS_CHOICES],
  })

  const statusLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_STATUS_CHOICES
  ) as Record<string, string> | null

  let label = statusLabels?.[status] ?? status

  if (status === ReceiptVoucherStatus.POSTED && label === 'Posted') {
    label = 'Đã ghi sổ'
  }

  const variant = STATUS_VARIANTS[status] ?? ColoredValueVariant.GREY

  return <Chip label={label} variant={variant} size="small" className={className} />
}

export default ReceiptVoucherStatusBadge
