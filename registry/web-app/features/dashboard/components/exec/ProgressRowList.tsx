import { cn } from '@/utils'
import { formatCurrencyVND, formatPct } from '@/utils/common'

/**
 * Danh sách "đạt bao nhiêu phần trăm chỉ tiêu" dạng thanh ngang.
 *
 * Tách ra vì ba khối đang vẽ y hệt nhau (chỉ tiêu khối, KPI nhân viên, KPI phòng ban) — để mỗi
 * khối tự chép thì ngưỡng màu và cách hiện "—" sẽ lệch nhau ngay lần sửa đầu tiên.
 *
 * Cố ý KHÔNG dùng recharts: recharts không vẽ gì trong jsdom nên phần hiển thị sẽ không test được,
 * còn ở đây test đọc thẳng được `112%` trên DOM.
 */

/** Ngưỡng "gần đạt". Dưới mức này là đỏ, từ 100% là xanh. */
const NEAR_THRESHOLD_PCT = 80

export type ProgressRow = {
  /** Khoá React và cũng là nhãn hiển thị. */
  name: string
  target: number
  actual: number
  /** `null` khi chưa giao chỉ tiêu — hiện "—" chứ không phải 0%. */
  completionPct: number | null
}

function toneOf(pct: number | null) {
  if (pct === null) return { bar: 'bg-border-2', text: 'text-content-dark-3' }
  if (pct >= 100) return { bar: 'bg-data-green-default', text: 'text-data-green-default' }
  if (pct >= NEAR_THRESHOLD_PCT)
    return { bar: 'bg-data-orange-default', text: 'text-data-orange-default' }
  return { bar: 'bg-action-primary-red-default', text: 'text-action-primary-red-default' }
}

function ProgressRowList({ rows }: { rows: readonly ProgressRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const tone = toneOf(row.completionPct)
        // Thanh không vượt 100% để các dòng còn so được với nhau bằng mắt; con số thật vẫn in bên
        // phải nên vượt chỉ tiêu không bị giấu đi.
        const width = Math.min(100, Math.max(0, row.completionPct ?? 0))
        return (
          <div key={row.name} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="typo-body-sm-semibold text-content-dark-1 truncate">{row.name}</span>
              <span className="typo-body-sm text-content-dark-3 shrink-0">
                {formatCurrencyVND(row.actual)} / {formatCurrencyVND(row.target)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-background-2 h-2 flex-1 overflow-hidden rounded-full">
                <div
                  className={cn('h-full rounded-full', tone.bar)}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className={cn('typo-body-sm-semibold w-[52px] shrink-0 text-right', tone.text)}>
                {row.completionPct === null ? '—' : formatPct(row.completionPct, 0)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ProgressRowList
