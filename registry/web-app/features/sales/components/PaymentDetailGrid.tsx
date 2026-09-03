import { DisplayField } from '@/components/commons/DisplayField'
import { formatCurrencyVND } from '@/utils/common'
import { DepositContractPaymentMethod } from '@/constants/api-schema-aliases'

export type SharedPaymentData = {
  payment_amount?: number | string | null
  amount_label?: string // e.g. "Số tiền cọc", "Số tiền giữ chỗ"
  booking_date?: string | null
  date_label?: string // e.g. "Ngày đặt chỗ thiện chí", "Ngày ký hợp đồng"
  payment_method?: string | null // e.g. "Tiền mặt", "Chuyển khoản"
  payment_method_value?: string | null // enum value for logical checks
  transfer_to_account_label?: string | null
  source_account_holder_name?: string | null
  source_account_number?: string | null
  source_bank_name?: string | null
}

type Props = {
  paymentData: SharedPaymentData
}

export const PaymentDetailGrid = ({ paymentData }: Props) => {
  const formattedAmount = paymentData.payment_amount
    ? `${formatCurrencyVND(Number(paymentData.payment_amount))} ₫`
    : '-'

  const isTransfer = paymentData.payment_method_value === DepositContractPaymentMethod.transfer

  return (
    <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
      {/* Basic Payment Info */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DisplayField label={paymentData.amount_label || 'Số tiền'} value={formattedAmount} />
        {paymentData.date_label && (
          <DisplayField label={paymentData.date_label} value={paymentData.booking_date || '-'} />
        )}
        <DisplayField label="Hình thức" value={paymentData.payment_method || '-'} />
        {/* Nơi nhận tiền có với cả tiền mặt, nên nằm ngoài khối chuyển khoản bên dưới
            (khối đó là tài khoản khách chuyển ĐI, thứ chỉ tồn tại khi chuyển khoản). */}
        <DisplayField label="Nguồn tiền" value={paymentData.transfer_to_account_label || '-'} />
      </div>

      {isTransfer && (
        <div className="mt-6 grid grid-cols-1 gap-6 pt-6 md:grid-cols-2 lg:grid-cols-4">
          <DisplayField
            label="Số tài khoản nguồn"
            value={paymentData.source_account_number || '-'}
          />
          <DisplayField
            label="Tên tài khoản nguồn"
            value={paymentData.source_account_holder_name || '-'}
          />
          <DisplayField label="Mở tài khoản tại" value={paymentData.source_bank_name || '-'} />
        </div>
      )}
    </div>
  )
}
