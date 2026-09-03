import type {
  F2ReconciliationHistory,
  InvestorReconciliationHistory,
} from '@/services/realestate-service'

/**
 * Map an `F2ReconciliationHistory` row (the `simple` F2 serializer) onto the canonical
 * `InvestorReconciliationHistory` shape the shared reconciliation engine consumes.
 *
 * The engine's history pipeline (summary, ledger table, retro/baseline math) is typed against the
 * investor (rich) row. F2 is a subset that renames a few fields and omits the rich-only ones:
 * - `f2_sheet` / `f2_sheet_detail` → `investor_sheet` / `investor_sheet_detail` (sheet linkage +
 *   round filtering; the two nested detail types are structurally identical).
 * - `pct_commission` / `is_commission_include_vat` → `pct_agency_fee` / `is_agency_fee_include_vat`
 *   (F2's single commission line maps onto the canonical agency-fee line).
 * - Rich-only inputs (A' price, *_to_sale split, extra-bonus schedule, settlement/refund, approval
 *   audit trail) have no F2 counterpart → null/empty defaults so downstream pure functions read 0.
 *
 * Field-by-field construction (not an `as` cast) keeps it honest: TypeScript fails the build if a
 * future schema regen adds a required canonical field this adapter forgets to fill.
 */
export function mapF2HistoryRowToCanonical(
  row: F2ReconciliationHistory
): InvestorReconciliationHistory {
  return {
    // Common fields (id/code/deal/period_type/prices/progress/amounts/status/audit dates/created_by…)
    // ride along via the spread; the explicit keys below rename or backfill the rest.
    ...row,
    // Canonical `product_inventory` is non-nullable; F2 allows null → coerce to 0 (no căn linked).
    product_inventory: row.product_inventory ?? 0,
    // F2 commission line → canonical agency-fee line.
    pct_agency_fee: row.pct_commission,
    is_agency_fee_include_vat: row.is_commission_include_vat,
    // Sheet linkage (drives round ordering + current-sheet exclusion).
    investor_sheet: row.f2_sheet,
    investor_sheet_detail: row.f2_sheet_detail,
    // "HH đợt": the F2 (simple) history serializer omits period_commission (the F2 detail/nested
    // serializer derives it from commission_before_vat, but the simple list profile does not expose
    // it). FE never recomputes ⇒ backfill empty so numOrNull → null → the ledger shows "—" for F2.
    period_commission: '',
    // Tiến độ/phí BASE (IR-only, BE bổ sung 2026-06-24): F2 simple serializer không có khái niệm base →
    // null. Header F2 cũng không hiện dải "Base" (không truyền baseAgencyFeeRate) nên không ảnh hưởng.
    base_pct_agency_fee: null,
    base_amt_agency_fee: null,
    base_progress_from_pct: null,
    base_progress_to_pct: null,
    base_progress_delta: null,
    // Rich-only fields absent on the F2 (simple) profile → safe defaults.
    investor: 0,
    project: 0,
    source_exchange: row.exchange,
    source_exchange_tax_code: null,
    commission_fee_calculation_price: null,
    // Thưởng đại lý: F2 chỉ có `shared_bonus_amount` (phần chia về F2). Các field IR-only backfill cho
    // canonical — period_amount = số F2 nhận (đi vào net kỳ của F2); pct / to_sale_pct không áp cho F2.
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
