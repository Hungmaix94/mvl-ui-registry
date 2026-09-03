import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

const COMMISSION_PCT_TYPES = APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES

/**
 * Cột "Phí HH trả sale" (tên cũ: "HH cơ bản") của section 5 — Phân chia HH.
 *
 * CR 86eymaa3v thêm "Tổng phí hoa hồng trả sale" vào dòng Tổng của section này. Tổng đó
 * BẮT BUỘC bằng tổng những gì các dòng đang hiển thị, nên logic chọn khoá base ở đây được
 * tách riêng và dùng CHUNG cho cả ô của từng dòng lẫn dòng Tổng. Để mỗi bên tự suy lại là
 * cách chắc chắn nhất khiến chúng trôi khỏi nhau sau vài lần sửa.
 *
 * Backend cộng đúng tập này (`BASE_SPLIT_PCT_TYPES` = `pct_sale_commission` +
 * `pct_f2_commission`) cho cột `total_sales_fee_pct` ở màn danh sách, nên ba chỗ — ô,
 * dòng Tổng, cột ngoài danh sách — cùng một con số.
 */

/** Một share của section split, đọc theo đúng shape BE trả về (`details` keyed theo pct_type). */
export type SplitShareLike = {
  details?: Record<string, unknown> | null
  recipient_kind?: string | null
  /** Bản thân tham chiếu sàn — xem `isF2Share` để biết vì sao nó cũng là tín hiệu kênh. */
  exchange?: { id?: number | string | null } | null
} | null

type CommissionRecord = {
  percentage?: string | number | null
  rate?: string | number | null
  actual_rate_percentage?: string | number | null
  fixed_amount?: string | number | null
  calculated_amount?: string | number | null
  is_custom_override?: boolean
}

const F2_KEYS = [
  COMMISSION_PCT_TYPES.F2_SALE.pct,
  COMMISSION_PCT_TYPES.F2_SALE.amt,
  COMMISSION_PCT_TYPES.F2_BONUS.pct,
  COMMISSION_PCT_TYPES.F2_BONUS.amt,
  COMMISSION_PCT_TYPES.F2_MV_BONUS.pct,
  COMMISSION_PCT_TYPES.F2_MV_BONUS.amt,
]

const F1_KEYS = [
  COMMISSION_PCT_TYPES.F1_SALE.pct,
  COMMISSION_PCT_TYPES.F1_SALE.amt,
  COMMISSION_PCT_TYPES.F1_BONUS.pct,
  COMMISSION_PCT_TYPES.F1_BONUS.amt,
  COMMISSION_PCT_TYPES.F1_INVESTOR_BONUS.pct,
  COMMISSION_PCT_TYPES.F1_INVESTOR_BONUS.amt,
]

/**
 * Share này thuộc kênh F2 hay F1.
 *
 * Ưu tiên khoá thực sự có trong `details` trước, chỉ khi không có khoá nào mới xét tới
 * người nhận — một sàn liên kết vẫn có thể được trả hoa hồng qua kênh F1.
 *
 * Nhánh cuối nhận diện "là sàn" theo ĐÚNG cách `getRecipientIdentity` làm: bất kỳ share
 * nào mang tham chiếu `exchange` đều ra kind `'exchange'` ở đó, kể cả khi `recipient_kind`
 * là `f1_exchange` hay rỗng. Nếu ở đây chỉ so `recipient_kind` thì ô của từng dòng (đi qua
 * `getRecipientIdentity`) và dòng Tổng (đọc share thô) sẽ chọn hai cặp khoá base khác nhau
 * cho cùng một share — đúng kiểu lệch mà việc tách util này sinh ra để chặn.
 */
export function isF2Share(share: SplitShareLike): boolean {
  const details = share?.details
  if (details) {
    if (F2_KEYS.some((k) => !!details[k])) return true
    if (F1_KEYS.some((k) => !!details[k])) return false
  }
  return (
    share?.recipient_kind === 'f2_exchange' ||
    share?.recipient_kind === 'f2_agency' ||
    share?.recipient_kind === 'exchange' ||
    share?.exchange?.id != null
  )
}

/**
 * Bản ghi đang "hoạt động" trong `details` theo thứ tự khoá — bản do người dùng ghi đè
 * thắng trước, sau đó mới tới bản có giá trị khác 0. Cùng luật với ô đang render.
 */
export function getActiveCommissionRecord(
  details: Record<string, unknown> | null | undefined,
  keys: string[]
): (CommissionRecord & { pct_type: string }) | null {
  if (!details) return null
  for (const key of keys) {
    const rec = details[key] as CommissionRecord | undefined
    if (rec?.is_custom_override) return { ...rec, pct_type: key }
  }
  for (const key of keys) {
    const rec = details[key] as CommissionRecord | undefined
    if (!rec) continue
    if (
      Number(rec.percentage) > 0 ||
      Number(rec.actual_rate_percentage) > 0 ||
      Number(rec.fixed_amount) > 0 ||
      Number(rec.calculated_amount) > 0
    ) {
      return { ...rec, pct_type: key }
    }
  }
  return null
}

/** Hai khoá base (pct, amt) của share — F2 hay F1 tuỳ kênh. */
export function getBaseCommissionKeys(share: SplitShareLike): string[] {
  return isF2Share(share)
    ? [COMMISSION_PCT_TYPES.F2_SALE.pct, COMMISSION_PCT_TYPES.F2_SALE.amt]
    : [COMMISSION_PCT_TYPES.F1_SALE.pct, COMMISSION_PCT_TYPES.F1_SALE.amt]
}

/** Bản ghi base của share, hoặc `null` khi share chưa có dòng base nào. */
export function getBaseCommissionRecord(share: SplitShareLike) {
  return getActiveCommissionRecord(share?.details, getBaseCommissionKeys(share))
}

/**
 * Tỷ lệ "Phí HH trả sale" của MỘT share, tính bằng %.
 *
 * `percentage ?? rate` khớp đúng thứ tự `EditableCommissionCell` dùng để hiển thị.
 * Share không có bản ghi base — hoặc có nhưng để trống % (kênh trả theo số tiền cố định) —
 * trả về 0: ô đó hiển thị "—", nên nó phải đóng góp 0 vào dòng Tổng chứ không phải NaN.
 */
export function getSplitBasePct(share: SplitShareLike): number {
  const record = getBaseCommissionRecord(share)
  if (!record) return 0
  const raw = record.percentage ?? record.rate
  if (raw === null || raw === undefined || raw === '') return 0
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * "Tổng phí hoa hồng trả sale" của section 5 — cộng thẳng, không nhân trọng số tham gia.
 *
 * Cột hiển thị tỷ lệ đã thoả thuận của từng bên, nên tổng phải là phép cộng đơn thuần;
 * nhân với `participation` sẽ ra con số không khớp bất kỳ ô nào trên màn hình.
 */
export function sumSplitBasePct(shares: readonly SplitShareLike[]): number {
  return shares.reduce((sum: number, share) => sum + getSplitBasePct(share), 0)
}
