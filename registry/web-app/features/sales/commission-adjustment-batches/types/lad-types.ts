/**
 * LAD types — request/response aliases from the generated OpenAPI schema, plus FE-owned Zod
 * schemas for the two free-form JSON blobs the BE types as `unknown`: `filter_criteria`
 * (scope) and `payload_snapshot` (config). Shapes follow LoApDung-API-Usage.md §1.3 + §2.2.
 */
import { z } from 'zod'
import { components, paths } from '@/api/schema'
import { formatDateToApi } from '@/utils/date-utils'

// ----------------------------------------------------------------------
// Server types (NGUỒN SỰ THẬT shape)
// ----------------------------------------------------------------------
export type LadBatchList = components['schemas']['CommissionAdjustmentBatchList']
export type LadBatchDetail = components['schemas']['CommissionAdjustmentBatchDetail']
export type LadBatchLine = components['schemas']['CommissionAdjustmentBatchLine']
/** File đã confirm từ `/api/files/confirm/` (tránh nhầm với `File` của browser). */
export type LadAttachmentFile = components['schemas']['File']
export type LadLinesSummary = components['schemas']['LadLinesSummary']
export type LadPreviewResult = components['schemas']['PreviewResult']
export type LadPreviewLine = components['schemas']['PreviewLine']
/** One affected F2 (sàn liên kết) + its currently-applied commission/bonus/deduction rate. */
export type LadF2AppliedRate = components['schemas']['LadF2AppliedRate']

export type GetLadBatchesParams =
  paths['/api/sales/commission-adjustment-batches/']['get']['parameters']['query']

/**
 * List query as the SA-tab uses it. The generated query type (doc §7) is GLOBAL — it exposes no
 * `sales_allocation` filter, and the list item carries no `filter_criteria` to filter client-side.
 * We pass `sales_allocation` optimistically (the feature is inherently SA-scoped); if the BE ignores
 * it the list degrades to all batches — flagged for BE confirmation. See plan risks.
 */
export type LadBatchListQuery = GetLadBatchesParams & { sales_allocation?: number }
export type CreateLadBatchRequest = NonNullable<
  paths['/api/sales/commission-adjustment-batches/']['post']['requestBody']
>['content']['application/json']
export type PatchLadBatchRequest = NonNullable<
  paths['/api/sales/commission-adjustment-batches/{id}/']['patch']['requestBody']
>['content']['application/json']
export type GetLadLinesParams =
  paths['/api/sales/commission-adjustment-batches/{id}/lines/']['get']['parameters']['query']
export type GetLadF2sParams =
  paths['/api/sales/commission-adjustment-batches/{id}/f2s/']['get']['parameters']['query']
export type CreateLadLineRequest =
  paths['/api/sales/commission-adjustment-batches/{id}/lines/']['post']['requestBody']['content']['application/json']
export type PatchLadLineRequest = NonNullable<
  paths['/api/sales/commission-adjustment-batches/{id}/lines/{line_id}/']['patch']['requestBody']
>['content']['application/json']
export type ApproveLadRequest = NonNullable<
  paths['/api/sales/commission-adjustment-batches/{id}/approve/']['post']['requestBody']
>['content']['application/json']
export type RejectLadRequest =
  paths['/api/sales/commission-adjustment-batches/{id}/reject/']['post']['requestBody']['content']['application/json']

// ----------------------------------------------------------------------
// filter_criteria (FE-owned — BE stores as unknown). §1.3
// `sales_allocation_id` + `project_id` are pinned to the host SA detail page.
// ----------------------------------------------------------------------
const apiDate = z.preprocess(
  (val) => (val != null && val !== '' ? formatDateToApi(val as Date | string) : null),
  z.string().nullish()
)

export const ladFilterCriteriaSchema = z.object({
  project_id: z.number().nullish(),
  sales_allocation_id: z.number().nullish(),
  product_inventory_id: z.number().nullish(),
  effective_from: apiDate,
  effective_to: apiDate,
  exchange_id: z.number().nullish(),
  sale_type: z.array(z.string()).nullish(),
  /**
   * Tên lô (legacy) — chỉ còn ĐỌC fallback cho lô nháp tạo trước khi đổi. Wizard (Bước 4) nay gửi
   * field `name` thật; cột "Tên lô" ở list + seed Bước 4 ưu tiên `name`, rơi về `batch_title` cho lô cũ.
   */
  batch_title: z.string().nullish(),
})
export type LadFilterCriteria = z.infer<typeof ladFilterCriteriaSchema>

// ----------------------------------------------------------------------
// payload_snapshot (FE-owned — BE stores as unknown). §2.2
// Every monetary field is a number (CurrencyInput emits number) — never a formatted string.
// ----------------------------------------------------------------------
const num = z.number().nullish()
const flag = z.boolean().nullish()

/** RateSpec request (nguồn sự thật của "Hoa hồng F2" khi nhập phân số / %); XOR với pct/amt. */
type RateSpecRequest = components['schemas']['RateSpecRequest']

export const ladF2OverrideSchema = z.object({
  // Hoa hồng F2: spec (phân số / % trực tiếp) là nguồn sự thật. Khi có spec, BE bắt buộc pct/amt = null
  // (XOR — xem JSDoc schema). Nhánh ₫-trực-tiếp không có spec ⇒ chỉ giữ amt_f2_commission.
  pct_f2_commission_spec: z.custom<RateSpecRequest>().nullish(),
  pct_f2_commission: num,
  amt_f2_commission: num,
  is_f2_commission_include_vat: flag, // null ⇒ BE cascades from agency-fee VAT
  pct_f2_bonus: num,
  amt_f2_bonus: num,
  is_f2_bonus_include_vat: flag,
  pct_f2_inventory_hold: num,
})
export type LadF2Override = z.infer<typeof ladF2OverrideSchema>

export const ladManagementRateSchema = z.object({
  role: z.string(),
  category: z.string(),
  pct: num,
  amt: num,
})

/** %↔amt mutually-exclusive pairs enforced by {@link ladPayloadSnapshotSchema}. */
const PCT_AMT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['pct_agency_fee', 'amt_agency_fee'],
  ['pct_investor_bonus', 'amt_investor_bonus'],
  ['pct_sale_commission', 'amt_sale_commission'],
  ['pct_investor_bonus_to_sale', 'amt_investor_bonus_to_sale'],
  ['pct_revenue', 'amt_revenue'],
  ['pct_kpi_revenue_slk', 'amt_kpi_revenue_slk'],
]

export const ladPayloadSnapshotSchema = z
  .object({
    pct_agency_fee: num,
    amt_agency_fee: num,
    is_agency_fee_include_vat: flag,
    pct_investor_bonus: num,
    amt_investor_bonus: num,
    is_investor_bonus_include_vat: flag,
    pct_shared_bonus: num,
    amt_shared_bonus: num,
    is_shared_bonus_include_vat: flag,
    pct_sale_commission: num,
    amt_sale_commission: num,
    // Thưởng sale (investor_bonus_to_sale): Sale items luôn no-VAT (§2.2) — không có VAT flag.
    // mv_bonus_to_sale (Thưởng nóng) đã bỏ khỏi LADPayloadSnapshotRequest (kênh mv_bonus tạm tắt ở BE).
    pct_investor_bonus_to_sale: num,
    amt_investor_bonus_to_sale: num,
    // Thưởng MV: chỉ có số tiền, không có cặp % nên không nằm trong PCT_AMT_PAIRS.
    // LAD ghi TỔNG của giao dịch (payload full-replace), không ghi phần cộng thêm.
    amt_staff_incentive: num,
    pct_revenue: num,
    amt_revenue: num,
    // Doanh thu KPI Sàn liên kết (dự án tổng đại lý): cơ sở doanh thu NỘI BỘ của phòng SLK,
    // không liên quan phí đại lý CĐT trả nên không nằm trong kiểm tra pct_revenue ≤ pct_agency_fee.
    pct_kpi_revenue_slk: num,
    amt_kpi_revenue_slk: num,
    f2_overrides_by_exchange: z.record(z.string(), ladF2OverrideSchema).optional(),
    management_rates: z.array(ladManagementRateSchema).optional(),
  })
  .superRefine((val, ctx) => {
    const record = val as Record<string, unknown>
    for (const [pctKey, amtKey] of PCT_AMT_PAIRS) {
      if (record[pctKey] != null && record[amtKey] != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Chỉ nhập % hoặc số tiền cho mỗi khoản',
          path: [amtKey],
        })
      }
    }
    // pct_revenue ≤ pct_agency_fee (khi cả hai là %). BE also enforces → 400 revenue_exceeds_agency_fee.
    if (
      val.pct_revenue != null &&
      val.pct_agency_fee != null &&
      val.pct_revenue > val.pct_agency_fee
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tỉ lệ doanh thu không được vượt quá phí đại lý',
        path: ['pct_revenue'],
      })
    }
  })
export type LadPayloadSnapshot = z.infer<typeof ladPayloadSnapshotSchema>

// ----------------------------------------------------------------------
// Bước 4 — reason + attachments
// ----------------------------------------------------------------------
export const ladReasonSchema = z.object({
  reason: z.string().nullish(),
  override_locked: z.boolean().nullish(),
  attachments: z.array(z.number()).nullish(),
})
export type LadReasonFormValues = z.infer<typeof ladReasonSchema>

// ----------------------------------------------------------------------
// Submit-error UI state (mapped from API 400 payloads). §4.3
// ----------------------------------------------------------------------
export interface LadSubmitErrorState {
  /** GD ids still `expected` — highlight + force confirm/remove. */
  unconfirmedDealIds?: number[]
  /** payload violated revenue ≤ agency fee. */
  revenueExceedsAgencyFee?: boolean
}
