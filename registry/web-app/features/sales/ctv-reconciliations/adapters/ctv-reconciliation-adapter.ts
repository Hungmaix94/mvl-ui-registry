import { format, parse } from 'date-fns'

import { CTVReconciliationPeriod_type } from '@/api/schema'
import { DATE_FORMAT, DATE_SERVER_FORMAT } from '@/constants/date-format'
import {
  INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE,
  createEmptyInvestorReconciliationSheetItem,
  type InvestorReconciliationSheetCreateItemValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import type { ReconServerComputed } from '@/features/sales/_shared/reconciliation/useReconLineDerived'
import type { CTVReconciliation } from '@/features/sales/ctv-reconciliations/types/ctv-reconciliation'
import type {
  CTVReconciliationSheet,
  PartialUpdateCTVReconciliationSheetRequest,
} from '@/features/sales/ctv-reconciliations/services/ctv-reconciliation-sheet-service'
import type {
  CTVReconciliationSheetItemValues,
  CTVReconciliationSheetValues,
} from '@/features/sales/ctv-reconciliations/schemas/ctv-reconciliation-sheet-schema'

/**
 * CTV (Cộng tác viên) payload adapter — the ONLY layer that knows the CTV wire contract. Maps the
 * CANONICAL (investor-superset) form model ⇄ the CTV reconciliation-sheet response / PATCH shapes.
 *
 * NGHIỆP VỤ Y HỆT F2 về counterparty (`collaborator`) + rate field (`pct_commission` ← canonical
 * `pct_agency_fee`), NHƯNG CTV theo model THUẾ TNCN (PIT) thay vì VAT: CTV là cá nhân nên BE trả
 * `total_amount` (trước thuế) + `pit_rate` + `pit_amount` + `total_amount_after_pit` (KHÔNG có
 * `vat_amount` / `total_amount_with_vat`). CTV row cũng không có per-field VAT flags → mặc định false
 * (không hiển thị nhãn VAT ở taxMode 'pit'). period_type / progress / retroactive inherited read-only
 * from the parent CĐT — present in the response, NOT in the PATCH payload subset.
 */

const toDecimalString = (n: number | null | undefined) =>
  n === undefined || n === null ? '0' : String(n)
const toNullableDecimalString = (n: number | null | undefined) =>
  n === undefined || n === null ? null : String(n)

function toServerDate(value: string): string | undefined {
  if (!value) return undefined
  const parsed = parse(value, DATE_FORMAT, new Date())
  if (Number.isNaN(parsed.getTime())) return undefined
  return format(parsed, DATE_SERVER_FORMAT)
}

function toDisplayDate(value: string | undefined | null): string {
  if (!value) return ''
  try {
    const parsed = parse(value, DATE_SERVER_FORMAT, new Date())
    if (Number.isNaN(parsed.getTime())) return value
    return format(parsed, DATE_FORMAT)
  } catch {
    return value
  }
}

function toFormNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toNullableFormNumber(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/* ----------------------------------------------------------------------------------------------- */
/* Response → canonical form values                                                                */
/* ----------------------------------------------------------------------------------------------- */

/**
 * Map a generated CTV reconciliation row (rich read serializer) to the canonical line model — the
 * always-present source for a CTV sheet. CTV has no per-field VAT flags / A' price / extra-progress /
 * *_to_sale fields, so those default (false / null / 10% vat_rate).
 */
function reconciliationToFormValues(
  r: CTVReconciliation
): InvestorReconciliationSheetCreateItemValues {
  return {
    product_inventory_id: r.product_inventory ?? r.product_inventory_detail?.id ?? 0,
    reconciliation_type: r.reconciliation_type ?? undefined,
    period_type: r.period_type ?? CTVReconciliationPeriod_type.normal_payment,
    fee_calculation_price: toFormNumber(r.fee_calculation_price),
    // CTV has no internal Sale/F2 price (A') — always null.
    commission_fee_calculation_price: null,
    pct_agency_fee: toNullableFormNumber(r.pct_commission),
    amt_agency_fee: toNullableFormNumber(r.amt_agency_fee),
    // CTV has no explicit vat_rate / is_*_include_vat flags — default 10% / false; BE totals already
    // account for VAT, so the per-field labels are display-only ("(chưa gồm VAT)").
    vat_rate: INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE,
    is_agency_fee_include_vat: false,
    is_extra_bonus_include_vat: false,
    is_shared_bonus_include_vat: false,
    is_fee_deduction_include_vat: false,
    progress_from_pct: toNullableFormNumber(r.progress_from_pct),
    progress_to_pct: toNullableFormNumber(r.progress_to_pct),
    pct_period_commission: null,
    amt_period_commission: null,
    amt_payment_this_period: toNullableFormNumber(r.amt_payment_this_period),
    // Read-only, và LUÔN 0 từ 2026-08-06: CTV không còn truy hồi ở tầng đối chiếu — việc đổi
    // rate áp lên tiến độ đã trả nay thu hồi trong luồng chi hoa hồng (nơi tiền CTV thực đi ra).
    // Vẫn map để giữ nguyên hình dạng form; `toPayloadItems` không gửi field này lên BE.
    retroactive_adjustment_amount: toNullableFormNumber(r.retroactive_adjustment_amount),
    // CTV chỉ có `shared_bonus_amount` (phần thưởng chia về CTV, prefill từ CĐT cha, read-only).
    // Map period_amount = số này để nó vào net/footer kỳ; pct / to_sale_pct là khái niệm IR ⇒ null.
    shared_bonus_amount: toFormNumber(r.shared_bonus_amount),
    shared_bonus_pct: null,
    shared_bonus_period_amount: toFormNumber(r.shared_bonus_amount),
    shared_bonus_prepaid_amount: 0,
    shared_bonus_to_sale_pct: null,
    bonus_note: '',
    fee_deduction: toFormNumber(r.fee_deduction),
    fee_deduction_to_sale_amount: null,
    deduction_note: '',
    extra_bonus_pct: toNullableFormNumber(r.extra_bonus_pct),
    extra_bonus_amount: toNullableFormNumber(r.extra_bonus_amount),
    // CTV has no independent extra-bonus progress — left null (Phần 4 hidden for CTV).
    extra_bonus_progress_from_pct: null,
    extra_bonus_progress_to_pct: null,
    amt_extra_bonus_payment_this_period: null,
    note: r.note ?? '',
  }
}

export function mapCTVSheetToFormValues(
  sheet: CTVReconciliationSheet
): CTVReconciliationSheetValues {
  const baseShape = {
    reconciliation_date: toDisplayDate(sheet.reconciliation_date),
    note: sheet.note ?? '',
  }

  const rows = sheet.reconciliations ?? []
  if (rows.length > 0) {
    return { ...baseShape, items: rows.map(reconciliationToFormValues) }
  }

  return { ...baseShape, items: [createEmptyInvestorReconciliationSheetItem()] }
}

/**
 * BE-computed totals per căn (keyed by product_inventory) từ `reconciliations[]`. CTV truyền map này
 * vào engine (line card + footer) để hiển thị Tổng/Thuế/Sau-thuế/sub_total ĐÚNG theo BE thay vì công
 * thức per-field FE. `commission_before_vat` của CTV = HH-đợt ⇒ map sang `period_commission` canonical.
 *
 * CTV theo model THUẾ TNCN (PIT), KHÔNG VAT: `total_amount` = phí TRƯỚC thuế, `pit_amount` = TNCN
 * khấu trừ, `total_amount_after_pit` = thực nhận sau thuế (`pit_rate` = mức %). Engine hiển thị 3 số
 * này khi `taxMode === 'pit'`.
 */
export function buildCTVServerComputedByProductId(
  sheet: CTVReconciliationSheet
): Map<number, ReconServerComputed> {
  const map = new Map<number, ReconServerComputed>()
  for (const r of sheet.reconciliations ?? []) {
    const productId = r.product_inventory ?? r.product_inventory_detail?.id
    if (productId == null) continue
    map.set(productId, {
      period_commission: r.commission_before_vat,
      sub_total_commission: r.sub_total_commission,
      total_amount: r.total_amount,
      pit_amount: r.pit_amount,
      total_amount_after_pit: r.total_amount_after_pit,
      pit_rate: r.pit_rate,
      retroactive_adjustment_amount: r.retroactive_adjustment_amount,
    })
  }
  return map
}

/* ----------------------------------------------------------------------------------------------- */
/* Canonical form values → CTV PATCH payload (subset)                                              */
/* ----------------------------------------------------------------------------------------------- */

function toPayloadItems(items: CTVReconciliationSheetItemValues[]) {
  // Only the CTV-editable subset. period_type / progress / retroactive are BE-managed (inherited from
  // the parent CĐT) — never sent.
  return items.map((item) => ({
    product_inventory_id: item.product_inventory_id,
    reconciliation_type: item.reconciliation_type,
    fee_calculation_price: toDecimalString(item.fee_calculation_price),
    pct_commission: toDecimalString(item.pct_agency_fee),
    amt_agency_fee: toNullableDecimalString(item.amt_agency_fee),
    amt_payment_this_period: toDecimalString(item.amt_payment_this_period),
    shared_bonus_amount: toDecimalString(item.shared_bonus_amount),
    fee_deduction: toDecimalString(item.fee_deduction),
    extra_bonus_pct: toNullableDecimalString(item.extra_bonus_pct),
    extra_bonus_amount: toNullableDecimalString(item.extra_bonus_amount),
    note: item.note ?? undefined,
  }))
}

export function toPatchCTVReconciliationSheetPayload(
  values: CTVReconciliationSheetValues
): PartialUpdateCTVReconciliationSheetRequest {
  // Edit page only allows this call while the sheet is still `draft` (see
  // CTVReconciliationEditPage's status guard). `status` KHÔNG nằm trong body PATCH nữa — BE chỉ đổi
  // trạng thái qua endpoint transition riêng, gửi kèm ở đây chỉ là echo vô nghĩa.
  return {
    reconciliation_date: toServerDate(values.reconciliation_date),
    note: values.note || undefined,
    items: toPayloadItems(values.items),
  }
}
