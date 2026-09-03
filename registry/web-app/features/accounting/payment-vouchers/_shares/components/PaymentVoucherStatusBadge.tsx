import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import useAppConstant from '@/hooks/useAppConstant'
import {
  PAYMENT_VOUCHER_CONSTANT_KEYS,
  PAYMENT_VOUCHER_CONSTANT_MODULE,
  PAYMENT_VOUCHER_STATUS_VARIANT,
  PaymentVoucherStatus,
  type PaymentVoucherStatusType,
} from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants.ts'

type Props = {
  status: PaymentVoucherStatusType
  className?: string
}

export function PaymentVoucherStatusBadge({ status, className }: Props) {
  const { keysMap } = useAppConstant({
    module: PAYMENT_VOUCHER_CONSTANT_MODULE,
    keys: [PAYMENT_VOUCHER_CONSTANT_KEYS.STATUS],
  })

  const statusLabels = keysMap.get(PAYMENT_VOUCHER_CONSTANT_KEYS.STATUS) as Record<
    string,
    string
  > | null

  let label = statusLabels?.[status] ?? status

  if (status === PaymentVoucherStatus.POSTED && label === 'Posted') {
    label = 'Đã ghi sổ'
  }

  const variant = PAYMENT_VOUCHER_STATUS_VARIANT[status] ?? ColoredValueVariant.GREY

  return <Chip label={label} variant={variant} size="small" className={className} />
}

export default PaymentVoucherStatusBadge
