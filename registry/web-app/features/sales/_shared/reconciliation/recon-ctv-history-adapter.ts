import type {
  CTVReconciliationHistory,
  InvestorReconciliationHistory,
} from '@/services/realestate-service'

/**
 * Map a `CTVReconciliationHistory` row (the `simple` CTV serializer) onto the canonical
 * `InvestorReconciliationHistory` shape the shared reconciliation engine consumes.
 *
 * Same idea as {@link mapF2HistoryRowToCanonical}: the engine's history pipeline (summary, ledger
 * table) is typed against the investor (rich) row; CTV is a subset that renames a few fields and
 * omits the rich-only ones:
 * - `ctv_sheet` / `ctv_sheet_detail` → `investor_sheet` / `investor_sheet_detail` (sheet linkage +
 *   round filtering; the two nested detail types are structurally identical).
 * - `pct_commission` → `pct_agency_fee` (CTV's single commission line maps onto the canonical
 *   agency-fee line).
 * - CTV is a natural person (PIT, no VAT) → all `is_*_include_vat` flags false.
 * - Rich-only inputs (A' price, base progress, extra-bonus schedule, settlement/refund, approval
 *   audit trail) have no CTV counterpart → null/empty defaults so downstream pure functions read 0.
 *
 * Field-by-field construction (not an `as` cast) keeps it honest: TypeScript fails the build if a
 * future schema regen adds a required canonical field this adapter forgets to fill.
 */
export function mapCtvHistoryRowToCanonical(
  row: CTVReconciliationHistory
): InvestorReconciliationHistory {
  return {
    // Common fields (id/code/deal/period_type/prices/progress/amounts/status/audit dates/created_by…)
    // ride along via the spread; the explicit keys below rename or backfill the rest.
    ...row,
    // Canonical `product_inventory` is non-nullable; CTV allows null → coerce to 0 (no căn linked).
    product_inventory: row.product_inventory ?? 0,
    // CTV commission line → canonical agency-fee line. CTV never uses a flat-amount override.
    pct_agency_fee: row.pct_commission,
    amt_agency_fee: null,
    // Sheet linkage (drives round ordering + current-sheet exclusion).
    investor_sheet: row.ctv_sheet,
    investor_sheet_detail: row.ctv_sheet_detail,
    // CTV là cá nhân, khấu trừ TNCN (PIT) → không có VAT ⇒ mọi cờ include_vat = false.
    is_agency_fee_include_vat: false,
    is_shared_bonus_include_vat: false,
    is_extra_bonus_include_vat: false,
    is_fee_deduction_include_vat: false,
    // Cột "Thành tiền" ledger cho CTV = tiền THỰC NHẬN sau thuế TNCN (`total_amount_after_pit`), không
    // phải số trước thuế. Ép NET == Phải thu == after-PIT ⇒ bảng hiện 1 số "Không VAT", không dòng
    // VAT/khấu trừ giả (bảng dùng total_amount làm NET, total_amount_with_vat làm Phải thu).
    total_amount: row.total_amount_after_pit,
    total_amount_with_vat: row.total_amount_after_pit,
    // "HH đợt": serializer simple của CTV không expose period_commission → backfill rỗng ⇒ ledger "—".
    period_commission: '',
    // Tiến độ/phí BASE (IR-only): CTV simple không có khái niệm base → null.
    base_pct_agency_fee: null,
    base_amt_agency_fee: null,
    base_progress_from_pct: null,
    base_progress_to_pct: null,
    base_progress_delta: null,
    // Rich-only fields absent on the CTV (simple) profile → safe defaults.
    investor: 0,
    project: 0,
    source_exchange: null,
    source_exchange_tax_code: null,
    commission_fee_calculation_price: null,
    // Thưởng: CTV nghiệp vụ Y HỆT F2 → dùng chung cách map của adapter F2. `shared_bonus_amount` (simple
    // serializer) = số thưởng chia về CTV; period_amount đọc thẳng field đó (đi vào net kỳ). pct /
    // to_sale_pct không áp cho CTV. (CTV còn `mv_bonus_amount` nhưng không phải khoản CTV nhận.)
    shared_bonus_pct: null,
    shared_bonus_period_amount: row.shared_bonus_amount,
    shared_bonus_to_sale_pct: null,
    extra_bonus_progress_from_pct: null,
    extra_bonus_progress_to_pct: null,
    extra_bonus_period_amount: null,
    fee_deduction_to_sale_amount: null,
    cancellation_reason: '',
    amount_retained: null,
    prior_received_total: null,
    amount_to_refund: null,
    tax_code: '',
    representative: '',
    address: '',
    bonus_note: '',
    deduction_note: '',
    submitted_by: null,
    submitted_at: null,
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    reject_reason: '',
    shared_bonus_prepaid_amount: '0',
    amount_to_collect: '0',
  }
}
