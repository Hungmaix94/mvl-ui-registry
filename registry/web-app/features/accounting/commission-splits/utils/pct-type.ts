/**
 * Phân loại `pct_type` của một position ở Mục 5 — khớp CHÍNH XÁC, không dùng `includes`.
 *
 * Trước đây màn chia thực nhận nhận diện bằng `pctType.includes('bonus')` /
 * `.includes('f2')`. Cách đó mong manh: `mgmt_ceo_investor_bonus` cũng khớp `'bonus'`,
 * và bất kỳ pct_type mới nào chứa mấy chữ đó đều rơi nhầm nhánh mà không ai biết.
 *
 * Nguồn chân lý là `CommissionPctType` bên BE (apps/sales/constants.py).
 */

/**
 * Thưởng chính sách (`staff_incentive`) — tiền chiến dịch của chính MVL trả cho nhân viên
 * MV, cấu hình theo đợt qua LAD. Mục 6 có cột riêng cho nó vì kế toán cần tách bạch với
 * thưởng CĐT chia sẻ: hai khoản khác nguồn tiền và khác cách trả.
 *
 * Là `pct_type` DUY NHẤT không có tiền tố `pct_`/`amt_` (cố ý — BE không có
 * `pct_staff_incentive`), nên mọi bộ lọc theo tiền tố sẽ bỏ sót nó.
 */
const STAFF_INCENTIVE_PCT_TYPES = new Set(['staff_incentive'])

/** True khi dòng là thưởng chính sách — cột "Thưởng chính sách" ở Mục 6 gom đúng dòng này. */
export function isStaffIncentivePctType(pctType: string | null | undefined): boolean {
  return STAFF_INCENTIVE_PCT_TYPES.has(pctType || '')
}

/**
 * Giảm trừ + thưởng MV + thưởng chính sách — KHÔNG dial nào chạm tới, FE giữ nguyên số
 * backend trả.
 *
 * Giảm trừ: số của từng đợt đối chiếu × tỉ lệ tiền về của hoá đơn đợt đó, chia cho từng
 * sale theo tỷ lệ tham gia — read-only ở mọi tầng (chốt 2026-08-04).
 * Thưởng MV: quota trọn đời của MVL, rút dần, không neo tiền CĐT.
 * Thưởng chính sách: cũng là pool trọn đời (BE xếp chung `POOL_DRAWDOWN_PCT_TYPES`, nên
 * `_progress_side_pct` trả None và không kỳ nào rescale nó). Thiếu nó ở đây thì preview
 * nhân theo dial phí còn BE thì không — bấm Lưu là số nhảy về chỗ cũ, đúng lỗi mà giảm
 * trừ từng dính (bổ sung 2026-08-05).
 *
 * Thưởng CHIA SẺ **không** nằm ở đây: từ 2026-08-04 kế toán dial được (kẹp trần
 * = tiền về × tiến độ trả thưởng), nên nó đi theo nhánh dial thưởng.
 */
const RECON_DRIVEN_PCT_TYPES = new Set([
  'pct_mv_bonus_to_sale',
  'amt_mv_bonus_to_sale',
  'pct_mv_bonus_to_f2',
  'amt_mv_bonus_to_f2',
  ...STAFF_INCENTIVE_PCT_TYPES,
  'pct_fee_deduction_to_sale',
  'amt_fee_deduction_to_sale',
  'pct_fee_deduction_to_f2',
  'amt_fee_deduction_to_f2',
])

/** Thưởng chia sẻ sale / F2 — dial được, trần do BE tính. */
const SHARED_BONUS_PCT_TYPES = new Set([
  'pct_investor_bonus_to_sale',
  'amt_investor_bonus_to_sale',
  'pct_f2_bonus',
  'amt_f2_bonus',
])

const F2_SHARED_BONUS_PCT_TYPES = new Set(['pct_f2_bonus', 'amt_f2_bonus'])

/** True khi dòng thuộc thưởng chia sẻ (dial `bonus_pct` / `bonus_f2_pct`). */
export function isSharedBonusPctType(pctType: string | null | undefined): boolean {
  return SHARED_BONUS_PCT_TYPES.has(pctType || '')
}

/** True khi dòng thuộc vế thưởng F2 — dial riêng `bonus_f2_pct`. */
export function isF2SharedBonusPctType(pctType: string | null | undefined): boolean {
  return F2_SHARED_BONUS_PCT_TYPES.has(pctType || '')
}

const F2_COMMISSION_PCT_TYPES = new Set(['pct_f2_commission', 'amt_f2_commission'])

/**
 * True khi tiền của dòng này do đối chiếu quyết định ⇒ KHÔNG dial nào rescale được,
 * FE phải giữ nguyên số backend trả.
 */
export function isReconDrivenPctType(pctType: string | null | undefined): boolean {
  return RECON_DRIVEN_PCT_TYPES.has(pctType || '')
}

/** True khi dòng thuộc track F2 (hoa hồng F2) — dial riêng `f2_pct`. */
export function isF2CommissionPctType(pctType: string | null | undefined): boolean {
  return F2_COMMISSION_PCT_TYPES.has(pctType || '')
}

/** Nhãn cột "% thanh toán kỳ này" theo từng band của Mục 5. */
export function periodPctLabelFor(
  pctType: string | null | undefined,
  {
    feePct,
    f2Pct,
    bonusPct,
  }: { feePct: number | null; f2Pct: number | null; bonusPct: number | null }
): number | null {
  const type = pctType || ''
  if (type.startsWith('pct_fee_deduction') || type.startsWith('amt_fee_deduction')) {
    // Giảm trừ không có "tiến độ" nào để hiện: nó đi theo tỉ lệ tiền về của hoá đơn thuộc
    // đợt đối chiếu, khác nhau từng đợt. Hiện "—" thay vì bịa ra một con số chung — bản cũ
    // để cứng 100% từ thời E1, nay là sai.
    return null
  }
  if (isSharedBonusPctType(type)) return bonusPct
  if (isReconDrivenPctType(type)) return null
  if (isF2CommissionPctType(type)) return f2Pct ?? feePct
  return feePct
}
