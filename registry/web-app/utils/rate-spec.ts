/* ────────────────────────────────────────────────────────────────
 * rate-spec — adapter thuần giữa `RateInput` (ResolvedRateValue, UI primitive)
 * và `RateSpec` của BE (apps.sales.services.rate_spec).
 *
 * RateSpec mô tả một tỷ lệ là: `direct_pct` (phần trăm trực tiếp) HOẶC
 * `fraction` (phân số tử/mẫu của một số gốc — base_unit 'pct' ⇒ ra %, 'vnd' ⇒
 * ra số tiền). RateInput còn hỗ trợ "số tiền cố định trực tiếp" (₫) — KHÔNG có
 * mode tương ứng trong RateSpec, nên trường hợp đó trả `spec=null` và chỉ giữ
 * cache số tiền (`amt`). pct/amt là cache dẫn xuất; spec là nguồn sự thật khi có.
 *
 * Dùng cho mọi field RateSpec (SaleAllocation `f2_commission_spec`,
 * LAD `pct_f2_commission_spec`, …). Hàm thuần, không phụ thuộc React.
 * ──────────────────────────────────────────────────────────────── */

import type { components } from '@/api/schema'
import { RateSpecBase_unit, RateSpecMode } from '@/api/schema'
import type { ResolvedRateValue, RateInputUnit } from '@/components/ui/rate-input'
import { formatCurrencyVND, formatRatePct } from '@/utils/common'

export type RateSpec = components['schemas']['RateSpec']
export type RateSpecRequest = components['schemas']['RateSpecRequest']

/** RateSpec + cặp cache dẫn xuất (chỉ một trong pct/amt khác null). */
export interface RateSpecPayloadParts {
  spec: RateSpecRequest | null
  pct: number | null
  amt: number | null
}

/** Ép decimal-string (hoặc number) của BE về number; null khi rỗng/không hợp lệ. */
function toNum(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isNaN(n) ? null : n
}

/** Cache `amt_*` (VND) → số nguyên. Chỉ dùng cho nhánh ₫-trực-tiếp (không có spec). */
function roundAmt(v: number | null | undefined): number | null {
  if (v == null) return null
  return Math.round(v)
}

/**
 * Làm tròn % dẫn xuất về 4 chữ số thập phân để HIỂN THỊ — khớp `display_pct` (4 dp) của BE và tránh
 * số float dài do phân số lặp (vd 2/3 × 4 = 2.6666666666666665 → 2.6667). Chỉ cho hiển thị, KHÔNG
 * dùng cho tính tiền (BE luôn tính tiền từ phân số gốc, không từ % đã làm tròn).
 */
function roundPctForDisplay(v: number | null | undefined): number | null {
  if (v == null) return null
  return Math.round(v * 1e4) / 1e4
}

/**
 * ResolvedRateValue (từ RateInput.onChange) → payload RateSpec + cache.
 * Trả về toàn null khi rỗng / chưa đủ dữ liệu / có lỗi validate.
 */
export function toRateSpecPayload(r: ResolvedRateValue | null | undefined): RateSpecPayloadParts {
  const empty: RateSpecPayloadParts = { spec: null, pct: null, amt: null }
  if (!r || r.empty || !r.ready || r.error) return empty

  if (r.mode === 'fraction') {
    const isVnd = r.baseUnit === 'đ'
    const spec: RateSpecRequest = {
      mode: RateSpecMode.fraction,
      pct: null,
      num: r.numerator ?? null,
      den: r.denominator ?? null,
      base_value: r.base != null ? String(r.base) : null,
      base_unit: isVnd ? RateSpecBase_unit.vnd : RateSpecBase_unit.pct,
    }
    // BE bắt buộc: gửi spec HOẶC pct/amt — KHÔNG cả hai. Có spec ⇒ cache phải null.
    return { spec, pct: null, amt: null }
  }

  // mode = 'percent' (nhập trực tiếp)
  if (r.directUnit === 'đ') {
    // RateSpec không có mode "số tiền cố định" → không có spec, chỉ gửi cache số tiền.
    return { spec: null, pct: null, amt: roundAmt(r.fixedAmount ?? r.directAmount) }
  }

  // % trực tiếp → spec direct_pct (nguồn sự thật); cache pct null vì BE cấm gửi cả hai.
  const p = r.percent ?? null
  const spec: RateSpecRequest = {
    mode: RateSpecMode.direct_pct,
    pct: p != null ? String(p) : null,
  }
  return { spec, pct: null, amt: null }
}

/**
 * RateSpec (nguồn sự thật, nếu có) + cache pct/amt → ResolvedRateValue để hydrate
 * RateInput. Khi không có spec, dựng lại từ cache (amt ⇒ ₫ trực tiếp, pct ⇒ %).
 * Trả null khi không có dữ liệu nào.
 */
export function fromRateSpec(
  spec: RateSpec | RateSpecRequest | null | undefined,
  pct: number | string | null | undefined,
  amt: number | string | null | undefined
): ResolvedRateValue | null {
  if (spec) {
    if (spec.mode === RateSpecMode.fraction) {
      const baseUnit: RateInputUnit = spec.base_unit === RateSpecBase_unit.vnd ? 'đ' : '%'
      const num = spec.num ?? null
      const den = spec.den ?? null
      const base = toNum(spec.base_value)
      let percent: number | null = null
      let fixedAmount: number | null = null
      if (num != null && den != null && den >= 1 && base != null) {
        if (baseUnit === '%') percent = (num / den) * base
        else fixedAmount = (num / den) * base
      }
      return {
        mode: 'fraction',
        directUnit: '%',
        directAmount: null,
        numerator: num,
        denominator: den,
        base,
        baseUnit,
        percent,
        fixedAmount,
        valid: true,
        error: null,
        empty: num == null && den == null && base == null,
        ready: percent != null || fixedAmount != null,
      }
    }

    // mode = direct_pct
    const p = toNum(spec.pct)
    return {
      mode: 'percent',
      directUnit: '%',
      directAmount: null,
      numerator: null,
      denominator: null,
      base: null,
      baseUnit: '%',
      percent: p,
      fixedAmount: null,
      valid: true,
      error: null,
      empty: p == null,
      ready: p != null,
    }
  }

  // Không có spec → dựng lại từ cache phẳng.
  const amtNum = toNum(amt)
  if (amtNum != null) {
    return {
      mode: 'percent',
      directUnit: 'đ',
      directAmount: amtNum,
      numerator: null,
      denominator: null,
      base: null,
      baseUnit: '%',
      percent: null,
      fixedAmount: amtNum,
      valid: true,
      error: null,
      empty: false,
      ready: true,
    }
  }

  const pctNum = toNum(pct)
  if (pctNum != null) {
    return {
      mode: 'percent',
      directUnit: '%',
      directAmount: null,
      numerator: null,
      denominator: null,
      base: null,
      baseUnit: '%',
      percent: pctNum,
      fixedAmount: null,
      valid: true,
      error: null,
      empty: false,
      ready: true,
    }
  }

  return null
}

/** Cặp {pct, amt} dẫn xuất để HIỂN THỊ (read-only) từ một RateSpec — chỉ một bên khác null. */
export interface RateDisplayPair {
  pct: number | null
  amt: number | null
}

/**
 * Quy một `RateSpec` về cặp {pct, amt} hiển thị: fraction base `%` ⇒ pct dẫn xuất,
 * base `đ` ⇒ amt dẫn xuất, `direct_pct` ⇒ pct. Dùng cho các bề mặt read-only (bảng snapshot,
 * diff, dòng "Cũ/Δ") nơi payload chỉ giữ spec (pct/amt = null theo ràng buộc XOR của BE).
 *
 * Với fraction base `%`, ƯU TIÊN `display_pct` mà BE đã làm tròn (4 dp) trên `RateSpec`; nếu spec
 * là `RateSpecRequest` (không có `display_pct`, vd sau khi đi qua {@link toRateSpecPayload}) thì làm
 * tròn % dẫn xuất về 4 dp — tránh hiển thị số float dài (2/3 × 4 = 2.6666666666666665 → 2.6667).
 */
export function rateSpecToPair(
  spec: RateSpec | RateSpecRequest | null | undefined
): RateDisplayPair {
  const r = fromRateSpec(spec, null, null)
  if (!r) return { pct: null, amt: null }
  if (r.mode === 'fraction') {
    if (r.baseUnit !== '%') return { pct: null, amt: r.fixedAmount ?? null }
    // `'display_pct' in spec` thu hẹp về RateSpec (response) — RateSpecRequest không có field này.
    const displayPct = spec && 'display_pct' in spec ? toNum(spec.display_pct) : null
    return { pct: displayPct ?? roundPctForDisplay(r.percent), amt: null }
  }
  return { pct: r.percent ?? null, amt: null }
}

/**
 * Quy bộ-3-key LOẠI TRỪ NHAU (`*_commission_spec` | `pct_*` phẳng | `amt_*` phẳng) về cặp {pct, amt}
 * hiển thị. Thứ tự ưu tiên khớp hợp đồng XOR của BE: spec là nguồn sự thật khi có (phân số / direct_pct
 * → %/đ dẫn xuất qua {@link rateSpecToPair}); nếu spec null thì dùng cache phẳng — `pct` (làm tròn 4 dp
 * cho hiển thị) trước, rồi `amt`. Trả {null,null} khi không có dữ liệu nào.
 *
 * Đây là hàm dùng chung cho MỌI bề mặt read-only đọc bộ-3 này (LAD `pct_f2_commission(_spec)`,
 * SaleAllocation/PI `f2_commission_spec`, …) — thay cho việc mỗi component tự viết lại
 * `spec ? rateSpecToPair(spec) : { pct, amt }`.
 */
export function resolveRateTriple(
  spec: RateSpec | RateSpecRequest | null | undefined,
  pct: number | string | null | undefined,
  amt: number | string | null | undefined
): RateDisplayPair {
  if (spec) {
    const pair = rateSpecToPair(spec)
    if (pair.pct != null || pair.amt != null) {
      return pair
    }
  }
  const p = toNum(pct)
  const a = toNum(amt)
  if (a != null && a > 0 && (p == null || p === 0)) {
    return { pct: null, amt: a }
  }
  if (p != null) return { pct: roundPctForDisplay(p), amt: null }
  if (a != null) return { pct: null, amt: a }
  return { pct: null, amt: null }
}

/**
 * Văn bản dạng phân số `"x / y của z"` cho một RateSpec mode `fraction` (z gồm đơn vị gốc: `%` hoặc
 * `đ` có phân tách nghìn). Trả `null` khi spec không phải phân số (caller hiển thị %/đ như thường).
 * Dùng cho bảng "đang áp dụng" để giữ đúng ý người dùng đã cấu hình kiểu phân số, không chỉ ra % dẫn xuất.
 */
export function formatRateSpecFraction(
  spec: RateSpec | RateSpecRequest | null | undefined
): string | null {
  if (!spec || spec.mode !== RateSpecMode.fraction) return null
  const num = spec.num
  const den = spec.den
  if (num == null || den == null) return null
  const base = toNum(spec.base_value)
  const baseStr =
    base == null
      ? '?'
      : spec.base_unit === RateSpecBase_unit.vnd
        ? `${base.toLocaleString('vi-VN')} đ`
        : `${base}%`
  return `${num} / ${den} của ${baseStr}`
}

/**
 * Giá trị QUY ĐỔI của một RateSpec phân số, đã format sẵn: `"3,00%"` khi base là `%`, `"33.333.333 đ"`
 * khi base là `đ`. Trả `null` khi spec không phải phân số hoặc thiếu dữ liệu để quy đổi.
 *
 * Hai nhánh KHÔNG đối xứng, và đây là lý do hàm này tồn tại thay vì để mỗi màn tự ghép:
 * - base `%` → lấy `display_pct` BE đã làm tròn 4 dp (qua {@link rateSpecToPair}), không tự nhân lại.
 * - base `đ` → BE **không** trả `display_pct` (kiểm trên dev 26/08/2026: `{"mode":"fraction","num":1,
 *   "den":3,"base_value":"100000000.0000","base_unit":"vnd","display_pct":null}`), nên số tiền phải
 *   tính từ chính phân số. Ghép cứng `%` ở đây sẽ in ra "≈ 33.333.333%" trên mọi dòng HH cấu hình
 *   bằng số tiền cố định.
 */
export function formatRateSpecEquivalent(
  spec: RateSpec | RateSpecRequest | null | undefined
): string | null {
  if (!spec || spec.mode !== RateSpecMode.fraction) return null
  const { pct, amt } = rateSpecToPair(spec)
  if (pct != null) return formatRatePct(pct)
  if (amt != null) return `${formatCurrencyVND(amt)} đ`
  return null
}

/**
 * Chuỗi HOÀN CHỈNH cho một tỷ lệ cấu hình dạng phân số: `"1 / 2 của 6% ≈ 3,00%"`.
 * Trả `null` khi spec không phải phân số — caller hiển thị %/đ như thường.
 *
 * Dùng cho các bề mặt hiển thị MỘT DÒNG (ô bảng, chip, dòng summary). Bề mặt xếp hai dòng (phân số
 * làm số chính, quy đổi tụt xuống dòng mờ) thì gọi {@link formatRateSpecFraction} và
 * {@link formatRateSpecEquivalent} riêng rồi tự ghép `≈` — vẫn chung một nguồn chữ và một quy tắc
 * làm tròn, chỉ khác chỗ đặt.
 *
 * Vì sao gộp: `formatRateSpecFraction` chỉ trả `"1 / 2 của 6%"`, nên trước đây mỗi màn tự ghép phần
 * `≈` lấy từ `resolveRateTriple`. 13 màn ⇒ 4 kiểu ghép khác nhau và 5 màn quên hẳn, người đọc thấy
 * "1 / 2 của 6%" mà không biết là 3%.
 */
export function formatRateSpecWithEquivalent(
  spec: RateSpec | RateSpecRequest | null | undefined
): string | null {
  const fraction = formatRateSpecFraction(spec)
  if (!fraction) return null
  const equivalent = formatRateSpecEquivalent(spec)
  return equivalent ? `${fraction} ≈ ${equivalent}` : fraction
}

/**
 * Xác định chế độ hoa hồng (VNĐ - true hay % - false) cho từng nhân viên/đối tác.
 * Đối tác (partner) và Cộng tác viên (collaborator) được phép có đơn vị hoa hồng riêng biệt,
 * độc lập với đơn vị hoa hồng mặc định toàn cục của Booking/Deposit.
 */
export function resolveRowIsAmt(
  staff: any,
  module: 'booking' | 'deposit',
  isAmtCommission: boolean
): boolean {
  if (staff?.sale_type === 'partner' || staff?.sale_type === 'collaborator') {
    if (staff?.amt_commission != null && String(staff.amt_commission) !== '') return true
    if (staff?.pct_commission != null && String(staff.pct_commission) !== '') return false
  }
  if (module === 'booking') return isAmtCommission
  if (staff?.amt_commission != null && String(staff.amt_commission) !== '') return true
  if (staff?.pct_commission != null && String(staff.pct_commission) !== '') return false
  return isAmtCommission
}
