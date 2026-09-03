import { Flex } from '@radix-ui/themes'

import { formatCurrencyVND } from '@/utils/common'
import { cn } from '@/utils'

function vnd(value: string | number | null | undefined): string {
  return `${formatCurrencyVND(Number(value || 0), { maximumFractionDigits: 0 })} đ`
}

function Card({
  label,
  value,
  hint,
  highlight,
}: {
  label: string
  value: string
  hint?: string
  highlight?: boolean
}) {
  return (
    <Flex direction="column" gap="1" className="bg-background-2 min-w-0 rounded-md px-4 py-3">
      <span className="typo-body-xs-regular text-content-dark-3">{label}</span>
      <span
        className={cn(
          'typo-body-lg-semibold truncate',
          highlight ? 'text-data-red-default' : 'text-content-dark-1'
        )}
      >
        {value}
      </span>
      {hint ? <span className="typo-body-xs-regular text-content-dark-3">{hint}</span> : null}
    </Flex>
  )
}

export interface InvestorAdvanceSummaryCardsProps {
  depositedTotal: string | number | null | undefined
  investorBalance: string | number | null | undefined
  unappliedDrawn: string | number | null | undefined
  balance: string | number | null | undefined
}

/**
 * Bốn con số của quỹ tạm ứng CĐT — hai trục độc lập.
 *
 * Trục TIỀN MẶT ("Số dư quỹ") giảm khi chi tạm ứng từ quỹ. Trục CÔNG NỢ ("Số dư tạm ứng CĐT")
 * giảm khi một dòng đối chiếu khai đã tạm ứng. Hai trục KHÔNG tự khớp nhau: chi 10M rồi mà
 * chưa đối chiếu nào ghi nhận thì tiền mặt đã giảm còn công nợ vẫn nguyên.
 *
 * "Chưa đối chiếu ghi nhận" là hiệu hai trục — số kế toán cần soi để đối soát. Âm là hợp lệ:
 * CĐT có thể ghi nhận cả khoản MV ứng bằng tiền của chính mình.
 */
function InvestorAdvanceSummaryCards({
  depositedTotal,
  investorBalance,
  unappliedDrawn,
  balance,
}: InvestorAdvanceSummaryCardsProps) {
  const pending = Number(unappliedDrawn || 0)
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card label="Tổng tiền quỹ" value={vnd(depositedTotal)} hint="CĐT đã nạp" />
      <Card label="Số dư quỹ" value={vnd(balance)} hint="Tiền mặt còn lại" />
      <Card label="Số dư tạm ứng CĐT" value={vnd(investorBalance)} hint="MV đang giữ của CĐT" />
      <Card
        label="Chưa đối chiếu ghi nhận"
        value={vnd(unappliedDrawn)}
        hint={pending > 0 ? 'Đã chi nhưng chưa cấn trừ' : 'Đã đối soát xong'}
        highlight={pending > 0}
      />
    </div>
  )
}

export default InvestorAdvanceSummaryCards
