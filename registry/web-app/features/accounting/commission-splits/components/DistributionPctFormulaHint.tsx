import { Info } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { components } from '@/api/schema'

/** Regen 2026-07-27: type không còn export ở top level, chỉ còn trong components. */
type DistributionPctBreakdown = components['schemas']['DistributionPctBreakdown']
import { formatCurrencyVND, formatPctFloor } from '@/utils/common'

const money = (v: string | null) => (v == null ? '—' : `${formatCurrencyVND(Number(v))} ₫`)

/**
 * Một dòng "nhãn — số tiền": nhãn co giãn bên trái, số neo phải và KHÔNG được xuống dòng.
 * `tabular-nums` cho các con số thẳng cột nhau, đọc lướt được như trên phiếu tính.
 */
function AmountRow({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  /** Dòng phụ giải thích cách ra con số — chỉ ai cần mới đọc, nên để nhỏ và nhạt. */
  hint?: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-6">
        <span className="text-content-dark-2 text-[11px] whitespace-nowrap">{label}</span>
        <span className="text-content-dark-1 text-xs font-medium whitespace-nowrap tabular-nums">
          {value}
        </span>
      </div>
      {hint && <div className="text-content-dark-2 mt-0.5 text-[10px] leading-snug">{hint}</div>}
    </div>
  )
}

/**
 * Tooltip giải trình "% Thanh toán / % phân bổ phí" của worksheet — render đúng
 * công thức backend đã dùng (breakdown từ API) thay vì để con số trần.
 *
 * Trình bày theo dạng PHÉP CHIA chứ không phải đoạn văn: tử số và mẫu số là hai dòng
 * "nhãn trái — số phải", ngăn bởi một đường kẻ đóng vai trò gạch phân số, kết quả nằm dưới.
 * Bản cũ nhồi cả ba phần vào các câu văn chảy trong ô `max-w-xs` + `text-balance` nên số tiền
 * bị ngắt dòng giữa chừng và người đọc phải tự dò đâu là tử, đâu là mẫu.
 *
 * Chỉ fee_track/blended có công thức; các method khác (allocation_pct/none/mixed)
 * không render gì để tránh diễn giải sai cách số được sinh ra.
 */
export function DistributionPctFormulaHint({
  breakdown,
}: {
  breakdown?: DistributionPctBreakdown | null
}) {
  if (!breakdown) return null

  // FLOOR chứ không half-up — cùng luật với mọi ô % của màn (xem formatPctFloor). Ô này
  // trước dùng formatPct nên tooltip hiện 35% trong khi Mục 2 ngay cạnh hiện 34,99%.
  const result = breakdown.pct != null ? formatPctFloor(breakdown.pct, 2) : '—'

  // BE bổ sung method này cùng luật snap; schema.ts chưa regen nên so sánh qua String()
  // thay vì để TS bắt lỗi literal không giao nhau (xem AGENTS.md § API Schema & Typing).
  const isSnapped = String(breakdown.method) === 'fee_track_snapped'

  let eyebrow: string
  let rows: React.ReactNode

  if (breakdown.method === 'fee_track' || isSnapped) {
    eyebrow = isSnapped ? '% phân bổ phí · theo đối chiếu' : '% phân bổ phí · fee-track'
    rows = (
      <>
        <AmountRow
          label="Tiền phí thực về"
          value={money(breakdown.fee_cash)}
          hint="Đã trừ VAT và giảm trừ trong kỳ"
        />
        <AmountRow
          label="Phí phải thu của căn"
          value={money(breakdown.fee_base_net)}
          hint={`${money(breakdown.agency_fee_gross)} − ${money(breakdown.total_fee_deduction)} giảm trừ (chưa VAT)`}
        />
        {/* Kỳ đã snap thì phép chia ở trên KHÔNG còn ra đúng con số "Kết quả" (lệch dưới
            1 đồng), nên phải nói thẳng số tròn đến từ đâu — nếu không kế toán cộng tay
            lại thấy vênh và không hiểu tại sao. */}
        {isSnapped && (
          <div className="text-content-dark-2 border-border-1 border-t pt-1.5 text-[10px] leading-snug">
            Đợt đối chiếu đã thu đủ, chênh lệch dưới 1 đồng do làm tròn ⇒ lấy đúng tỷ lệ đã chốt ở
            đối chiếu.
          </div>
        )}
      </>
    )
  } else if (breakdown.method === 'blended') {
    eyebrow = '% phân bổ · blended'
    rows = (
      <>
        <AmountRow
          label="Tiền về quy net"
          value={money(breakdown.allocated_net)}
          hint="Dòng thu chưa gắn kỳ đối chiếu"
        />
        <AmountRow label="Tổng phải thu của căn" value={money(breakdown.base_amount)} />
      </>
    )
  } else {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info
          className="text-content-dark-3 hover:text-content-dark-1 inline-block h-3.5 w-3.5 cursor-help transition-colors"
          aria-label="Giải trình công thức"
        />
      </TooltipTrigger>
      {/* `text-wrap` huỷ `text-balance` mặc định của TooltipContent — với bảng số, balance đẩy
          chữ xuống dòng ở những chỗ vô nghĩa. */}
      <TooltipContent side="top" className="min-w-[248px] p-0 text-wrap">
        {/* Phân cấp bằng CỠ CHỮ và ĐỘ ĐẬM, không bằng màu nhạt dần: `content-light-*` là chữ
            sáng dành cho nền tối, còn `content-dark-3` (#8c8c8c) trên nền trắng chỉ đạt tương
            phản ~3:1 — dưới ngưỡng đọc được. Ở đây chỉ dùng 3 mức: đen cho số, #4b4b4b cho chữ
            phụ, đỏ cho kết quả. */}
        <div className="space-y-2 px-3 py-2.5">
          <div className="text-content-dark-2 text-[10px] font-semibold tracking-wider uppercase">
            {eyebrow}
          </div>
          <div className="space-y-1.5">{rows}</div>
          {/* Đường kẻ này chính là gạch chia: mọi thứ phía trên là tử/mẫu, phía dưới là kết quả. */}
          <div className="border-border-1 flex items-baseline justify-between gap-6 border-t pt-2">
            <span className="text-content-dark-2 text-[11px]">Kết quả</span>
            <span className="text-action-primary-red-default text-sm font-semibold tabular-nums">
              {result}
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
