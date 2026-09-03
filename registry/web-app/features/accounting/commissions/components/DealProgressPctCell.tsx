import { formatNumber } from '@/utils/common'

type Props = {
  /** Tỷ lệ đã nhân 100 (33.33 = 33,33%), hoặc null khi BE không có số. */
  pct: number | null
  /** Màu thanh tiến độ — hai cột đặt cạnh nhau nên phải phân biệt được bằng mắt. */
  barClassName?: string
}

/**
 * Một ô "% tiền về" — thanh tiến độ + số.
 *
 * Dùng chung cho HAI cột nằm cạnh nhau (`payment_progress_pct` và `dial_fee_progress_pct`),
 * xem [[getDealPaymentProgressPct]]: hai tỷ lệ khác nhau của cùng một deal, không suy ra
 * nhau được, nên màn hình in cả hai chứ không chọn một.
 *
 * `null` hiện `—`. **Không** rơi về 100%: cột này từng hiển thị 100,00% cho mọi deal suốt
 * một thời gian dài vì màn đọc `deal.payout_ratio ?? 1.0` trong khi field đó không tồn tại.
 * `0` là số thật (kỳ chưa có phiếu thu) và vẫn vẽ thanh rỗng.
 */
export const DealProgressPctCell = ({ pct, barClassName = 'bg-blue-500' }: Props) => {
  if (pct === null) {
    return <span className="text-[13px] text-neutral-400">—</span>
  }
  return (
    <div className="flex items-center justify-end gap-1.5">
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-neutral-200">
        <div
          className={`h-full ${barClassName}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="min-w-[46px] text-[13px] text-neutral-600">
        {formatNumber(pct, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
      </span>
    </div>
  )
}

export default DealProgressPctCell
