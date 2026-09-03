import { format, parse } from 'date-fns'

import { CTVReconciliationPeriod_type } from '@/api/schema'
import { DATE_FORMAT, DATE_SERVER_FORMAT } from '@/constants/date-format'
import {
  INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE,
  createEmptyInvestorReconciliationSheetItem,
  type InvestorReconciliationSheetCreateItemValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import type {
  F2Reconciliation,
  F2ReconciliationSheet,
  F2ReconciliationSheetWritableItem,
} from '@/features/sales/f2-reconciliations/types/f2-reconciliation'
import type {
  F2ReconciliationSheetValues,
  F2ReconciliationSheetItemValues,
} from '@/features/sales/f2-reconciliations/schemas/f2-reconciliation-sheet-create-schema'
import type { UpdateF2ReconciliationSheetRequest } from '@/features/sales/f2-reconciliations/services/f2-reconciliation-service'
import type { ReconServerComputed } from '@/features/sales/_shared/reconciliation/useReconLineDerived'

/**
 * F2 (Sàn F2) payload adapter — the ONLY layer that knows the F2 wire contract. Maps the CANONICAL
 * (investor-superset) form model ⇄ the F2 reconciliation-sheet response/request shapes.
 *
 * F2 keeps the rich CĐT card tree (so it reuses ReconConfigTable / header / derived verbatim) but its
 * wire shape differs: counterparty is `exchange`, the editable rate field is `pct_commission`
 * (← canonical `pct_agency_fee`), the inclusive-VAT flag is `is_commission_include_vat`
 * (← canonical `is_agency_fee_include_vat`), and F2 has NO `vat_rate` / A' / `*_to_sale` / extra-progress
 * fields (they default to 10% / null). period_type / progress / retroactive / per-field VAT flags are
 * inherited read-only from the parent CĐT — present in the response, NOT in the update payload subset.
 */

const toDecimalString = (n: number | null | undefined) =>
  n === undefined || n === null ? '0' : String(n)
const toNullableDecimalString = (n: number | null | undefined) =>
  n === undefined || n === null ? null : String(n)
const toOptionalDecimalString = (n: number | null | undefined) =>
  n === undefined || n === null ? undefined : String(n)

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
 * Map a generated F2 reconciliation row (rich read serializer) to the canonical line model. This is
 * the richest, always-present source for a saved F2 sheet — it carries BOTH the editable subset and
 * the inherited read-only fields (period_type / progress / retroactive / per-field VAT flags).
 */
function reconciliationToFormValues(
  r: F2Reconciliation
): InvestorReconciliationSheetCreateItemValues {
  return {
    product_inventory_id: r.product_inventory ?? r.product_inventory_detail?.id ?? 0,
    reconciliation_type: r.reconciliation_type ?? undefined,
    period_type: r.period_type ?? CTVReconciliationPeriod_type.normal_payment,
    fee_calculation_price: toFormNumber(r.fee_calculation_price),
    // F2 has no internal Sale/F2 price (A') — always null.
    commission_fee_calculation_price: null,
    pct_agency_fee: toNullableFormNumber(r.pct_commission),
    amt_agency_fee: toNullableFormNumber(r.amt_agency_fee),
    // F2 has no explicit vat_rate field — VAT always applies at the default 10%; the is_*_include_vat
    // flags only say whether each input already includes it.
    vat_rate: INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE,
    is_agency_fee_include_vat: r.is_commission_include_vat ?? false,
    is_extra_bonus_include_vat: r.is_extra_bonus_include_vat ?? false,
    is_shared_bonus_include_vat: r.is_shared_bonus_include_vat ?? false,
    is_fee_deduction_include_vat: r.is_fee_deduction_include_vat ?? false,
    progress_from_pct: toNullableFormNumber(r.progress_from_pct),
    progress_to_pct: toNullableFormNumber(r.progress_to_pct),
    pct_period_commission: null,
    amt_period_commission: null,
    amt_payment_this_period: toNullableFormNumber(r.amt_payment_this_period),
    // Inherited read-only — mirror parent's frozen retro scaled to this F2 row (F2 không tự gửi).
    retroactive_adjustment_amount: toNullableFormNumber(r.retroactive_adjustment_amount),
    // F2 chỉ có `shared_bonus_amount` (phần thưởng đại lý chia về F2, prefill từ CĐT cha, read-only).
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
    // F2 has no independent extra-bonus progress — left null (Phần 4 progress hidden for F2).
    extra_bonus_progress_from_pct: null,
    extra_bonus_progress_to_pct: null,
    amt_extra_bonus_payment_this_period: null,
    note: r.note ?? '',
  }
}

/**
 * Fallback mapper for the rare case where only the writable `items` echo is present (no generated
 * `reconciliations`). Editable fields only — period_type / progress / VAT flags default (the rich
 * read-only context simply isn't available yet).
 */
function writableItemToFormValues(
  it: F2ReconciliationSheetWritableItem
): InvestorReconciliationSheetCreateItemValues {
  return {
    ...createEmptyInvestorReconciliationSheetItem(),
    product_inventory_id: it.product_inventory_id,
    reconciliation_type: it.reconciliation_type ?? undefined,
    fee_calculation_price: toFormNumber(it.fee_calculation_price),
    pct_agency_fee: toNullableFormNumber(it.pct_commission),
    amt_agency_fee: toNullableFormNumber(it.amt_agency_fee),
    amt_payment_this_period: toNullableFormNumber(it.amt_payment_this_period),
    shared_bonus_amount: toFormNumber(it.shared_bonus_amount),
    shared_bonus_period_amount: toFormNumber(it.shared_bonus_amount),
    shared_bonus_prepaid_amount: 0,
    fee_deduction: toFormNumber(it.fee_deduction),
    extra_bonus_pct: toNullableFormNumber(it.extra_bonus_pct),
    extra_bonus_amount: toNullableFormNumber(it.extra_bonus_amount),
    note: it.note ?? '',
  }
}

export function mapF2SheetToFormValues(sheet: F2ReconciliationSheet): F2ReconciliationSheetValues {
  const baseShape = {
    exchange_id: sheet.exchange_detail?.id ?? 0,
    sales_allocation_id: sheet.sales_allocation_detail?.id ?? 0,
    reconciliation_date: toDisplayDate(sheet.reconciliation_date),
    note: sheet.note ?? '',
  }

  const rows = sheet.reconciliations ?? []
  if (rows.length > 0) {
    return { ...baseShape, items: rows.map(reconciliationToFormValues) }
  }

  const writableItems = sheet.items
  if (writableItems && writableItems.length > 0) {
    return { ...baseShape, items: writableItems.map(writableItemToFormValues) }
  }

  return { ...baseShape, items: [createEmptyInvestorReconciliationSheetItem()] }
}

/**
 * BE-computed totals per căn (keyed by product_inventory) từ `reconciliations[]`. F2 truyền map này
 * vào engine (line card + summary + footer) để hiển thị NET/Phải-thu/sub_total ĐÚNG theo BE, thay vì
 * công thức per-field FE (vốn KHÔNG mô tả đúng cách BE tính tổng cho F2 — xem `project_f2_recon_ui_gaps`).
 * `commission_before_vat` của F2 = HH-đợt ⇒ map sang `period_commission` canonical.
 */
export function buildF2ServerComputedByProductId(
  sheet: F2ReconciliationSheet
): Map<number, ReconServerComputed> {
  const map = new Map<number, ReconServerComputed>()
  for (const r of sheet.reconciliations ?? []) {
    const productId = r.product_inventory ?? r.product_inventory_detail?.id
    if (productId == null) continue
    map.set(productId, {
      period_commission: r.commission_before_vat,
      sub_total_commission: r.sub_total_commission,
      total_amount: r.total_amount,
      vat_amount: r.vat_amount,
      total_amount_with_vat: r.total_amount_with_vat,
      retroactive_adjustment_amount: r.retroactive_adjustment_amount,
    })
  }
  return map
}

/* ----------------------------------------------------------------------------------------------- */
/* Canonical form values → F2 update payload (subset)                                              */
/* ----------------------------------------------------------------------------------------------- */

function toPayloadItems(items: F2ReconciliationSheetItemValues[]) {
  // Only the F2-editable subset (F2ReconciliationSheetItemRequest). period_type / progress /
  // VAT flags / retroactive are BE-managed (inherited from the parent CĐT) — never sent.
  return items.map((item) => ({
    product_inventory_id: item.product_inventory_id,
    reconciliation_type: item.reconciliation_type,
    fee_calculation_price: toDecimalString(item.fee_calculation_price),
    // pct_commission is `string` (NOT nullable) in F2ReconciliationSheetItemRequest — omit when unset.
    pct_commission: toOptionalDecimalString(item.pct_agency_fee),
    amt_agency_fee: toNullableDecimalString(item.amt_agency_fee),
    amt_payment_this_period: toOptionalDecimalString(item.amt_payment_this_period),
    shared_bonus_amount: toDecimalString(item.shared_bonus_amount),
    extra_bonus_pct: toNullableDecimalString(item.extra_bonus_pct),
    extra_bonus_amount: toNullableDecimalString(item.extra_bonus_amount),
    fee_deduction: toDecimalString(item.fee_deduction),
    note: item.note,
  }))
}

export function toUpdateF2ReconciliationSheetPayload(
  values: F2ReconciliationSheetValues
): UpdateF2ReconciliationSheetRequest {
  // Edit page only allows this call while the sheet is still `draft` (see
  // F2ReconciliationEditPage's status guard). `status` KHÔNG nằm trong body PUT nữa — BE chỉ đổi
  // trạng thái qua endpoint transition riêng, gửi kèm ở đây chỉ là echo vô nghĩa.
  return {
    sales_allocation_id: values.sales_allocation_id,
    exchange_id: values.exchange_id,
    reconciliation_date: toServerDate(values.reconciliation_date),
    note: values.note,
    items: toPayloadItems(values.items),
  }
}
