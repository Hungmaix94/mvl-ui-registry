import { CTVReconciliationPeriod_type } from '@/api/schema'
import type { components } from '@/api/schema'
import {
  INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE,
  type InvestorReconciliationSheetCreateItemValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'

/**
 * Per-line (per-"căn") payload adapter for the nested
 * ``/investor-reconciliation-sheets/{id}/lines/`` endpoints (v6 sheet-first
 * flow). Maps one canonical form item ⇄ the line create / patch wire shapes.
 */

type LineCreateRequest = components['schemas']['InvestorReconciliationSheetItemRequest']
type LinePatchRequest = components['schemas']['PatchedInvestorReconciliationRequest']
type LineRow = components['schemas']['InvestorReconciliation']

const toDecimalString = (n: number | null | undefined) =>
  n === undefined || n === null ? '0' : String(n)
const toNullableDecimalString = (n: number | null | undefined) =>
  n === undefined || n === null ? null : String(n)
const toOptionalDecimalString = (n: number | null | undefined) =>
  n === undefined || n === null ? undefined : String(n)

const toNum = (v: string | number | null | undefined): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v)

/**
 * GAP 4b — gắn "Tổng tiền có VAT của dòng (theo bảng kê CĐT)" vào body.
 *
 * TODO(schema): `total_amount_with_vat` là field GHI-ONLY, BE nhận nhưng chưa xuất hiện trong
 * `InvestorReconciliationSheetItemRequest` / `PatchedInvestorReconciliationRequest` của
 * `src/api/schema.ts`. Ép kiểu ở ĐÚNG MỘT chỗ này (AGENTS.md cho phép cast tại nơi dùng thay vì bịa
 * field vào type dùng chung); gỡ cast ngay sau `yarn api:update` kế tiếp.
 *
 * Bỏ trống ⇒ KHÔNG gửi field: BE hiểu là "không đối chiếu tổng dòng". Gửi `null`/`0` sẽ biến ô bỏ
 * trống thành một tuyên bố sai và BE từ chối cả dòng.
 */
function applyDocLineTotal(body: object, value: number | null | undefined) {
  if (value === null || value === undefined) return
  ;(body as Record<string, unknown>).total_amount_with_vat = String(value)
}

/** Map a /lines/ row (InvestorReconciliation) back to the canonical form item (edit load). */
export function lineRowToFormItem(row: LineRow): InvestorReconciliationSheetCreateItemValues {
  return {
    product_inventory_id: row.product_inventory,
    reconciliation_type: row.reconciliation_type ?? undefined,
    period_type: row.period_type ?? CTVReconciliationPeriod_type.normal_payment,
    fee_calculation_price:
      row.fee_calculation_price != null ? Number(row.fee_calculation_price) : null,
    commission_fee_calculation_price: toNum(row.commission_fee_calculation_price),
    pct_agency_fee: toNum(row.pct_agency_fee),
    amt_agency_fee: toNum(row.amt_agency_fee),
    vat_rate: toNum(row.vat_rate) ?? INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE,
    is_agency_fee_include_vat: row.is_agency_fee_include_vat ?? false,
    is_extra_bonus_include_vat: row.is_extra_bonus_include_vat ?? false,
    is_shared_bonus_include_vat: row.is_shared_bonus_include_vat ?? false,
    is_fee_deduction_include_vat: row.is_fee_deduction_include_vat ?? false,
    progress_from_pct: toNum(row.progress_from_pct),
    progress_to_pct: toNum(row.progress_to_pct),
    pct_period_commission: toNum(row.pct_period_commission),
    amt_period_commission: toNum(row.amt_period_commission),
    amt_payment_this_period: null,
    retroactive_adjustment_amount: toNum(row.retroactive_adjustment_amount),
    shared_bonus_amount: Number(row.shared_bonus_amount ?? 0),
    shared_bonus_pct: toNum(row.shared_bonus_pct),
    shared_bonus_period_amount: Number(row.shared_bonus_period_amount ?? 0),
    shared_bonus_to_sale_pct: toNum(row.shared_bonus_to_sale_pct),
    shared_bonus_prepaid_amount: Number(row.shared_bonus_prepaid_amount ?? 0),
    bonus_note: row.bonus_note ?? '',
    fee_deduction: Number(row.fee_deduction ?? 0),
    fee_deduction_to_sale_amount: toNum(row.fee_deduction_to_sale_amount),
    deduction_note: row.deduction_note ?? '',
    extra_bonus_pct: toNum(row.extra_bonus_pct),
    extra_bonus_amount: toNum(row.extra_bonus_amount),
    extra_bonus_progress_from_pct: toNum(row.extra_bonus_progress_from_pct),
    extra_bonus_progress_to_pct: toNum(row.extra_bonus_progress_to_pct),
    amt_extra_bonus_payment_this_period: toNum(row.extra_bonus_period_amount),
    // `total_amount_with_vat` là con số KIỂM TRA ghi-only: BE không trả lại, nên mở "Sửa căn" ô này
    // trống. Đó là đúng — kế toán gõ lại từ bảng kê nếu muốn kiểm tra tiếp, không phải mất dữ liệu.
    total_amount_with_vat: null,
    note: row.note ?? '',
  }
}

/** Build the create body for POST /…/lines/ from one canonical form item. */
export function toLineCreatePayload(
  item: InvestorReconciliationSheetCreateItemValues
): LineCreateRequest {
  const payload: LineCreateRequest = {
    product_inventory_id: item.product_inventory_id,
    reconciliation_type: item.reconciliation_type,
    period_type: item.period_type,
    commission_fee_calculation_price: toNullableDecimalString(
      item.commission_fee_calculation_price
    ),
    pct_agency_fee: toNullableDecimalString(item.pct_agency_fee),
    amt_agency_fee: toNullableDecimalString(item.amt_agency_fee),
    vat_rate: toOptionalDecimalString(item.vat_rate),
    is_agency_fee_include_vat: item.is_agency_fee_include_vat,
    is_extra_bonus_include_vat: item.is_extra_bonus_include_vat,
    is_shared_bonus_include_vat: item.is_shared_bonus_include_vat,
    is_fee_deduction_include_vat: item.is_fee_deduction_include_vat,
    pct_period_commission: toNullableDecimalString(item.pct_period_commission),
    amt_period_commission: toNullableDecimalString(item.amt_period_commission),
    // progress_from_pct / progress_to_pct: BE tính & trả readonly — KHÔNG gửi.
    // retroactive_adjustment_amount KHÔNG gửi: BE tự tính & trả readonly. FE chỉ hiển thị, không gửi.
    shared_bonus_amount: toDecimalString(item.shared_bonus_amount),
    shared_bonus_pct: toNullableDecimalString(item.shared_bonus_pct),
    shared_bonus_period_amount: toDecimalString(item.shared_bonus_period_amount),
    shared_bonus_to_sale_pct: toNullableDecimalString(item.shared_bonus_to_sale_pct),
    bonus_note: item.bonus_note,
    fee_deduction: toDecimalString(item.fee_deduction),
    fee_deduction_to_sale_amount: toNullableDecimalString(item.fee_deduction_to_sale_amount),
    deduction_note: item.deduction_note,
    shared_bonus_prepaid_amount: toDecimalString(item.shared_bonus_prepaid_amount),
    extra_bonus_pct: toNullableDecimalString(item.extra_bonus_pct),
    extra_bonus_amount: toNullableDecimalString(item.extra_bonus_amount),
    // `extra_bonus_progress_from_pct` KHÔNG còn nằm trong payload: BE đã đổi nó sang `read_only`
    // (mốc "từ" của khoảng thưởng thêm do BE tự suy ra từ tiến độ đã đối chiếu, không phải thứ
    // người dùng nhập). DRF bỏ qua giá trị client gửi cho field read-only, nên đây thuần là dọn
    // type — hành vi lúc chạy không đổi. Vế "đến" vẫn ghi được nên giữ nguyên.
    extra_bonus_progress_to_pct: toNullableDecimalString(item.extra_bonus_progress_to_pct),
    note: item.note,
  }
  if (item.fee_calculation_price != null) {
    payload.fee_calculation_price = toDecimalString(item.fee_calculation_price)
  }
  applyDocLineTotal(payload, item.total_amount_with_vat)
  return payload
}

/** Build the patch body for PATCH /…/lines/{id}/ — same field set, all optional. */
export function toLinePatchPayload(
  item: Partial<InvestorReconciliationSheetCreateItemValues>
): LinePatchRequest {
  const body: Partial<LinePatchRequest> = {}
  if (item.reconciliation_type !== undefined) body.reconciliation_type = item.reconciliation_type
  if (item.period_type !== undefined) body.period_type = item.period_type
  if (item.fee_calculation_price !== undefined && item.fee_calculation_price !== null)
    body.fee_calculation_price = toDecimalString(item.fee_calculation_price)
  if (item.commission_fee_calculation_price !== undefined)
    body.commission_fee_calculation_price = toNullableDecimalString(
      item.commission_fee_calculation_price
    )
  if (item.pct_agency_fee !== undefined)
    body.pct_agency_fee = toNullableDecimalString(item.pct_agency_fee)
  if (item.amt_agency_fee !== undefined)
    body.amt_agency_fee = toNullableDecimalString(item.amt_agency_fee)
  if (item.vat_rate !== undefined) body.vat_rate = toOptionalDecimalString(item.vat_rate)
  if (item.is_agency_fee_include_vat !== undefined)
    body.is_agency_fee_include_vat = item.is_agency_fee_include_vat
  if (item.is_extra_bonus_include_vat !== undefined)
    body.is_extra_bonus_include_vat = item.is_extra_bonus_include_vat
  if (item.is_shared_bonus_include_vat !== undefined)
    body.is_shared_bonus_include_vat = item.is_shared_bonus_include_vat
  if (item.is_fee_deduction_include_vat !== undefined)
    body.is_fee_deduction_include_vat = item.is_fee_deduction_include_vat
  if (item.pct_period_commission !== undefined)
    body.pct_period_commission = toNullableDecimalString(item.pct_period_commission)
  if (item.amt_period_commission !== undefined)
    body.amt_period_commission = toNullableDecimalString(item.amt_period_commission)
  if (item.shared_bonus_amount !== undefined)
    body.shared_bonus_amount = toDecimalString(item.shared_bonus_amount)
  if (item.shared_bonus_pct !== undefined)
    body.shared_bonus_pct = toNullableDecimalString(item.shared_bonus_pct)
  if (item.shared_bonus_period_amount !== undefined)
    body.shared_bonus_period_amount = toDecimalString(item.shared_bonus_period_amount)
  if (item.shared_bonus_to_sale_pct !== undefined)
    body.shared_bonus_to_sale_pct = toNullableDecimalString(item.shared_bonus_to_sale_pct)
  if (item.shared_bonus_prepaid_amount !== undefined)
    body.shared_bonus_prepaid_amount = toDecimalString(item.shared_bonus_prepaid_amount)
  if (item.bonus_note !== undefined) body.bonus_note = item.bonus_note
  if (item.fee_deduction !== undefined) body.fee_deduction = toDecimalString(item.fee_deduction)
  if (item.fee_deduction_to_sale_amount !== undefined)
    body.fee_deduction_to_sale_amount = toNullableDecimalString(item.fee_deduction_to_sale_amount)
  if (item.deduction_note !== undefined) body.deduction_note = item.deduction_note
  if (item.extra_bonus_pct !== undefined)
    body.extra_bonus_pct = toNullableDecimalString(item.extra_bonus_pct)
  if (item.extra_bonus_amount !== undefined)
    body.extra_bonus_amount = toNullableDecimalString(item.extra_bonus_amount)
  if (item.extra_bonus_progress_from_pct !== undefined)
    body.extra_bonus_progress_from_pct = toNullableDecimalString(item.extra_bonus_progress_from_pct)
  if (item.extra_bonus_progress_to_pct !== undefined)
    body.extra_bonus_progress_to_pct = toNullableDecimalString(item.extra_bonus_progress_to_pct)
  if (item.note !== undefined) body.note = item.note
  applyDocLineTotal(body, item.total_amount_with_vat)
  return body
}
