/**
 * BE `recon_check` contract (InvestorReconciliationSerializer.get_recon_check): per-field comparison
 * of the submitted reconciliation values against the latest MV DealCommissionConfig.
 *
 * - match === true  → submitted agrees with MV config
 * - match === false → mismatch (the user-entered value differs from the system's config)
 * - match === null  → nothing to compare (CĐT-only input or no config)
 */
import { formatCurrencyVND, formatPercent } from '@/utils/common'

export type ReconCheckEntry = {
  submitted: string | number | boolean | null
  mv_config: string | number | boolean | null
  delta: string | number | null
  match: boolean | null
}

export type ReconCheck = Record<string, ReconCheckEntry>

export type ReconCheckMismatch = ReconCheckEntry & { field: string; label: string }

type ReconCheckUnit = 'percent' | 'currency' | 'boolean' | 'plain'

/** Đơn vị của từng field recon_check — để format submitted/mv/delta đúng (% hoặc đ) thay vì số thô. */
const RECON_CHECK_FIELD_UNIT: Record<string, ReconCheckUnit> = {
  listed_price: 'currency',
  fee_calculation_price: 'currency',
  pct_agency_fee: 'percent',
  amt_agency_fee: 'currency',
  pct_period_commission: 'percent',
  amt_period_commission: 'currency',
  is_agency_fee_include_vat: 'boolean',
  agency_commission: 'currency',
  extra_bonus_pct: 'percent',
  extra_bonus_amount: 'currency',
  extra_bonus_period_amount: 'currency',
  is_extra_bonus_include_vat: 'boolean',
  // Tiến độ (Phần 1 / Phần 4) — BE hiện trả match=null (chưa so), nhưng khai báo đơn vị % sẵn để chip
  // cột "Đối chiếu" format đúng nếu sau này BE bổ sung so sánh tiến độ.
  progress_from_pct: 'percent',
  progress_to_pct: 'percent',
  extra_bonus_progress_from_pct: 'percent',
  extra_bonus_progress_to_pct: 'percent',
  shared_bonus_amount: 'currency',
  shared_bonus_pct: 'percent',
  is_shared_bonus_include_vat: 'boolean',
  shared_bonus_period_amount: 'currency',
  fee_deduction: 'currency',
  sub_total_commission: 'currency',
  total_amount: 'currency',
  vat_amount: 'currency',
  total_amount_with_vat: 'currency',
}

/**
 * Đơn vị SO SÁNH (percent/currency) của 1 field recon_check — để chip cột "Đối chiếu" format delta
 * đúng đơn vị. Map từ {@link RECON_CHECK_FIELD_UNIT}; boolean/plain ⇒ null (không có delta số để hiện).
 */
export function reconCheckCompareUnit(field: string): 'percent' | 'currency' | null {
  const u = RECON_CHECK_FIELD_UNIT[field]
  if (u === 'percent') return 'percent'
  if (u === 'currency') return 'currency'
  return null
}

/**
 * Cờ boolean THEO MV CONFIG của một field recon_check (vd `is_agency_fee_include_vat`).
 *
 * Cột "MVL ghi nhận" phải đọc `mv_config`; cờ nằm trên chính dòng đối chiếu (`item.is_*_include_vat`)
 * là giá trị CĐT ĐỀ NGHỊ và chỉ thuộc về cột "CĐT đề nghị". Dùng nhầm cờ của dòng cho cột MVL khiến
 * MVL hiện "(Gồm VAT)" trong khi HĐPP cấu hình "chưa gồm VAT".
 *
 * `undefined` khi BE không có gì để đối chiếu ⇒ bề mặt ẩn nhãn VAT thay vì hiện nhầm.
 */
export function reconCheckMvFlag(
  reconCheck: ReconCheck | null | undefined,
  field: string
): boolean | undefined {
  const value = reconCheck?.[field]?.mv_config
  if (value == null || value === '') return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  return value !== 0
}

/** Format giá trị submitted / mv_config theo đơn vị của field. `null`/rỗng → "—". */
export function formatReconCheckValue(
  field: string,
  value: string | number | boolean | null
): string {
  if (value == null || value === '') return '—'
  const unit = RECON_CHECK_FIELD_UNIT[field] ?? 'plain'
  if (unit === 'boolean') return value ? 'Có' : 'Không'
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return String(value)
  if (unit === 'percent') return formatPercent(num)
  if (unit === 'currency') return `${formatCurrencyVND(num, { maximumFractionDigits: 0 })} đ`
  return String(value)
}

/** Format delta (submitted − mv_config) kèm dấu + đơn vị. `null`/0 → null (không hiện phần lệch). */
export function formatReconCheckDelta(field: string, delta: string | number | null): string | null {
  if (delta == null || delta === '') return null
  const num = typeof delta === 'number' ? delta : Number(delta)
  if (!Number.isFinite(num) || num === 0) return null
  const unit = RECON_CHECK_FIELD_UNIT[field] ?? 'plain'
  const sign = num > 0 ? '+' : '−'
  const abs = Math.abs(num)
  if (unit === 'percent') return `${sign}${formatPercent(abs)}`
  if (unit === 'currency') return `${sign}${formatCurrencyVND(abs, { maximumFractionDigits: 0 })} đ`
  return `${sign}${abs}`
}

/** Vietnamese labels for the recon_check field keys surfaced in the UI. */
const RECON_CHECK_FIELD_LABELS: Record<string, string> = {
  listed_price: 'Giá niêm yết',
  fee_calculation_price: 'Giá tính phí',
  pct_agency_fee: '% hoa hồng đại lý',
  amt_agency_fee: 'Phí đại lý (số tiền)',
  is_agency_fee_include_vat: 'Phí đại lý gồm VAT',
  agency_commission: 'Hoa hồng đại lý',
  extra_bonus_pct: '% phí tăng thêm',
  extra_bonus_amount: 'Phí tăng thêm (số tiền)',
  extra_bonus_period_amount: 'Phí tăng thêm kỳ này',
  is_extra_bonus_include_vat: 'Phí tăng thêm gồm VAT',
  shared_bonus_amount: 'Tổng thưởng đại lý',
  shared_bonus_pct: '% thưởng đại lý',
  is_shared_bonus_include_vat: 'Thưởng đại lý gồm VAT',
  shared_bonus_period_amount: 'Thưởng ghi nhận kỳ này',
  fee_deduction: 'Khấu trừ',
  sub_total_commission: 'Tổng phụ',
  total_amount: 'Thành tiền (chưa VAT)',
  vat_amount: 'VAT',
  total_amount_with_vat: 'Phải thu (gồm VAT)',
}

export function reconCheckFieldLabel(field: string): string {
  return RECON_CHECK_FIELD_LABELS[field] ?? field
}

/** Coi null / '' / 0 / false là "rỗng" — 0 và null KHÔNG khác nhau về nghĩa khi đối chiếu. */
function isReconValueEmpty(v: string | number | boolean | null): boolean {
  if (v == null || v === '') return true
  if (typeof v === 'boolean') return v === false
  const n = Number(v)
  return Number.isFinite(n) && n === 0
}

/**
 * Match HIỆU LỰC của một entry recon_check. Giữ nguyên `match` của BE, NGOẠI TRỪ trường hợp BE trả
 * `match:false` nhưng cả `submitted` lẫn `mv_config` đều "rỗng" (null/''/0) — vd `shared_bonus_amount`
 * submitted="0" vs mv_config=null: 0 và null không khác gì nhau ⇒ KHÔNG có gì để đối chiếu ⇒ trả
 * `null` (không hiện Khớp lẫn Lệch). Không tự so sánh/tính gì khác — vẫn dựa trên recon_check của BE.
 */
export function effectiveReconMatch(entry: ReconCheckEntry | undefined | null): boolean | null {
  if (!entry) return null
  if (entry.match !== false) return entry.match
  if (isReconValueEmpty(entry.submitted) && isReconValueEmpty(entry.mv_config)) return null
  return false
}

export type ReconCheckDisplay = {
  match: boolean
  delta: string | number | null
  unit: 'percent' | 'currency' | null
}

/**
 * Chọn entry recon_check để hiển thị ở cột "Đối chiếu" cho 1 dòng có thể map NHIỀU field — ví dụ cặp
 * %/₫ loại trừ nhau (`extra_bonus_pct` XOR `extra_bonus_amount`, `pct_agency_fee` XOR `amt_agency_fee`).
 *
 * Thứ tự ưu tiên (ĐỘC LẬP với thứ tự truyền field — tránh ô "rỗng" null/0 match=true che lấp ô có giá
 * trị thực đang LỆCH):
 *   1) Bất kỳ field nào LỆCH thực sự (match hiệu lực === false) → trả field đó ("Lệch", kèm delta + đơn
 *      vị của ĐÚNG field đó).
 *   2) Không có lệch → field KHỚP đầu tiên có gì để so (match hiệu lực === true) → "Khớp".
 *   3) Không có gì để so (mọi field match hiệu lực === null) → null ⇒ cột để trống ("—").
 *
 * KHÔNG tự tính/so sánh gì — vẫn hoàn toàn dựa trên recon_check của BE qua {@link effectiveReconMatch}.
 */
export function pickReconCheckDisplay(
  reconCheck: ReconCheck | null | undefined,
  fields: string[]
): ReconCheckDisplay | null {
  if (!reconCheck) return null
  for (const field of fields) {
    const entry = reconCheck[field]
    if (entry && effectiveReconMatch(entry) === false) {
      return { match: false, delta: entry.delta, unit: reconCheckCompareUnit(field) }
    }
  }
  for (const field of fields) {
    const entry = reconCheck[field]
    if (entry && effectiveReconMatch(entry) === true) {
      return { match: true, delta: entry.delta, unit: reconCheckCompareUnit(field) }
    }
  }
  return null
}

/** Fields the user can act on (rate/price/bonus/deduction) — surface these mismatches, not the
 * derived totals (which only mismatch as a consequence of the inputs above).
 *
 * Export ĐỘNG cho guard test "mọi cảnh báo badge đếm đều phải đọc được" — bề mặt hiển thị phải phủ
 * đúng tập này, và guard tự liệt kê từ đây thay vì chép tay lại danh sách. */
export const RECON_PRIMARY_FIELDS = [
  'fee_calculation_price',
  'pct_agency_fee',
  'amt_agency_fee',
  // Cả 3 cờ VAT đều là NGUYÊN NHÂN GỐC, không phải hệ quả: cờ lệch giữ nguyên số gốc (giá × %) nhưng
  // đảo cách đọc gộp/chưa gộp ⇒ đẻ ra lệch ở sub_total/total/vat/total_with_vat. Thiếu 2 cờ bonus ở
  // đây thì lệch VAT của thưởng/phí tăng thêm vô hình, chỉ thấy các dòng tổng đỏ mà không rõ vì sao.
  'is_agency_fee_include_vat',
  'is_shared_bonus_include_vat',
  'is_extra_bonus_include_vat',
  'extra_bonus_pct',
  'extra_bonus_amount',
  'shared_bonus_amount',
  'shared_bonus_period_amount',
] as const

const PRIMARY_FIELDS: ReadonlySet<string> = new Set(RECON_PRIMARY_FIELDS)

/** Return the actionable mismatches (match === false) from a recon_check, primary fields first. */
export function reconCheckMismatches(recon: ReconCheck | null | undefined): ReconCheckMismatch[] {
  if (!recon) return []
  const out: ReconCheckMismatch[] = []
  for (const [field, entry] of Object.entries(recon)) {
    // Dùng match HIỆU LỰC (0≈null ⇒ khớp) thay vì match thô của BE — tránh báo lệch "0 vs null".
    if (effectiveReconMatch(entry) === false && PRIMARY_FIELDS.has(field)) {
      out.push({ ...entry, field, label: reconCheckFieldLabel(field) })
    }
  }
  return out
}
