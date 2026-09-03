import { format, parse } from 'date-fns'

import { CTVReconciliationPeriod_type, type paths } from '@/api/schema'
import { DATE_FORMAT, DATE_SERVER_FORMAT } from '@/constants/date-format'
import {
  toDocTotalPayload,
  type DocTotalFormValues,
} from '@/features/sales/_shared/reconciliation/recon-document-total-check'
import {
  createEmptyInvestorReconciliationSheetItem,
  INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE,
  type InvestorReconciliationSheetCreateItemValues,
  type InvestorReconciliationSheetCreateValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import type {
  InvestorReconciliationFormRowSource,
  InvestorReconciliationSheetFormSource,
  InvestorReconciliationSheetItem,
} from '@/features/sales/investor-reconciliations/types/investor-reconciliation'

/**
 * Investor (CĐT) payload adapter — the ONLY layer that knows the investor wire contract. Maps the
 * canonical (rich) form model ⇄ the investor reconciliation-sheet request/response shapes.
 *
 * Kept out of the canonical `recon-sheet-schema.ts` so the shared engine model stays domain-neutral;
 * F2/CTV provide their own adapters (field renames, counterparty swap) against this same form model.
 */

const toDecimalString = (n: number | null | undefined) =>
  n === undefined || n === null ? '0' : String(n)
const toNullableDecimalString = (n: number | null | undefined) =>
  n === undefined || n === null ? null : String(n)
/** Optional money: omit (undefined) when not set, so BE can compute/skip. */
const toOptionalDecimalString = (n: number | null | undefined) =>
  n === undefined || n === null ? undefined : String(n)

function toServerDate(value: string) {
  if (!value) return undefined
  const parsed = parse(value, DATE_FORMAT, new Date())
  if (Number.isNaN(parsed.getTime())) return undefined
  return format(parsed, DATE_SERVER_FORMAT)
}

function toDisplayDate(value: string | undefined | null) {
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

type CreateInvestorReconciliationSheetRequest =
  paths['/api/sales/investor-reconciliation-sheets/']['post']['requestBody']['content']['application/json']

type UpdateInvestorReconciliationSheetRequest =
  paths['/api/sales/investor-reconciliation-sheets/{id}/']['put']['requestBody']['content']['application/json']

function toPayloadItems(items: InvestorReconciliationSheetCreateItemValues[]) {
  return items.map((item) => ({
    product_inventory_id: item.product_inventory_id,
    reconciliation_type: item.reconciliation_type,
    period_type: item.period_type,
    fee_calculation_price: toDecimalString(item.fee_calculation_price),
    commission_fee_calculation_price: toNullableDecimalString(
      item.commission_fee_calculation_price
    ),
    pct_agency_fee: toNullableDecimalString(item.pct_agency_fee),
    amt_agency_fee: toNullableDecimalString(item.amt_agency_fee),
    vat_rate: toOptionalDecimalString(item.vat_rate), // luôn có mặt (mặc định 10) — null chỉ là phòng hộ
    is_agency_fee_include_vat: item.is_agency_fee_include_vat,
    is_extra_bonus_include_vat: item.is_extra_bonus_include_vat,
    is_shared_bonus_include_vat: item.is_shared_bonus_include_vat,
    is_fee_deduction_include_vat: item.is_fee_deduction_include_vat,
    pct_period_commission: toNullableDecimalString(item.pct_period_commission),
    amt_period_commission: toNullableDecimalString(item.amt_period_commission),
    // progress_from_pct / progress_to_pct: BE tính & trả readonly — KHÔNG gửi.
    amt_payment_this_period: toOptionalDecimalString(item.amt_payment_this_period),
    // Truy hồi FE tính & gửi lên (chốt với BE 2026-06-16) — write-back từ LineCard. Có thể âm.
    retroactive_adjustment_amount: toNullableDecimalString(item.retroactive_adjustment_amount),
    shared_bonus_amount: toDecimalString(item.shared_bonus_amount),
    shared_bonus_pct: toNullableDecimalString(item.shared_bonus_pct),
    shared_bonus_period_amount: toDecimalString(item.shared_bonus_period_amount),
    shared_bonus_prepaid_amount: toDecimalString(item.shared_bonus_prepaid_amount),
    shared_bonus_to_sale_pct: toNullableDecimalString(item.shared_bonus_to_sale_pct),
    bonus_note: item.bonus_note,
    fee_deduction: toDecimalString(item.fee_deduction),
    fee_deduction_to_sale_amount: toNullableDecimalString(item.fee_deduction_to_sale_amount),
    deduction_note: item.deduction_note,
    extra_bonus_pct: toNullableDecimalString(item.extra_bonus_pct),
    extra_bonus_amount: toNullableDecimalString(item.extra_bonus_amount),
    extra_bonus_progress_from_pct: toNullableDecimalString(item.extra_bonus_progress_from_pct),
    extra_bonus_progress_to_pct: toNullableDecimalString(item.extra_bonus_progress_to_pct),
    amt_extra_bonus_payment_this_period: toNullableDecimalString(
      item.amt_extra_bonus_payment_this_period
    ),
    note: item.note,
  }))
}

// NOTE: create (POST) and update (PUT) bodies are identical today but kept as two functions on
// purpose — they have distinct generated request types, so if BE diverges (e.g. partial PUT) only
// one side changes. Do not collapse into one.
export function toCreateInvestorReconciliationSheetPayload(
  values: InvestorReconciliationSheetCreateValues
): CreateInvestorReconciliationSheetRequest {
  return {
    project_id: values.project_id,
    source_type: values.source_type,
    source_exchange_id: values.source_exchange_id,
    reconciliation_date: toServerDate(values.reconciliation_date),
    note: values.note,
    items: toPayloadItems(values.items),
  }
}

/**
 * Tạo phiếu (bước 1, sheet-first): chỉ gửi THÔNG TIN CHUNG, KHÔNG kèm `items`. Người dùng thêm từng
 * căn ở màn Edit qua các endpoint `/lines/`. `items` optional trong request schema nên bỏ qua là hợp lệ.
 */
export function toCreateInvestorReconciliationSheetMetaPayload(
  values: InvestorReconciliationSheetCreateValues
): CreateInvestorReconciliationSheetRequest {
  return {
    project_id: values.project_id,
    source_type: values.source_type,
    source_exchange_id: values.source_exchange_id,
    reconciliation_date: toServerDate(values.reconciliation_date),
    note: values.note,
  }
}

export function toUpdateInvestorReconciliationSheetPayload(
  values: InvestorReconciliationSheetCreateValues
): UpdateInvestorReconciliationSheetRequest {
  return {
    project_id: values.project_id,
    source_type: values.source_type,
    source_exchange_id: values.source_exchange_id,
    reconciliation_date: toServerDate(values.reconciliation_date),
    note: values.note,
    items: toPayloadItems(values.items),
  }
}

/**
 * Edit-mode (sheet-first / per-line) update: persist ONLY the sheet metadata. Each căn is its own
 * IR row managed independently via the nested ``/lines/`` endpoints, so resending ``items[]`` here
 * would re-run the legacy batch upsert against rows already owned by ``/lines/`` (risk of duplicate
 * căn). ``items`` is optional in the request schema, so omitting it leaves the lines untouched.
 */
export function toUpdateInvestorReconciliationSheetMetaPayload(
  values: InvestorReconciliationSheetCreateValues,
  /**
   * "Tổng theo chứng từ CĐT" — hai field khai riêng vì chúng KHÔNG thuộc model form dùng chung của
   * engine đối chiếu (F2/CTV không có chúng). Bỏ qua tham số này thì payload không đụng tới hai
   * field đó; truyền vào thì gửi cả hai, kể cả cặp `null` để XOÁ con số đã khai.
   */
  docTotal?: DocTotalFormValues
): UpdateInvestorReconciliationSheetRequest {
  return {
    project_id: values.project_id,
    source_type: values.source_type,
    source_exchange_id: values.source_exchange_id,
    reconciliation_date: toServerDate(values.reconciliation_date),
    note: values.note,
    ...(docTotal ? toDocTotalPayload(docTotal) : {}),
  }
}

/**
 * Map writable sheet item (batch `items[]` hoặc nested serializer) → canonical form row.
 * `progress_*` không có trên InvestorReconciliationSheetItem — chỉ hydrate từ reconciliation row.
 */
function sheetItemToFormValues(
  it: InvestorReconciliationSheetItem
): InvestorReconciliationSheetCreateItemValues {
  return {
    product_inventory_id: it.product_inventory_id,
    reconciliation_type: it.reconciliation_type,
    period_type: it.period_type ?? CTVReconciliationPeriod_type.normal_payment,
    fee_calculation_price: toFormNumber(it.fee_calculation_price),
    commission_fee_calculation_price: toNullableFormNumber(it.commission_fee_calculation_price),
    pct_agency_fee: toNullableFormNumber(it.pct_agency_fee),
    amt_agency_fee: toNullableFormNumber(it.amt_agency_fee),
    vat_rate: toNullableFormNumber(it.vat_rate) ?? INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE,
    is_agency_fee_include_vat: it.is_agency_fee_include_vat ?? false,
    is_extra_bonus_include_vat: it.is_extra_bonus_include_vat ?? false,
    is_shared_bonus_include_vat: it.is_shared_bonus_include_vat ?? false,
    is_fee_deduction_include_vat: it.is_fee_deduction_include_vat ?? false,
    progress_from_pct: null,
    progress_to_pct: null,
    pct_period_commission: toNullableFormNumber(it.pct_period_commission),
    amt_period_commission: toNullableFormNumber(it.amt_period_commission),
    amt_payment_this_period: null,
    retroactive_adjustment_amount: toNullableFormNumber(it.retroactive_adjustment_amount),
    shared_bonus_amount: toFormNumber(it.shared_bonus_amount),
    shared_bonus_pct: toNullableFormNumber(it.shared_bonus_pct),
    shared_bonus_period_amount: toFormNumber(it.shared_bonus_period_amount),
    shared_bonus_prepaid_amount: 0,
    shared_bonus_to_sale_pct: toNullableFormNumber(it.shared_bonus_to_sale_pct),
    bonus_note: it.bonus_note ?? '',
    fee_deduction: toFormNumber(it.fee_deduction),
    fee_deduction_to_sale_amount: toNullableFormNumber(it.fee_deduction_to_sale_amount),
    deduction_note: it.deduction_note ?? '',
    extra_bonus_pct: toNullableFormNumber(it.extra_bonus_pct),
    extra_bonus_amount: toNullableFormNumber(it.extra_bonus_amount),
    extra_bonus_progress_from_pct: toNullableFormNumber(it.extra_bonus_progress_from_pct),
    extra_bonus_progress_to_pct: toNullableFormNumber(it.extra_bonus_progress_to_pct),
    amt_extra_bonus_payment_this_period: null,
    note: it.note ?? '',
  }
}

/** Map nested reconciliation row (read serializer) → canonical form row. */
function reconciliationToFormValues(
  r: InvestorReconciliationFormRowSource
): InvestorReconciliationSheetCreateItemValues {
  return {
    product_inventory_id: r.product_inventory,
    reconciliation_type: r.reconciliation_type ?? undefined,
    period_type: r.period_type ?? CTVReconciliationPeriod_type.normal_payment,
    fee_calculation_price: toFormNumber(r.fee_calculation_price),
    commission_fee_calculation_price: toNullableFormNumber(r.commission_fee_calculation_price),
    pct_agency_fee: toNullableFormNumber(r.pct_agency_fee),
    amt_agency_fee: toNullableFormNumber(r.amt_agency_fee),
    vat_rate: toNullableFormNumber(r.vat_rate) ?? INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE,
    is_agency_fee_include_vat: r.is_agency_fee_include_vat ?? false,
    is_extra_bonus_include_vat: r.is_extra_bonus_include_vat ?? false,
    is_shared_bonus_include_vat: r.is_shared_bonus_include_vat ?? false,
    is_fee_deduction_include_vat: r.is_fee_deduction_include_vat ?? false,
    progress_from_pct: toNullableFormNumber(r.progress_from_pct),
    progress_to_pct: toNullableFormNumber(r.progress_to_pct),
    pct_period_commission: toNullableFormNumber(r.pct_period_commission),
    amt_period_commission: toNullableFormNumber(r.amt_period_commission),
    amt_payment_this_period: toNullableFormNumber(r.total_amount),
    retroactive_adjustment_amount: toNullableFormNumber(r.retroactive_adjustment_amount),
    shared_bonus_amount: toFormNumber(r.shared_bonus_amount),
    shared_bonus_pct: toNullableFormNumber(r.shared_bonus_pct),
    shared_bonus_period_amount: toFormNumber(r.shared_bonus_period_amount),
    shared_bonus_prepaid_amount: 0,
    shared_bonus_to_sale_pct: toNullableFormNumber(r.shared_bonus_to_sale_pct),
    bonus_note: r.bonus_note ?? '',
    fee_deduction: toFormNumber(r.fee_deduction),
    fee_deduction_to_sale_amount: toNullableFormNumber(r.fee_deduction_to_sale_amount),
    deduction_note: r.deduction_note ?? '',
    extra_bonus_pct: toNullableFormNumber(r.extra_bonus_pct),
    extra_bonus_amount: toNullableFormNumber(r.extra_bonus_amount),
    extra_bonus_progress_from_pct: toNullableFormNumber(r.extra_bonus_progress_from_pct),
    extra_bonus_progress_to_pct: toNullableFormNumber(r.extra_bonus_progress_to_pct),
    amt_extra_bonus_payment_this_period: toNullableFormNumber(r.extra_bonus_period_amount),
    note: r.note ?? '',
  }
}

export function mapSheetToFormValues(
  sheet: InvestorReconciliationSheetFormSource
): InvestorReconciliationSheetCreateValues {
  const baseShape = {
    project_id: sheet.project_detail.id,
    source_type: sheet.source_type,
    source_exchange_id: sheet.source_exchange_detail?.id ?? undefined,
    reconciliation_date: toDisplayDate(sheet.reconciliation_date),
    note: sheet.note ?? '',
  }

  if (sheet.items && sheet.items.length > 0) {
    return { ...baseShape, items: sheet.items.map(sheetItemToFormValues) }
  }

  return {
    ...baseShape,
    items:
      (sheet.reconciliations?.length ?? 0) > 0
        ? sheet.reconciliations!.map(reconciliationToFormValues)
        : [createEmptyInvestorReconciliationSheetItem()],
  }
}
