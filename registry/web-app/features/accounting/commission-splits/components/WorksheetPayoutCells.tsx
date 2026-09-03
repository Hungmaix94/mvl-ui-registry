/**
 * Ô của cụm cột "trả sale" trên bảng worksheet kỳ — dùng CHUNG cho hai màn "Chia HH theo tháng"
 * và "Giao dịch tiền về đợt này" (CR STT17 `86eydbph4`).
 *
 * Hai màn phải hiện y hệt nhau. Copy renderer sang cả hai file bảng là đúng cách chúng trôi khỏi
 * nhau lần trước, nên phần có logic (dash khi null, suy % thưởng từ tiền) chỉ được viết ở đây.
 */
import type { components } from '@/api/schema'
import { formatCurrencyVND, formatPct } from '@/utils/common'

type WorksheetRow = components['schemas']['DealPeriodWorksheetListRow']
type WorksheetTotals = components['schemas']['PaginatedDealPeriodWorksheetListRowList']['totals']

const EmptyCell = () => <span className="text-xs text-neutral-400">—</span>

/**
 * Dial "% TT" đã ghim. `null` = kỳ chưa ghim gì → gạch ngang, KHÔNG hiện `0%` (kế toán đọc `0%`
 * là "đã chốt, không trả đồng nào").
 */
export const ProgressPctCell = ({ value }: { value?: string | null }) => {
  if (value == null) return <EmptyCell />
  return <span className="font-semibold text-neutral-900">{formatPct(Number(value), 2)}</span>
}

/**
 * "% TT Thưởng" — số DẪN XUẤT từ đối chiếu (E3), server ghi. Kỳ chưa ghi gì mà VẪN có tiền
 * thưởng thì suy ngược từ tiền: cột này từng hiện "—" trên đúng những kỳ đang chia thưởng.
 */
export const BonusProgressPctCell = ({ row }: { row: WorksheetRow }) => {
  if (row.bonus_progress_pct != null) {
    return (
      <span className="font-semibold text-neutral-900">
        {formatPct(Number(row.bonus_progress_pct), 2)}
      </span>
    )
  }

  const bonusMoney = Number(row.sales_bonus || 0)
  const bonusBase = Number(row.bonus || 0)
  if (bonusMoney > 0 && bonusBase > 0) {
    return (
      <span className="font-semibold text-neutral-900" title="Suy từ tiền thưởng đã chia của kỳ.">
        {formatPct((bonusMoney / bonusBase) * 100, 2)}
      </span>
    )
  }

  return <EmptyCell />
}

/** Ô tiền in đậm — dùng cho "Tổng trả sale" ở cả ô dữ liệu lẫn dòng TỔNG CỘNG. */
export const EmphasisMoneyCell = ({ children }: { children: React.ReactNode }) => (
  <span className="font-semibold text-neutral-900">{children}</span>
)

export const formatPayoutMoney = (value?: string | null) => formatCurrencyVND(Number(value || 0))

/**
 * Đọc khoá tiền mà `totals` của API CHƯA có (`sales_fee_amount`, `sales_bonus`).
 *
 * Schema `totals` chỉ gồm `list_price`/`basis`/`fee_amount`/`bonus`/`total`/`received`/
 * `received_net`/`total_sales_payout`, nên hai ô này ở dòng TỔNG CỘNG hiện `—` trên CẢ HAI màn.
 * Ép kiểu tại chỗ đọc thay vì bịa field vào type dùng chung; BE bổ sung là tự có số.
 */
export function optionalWorksheetTotal(
  totals: WorksheetTotals,
  key: 'sales_fee_amount' | 'sales_bonus'
): string | undefined {
  return (totals as unknown as Record<string, string | undefined> | null | undefined)?.[key]
}
