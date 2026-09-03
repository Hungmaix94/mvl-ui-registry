/**
 * LAD — Lô Áp Dụng (Điều chỉnh hoa hồng theo lô / DealCommissionAdjustmentBatch).
 *
 * Central constants for the feature: schema-enum aliases, permission codes, status
 * label/variant maps, the wizard view enum, and the Bước-2 config-matrix field metadata.
 *
 * Scope = luồng phê duyệt (submit → pending → approve/reject). Import-from-file out of scope.
 * Mockup-only concepts (kind/source/superseded/reversed/name) are intentionally NOT modelled —
 * the BE serializer has no such fields. See the plan's "Đối chiếu mockup vs BE".
 */
import {
  CommissionAdjustmentBatchLineLine_status as LadLineStatus,
  CommissionAdjustmentBatchLineSource as LadLineSource,
  ColoredValueVariant,
} from '@/api/schema'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { LadF2Status as LadBatchStatus } from '@/constants/api-schema-aliases'

export { LadBatchStatus, LadLineStatus, LadLineSource }

// ----------------------------------------------------------------------
// Permission codes — verified against schema.ts JSDoc (`deal_commission_adjustment_batch.*`).
// Consume via useAbility().can(action, LAD_SUBJECT). The CASL subject is the resource prefix.
// ----------------------------------------------------------------------
export const LAD_SUBJECT = 'deal_commission_adjustment_batch' as const

export const LAD_PERMISSIONS = {
  LIST: 'deal_commission_adjustment_batch.list',
  CREATE: 'deal_commission_adjustment_batch.create',
  RETRIEVE: 'deal_commission_adjustment_batch.retrieve',
  UPDATE: 'deal_commission_adjustment_batch.update',
  PARTIAL_UPDATE: 'deal_commission_adjustment_batch.partial_update',
  DESTROY: 'deal_commission_adjustment_batch.destroy',
  SUBMIT: 'deal_commission_adjustment_batch.submit',
  APPROVE: 'deal_commission_adjustment_batch.approve',
  REJECT: 'deal_commission_adjustment_batch.reject',
  CLONE: 'deal_commission_adjustment_batch.clone',
  PREVIEW: 'deal_commission_adjustment_batch.preview',
} as const

// ----------------------------------------------------------------------
// Status — UI label + colour variant.
//
// Labels: served by the backend `app_constants` under `DealCommissionAdjustmentBatch_Status`
// (module 'sales'); consume via `useAppConstant` + {@link LAD_STATUS_APP_CONSTANT_KEY} instead of a
// hardcoded map (the BE now exposes the key). Colour variant stays local (UI-only concern).
// ----------------------------------------------------------------------
export const LAD_STATUS_APP_CONSTANT_KEY = APP_CONSTANT_KEY.SALES.COMMISSION_ADJUSTMENT_BATCH.STATUS

export const LAD_STATUS_VARIANT: Record<LadBatchStatus, ColoredValueVariant> = {
  [LadBatchStatus.draft]: ColoredValueVariant.GREY,
  [LadBatchStatus.pending]: ColoredValueVariant.YELLOW,
  [LadBatchStatus.applied]: ColoredValueVariant.GREEN,
  [LadBatchStatus.rejected]: ColoredValueVariant.RED,
}

// Line (GD trong lô) status — UI naming per API-Usage §0 (Dự kiến / Xác nhận).
export const LAD_LINE_STATUS_LABEL: Record<LadLineStatus, string> = {
  [LadLineStatus.draft]: 'Dự kiến',
  [LadLineStatus.pending]: 'Chờ duyệt',
  [LadLineStatus.applied]: 'Đã áp dụng',
  [LadLineStatus.rejected]: 'Đã từ chối',
  [LadLineStatus.excluded]: 'Loại trừ',
}

export const LAD_LINE_STATUS_VARIANT: Record<LadLineStatus, ColoredValueVariant> = {
  [LadLineStatus.draft]: ColoredValueVariant.GREY,
  [LadLineStatus.pending]: ColoredValueVariant.YELLOW,
  [LadLineStatus.applied]: ColoredValueVariant.GREEN,
  [LadLineStatus.rejected]: ColoredValueVariant.RED,
  [LadLineStatus.excluded]: ColoredValueVariant.GREY,
}

// ----------------------------------------------------------------------
// Wizard sub-view router (URL search param `lad_view`) + step count.
// ----------------------------------------------------------------------
export const LAD_VIEW = {
  LIST: 'list',
  CREATE: 'create',
  DETAIL: 'detail',
} as const
export type LadView = (typeof LAD_VIEW)[keyof typeof LAD_VIEW]

/** Wizard steps shown in the stepper (1..4). Step 5 (review) + confirmation are rendered separately. */
export const LAD_WIZARD_STEPS = ['Phạm vi', 'Cấu hình', 'Tác động', 'Lý do & chứng từ'] as const
export const LAD_STEP_COUNT = LAD_WIZARD_STEPS.length
export const LAD_REVIEW_STEP = LAD_STEP_COUNT + 1 // màn "Xác nhận & gửi duyệt" (5/5)

export const LAD_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024

// ----------------------------------------------------------------------
// Bước 2 — config matrix metadata (Card 1: CĐT-paid + Sale-distributed + revenue).
//
// `unit: 'both'` → user toggles %/đ (writes pct_* OR amt_*). `unit: 'amt'`/'pct' → fixed.
// `vatField` → render a Có-VAT/Không toggle bound to that payload flag; `null` → no VAT (Sale items
// are ALWAYS no-VAT per §2.2 and must NOT send a flag).
// ----------------------------------------------------------------------
export type LadConfigUnit = 'both' | 'pct' | 'amt'

export interface LadCdtConfigRow {
  /** Stable key for React + the matrix logic. */
  key: string
  label: string
  /** Group heading shown above the row block. */
  group: 'cdt' | 'sale' | 'revenue'
  unit: LadConfigUnit
  pctField?: string
  amtField?: string
  /** VAT flag field in payload_snapshot, or null when the item is always no-VAT. */
  vatField: string | null
}

export const LAD_CDT_CONFIG_ROWS: readonly LadCdtConfigRow[] = [
  {
    key: 'agency_fee',
    label: 'Phí đại lý',
    group: 'cdt',
    unit: 'both',
    pctField: 'pct_agency_fee',
    amtField: 'amt_agency_fee',
    vatField: 'is_agency_fee_include_vat',
  },
  {
    key: 'investor_bonus',
    label: 'Phí đại lý tăng thêm',
    group: 'cdt',
    unit: 'both',
    pctField: 'pct_investor_bonus',
    amtField: 'amt_investor_bonus',
    vatField: 'is_investor_bonus_include_vat',
  },
  {
    key: 'shared_bonus',
    label: 'Thưởng đại lý',
    group: 'cdt',
    unit: 'both',
    pctField: 'pct_shared_bonus',
    amtField: 'amt_shared_bonus',
    vatField: 'is_shared_bonus_include_vat',
  },
  {
    key: 'sale_commission',
    label: 'Hoa hồng sale',
    group: 'sale',
    unit: 'both',
    pctField: 'pct_sale_commission',
    amtField: 'amt_sale_commission',
    vatField: null,
  },
  {
    key: 'investor_bonus_to_sale',
    label: 'Thưởng cho sale',
    group: 'sale',
    unit: 'both',
    pctField: 'pct_investor_bonus_to_sale',
    amtField: 'amt_investor_bonus_to_sale',
    // Sale items luôn no-VAT (§2.2); is_investor_bonus_to_sale_include_vat đã bỏ khỏi LADPayloadSnapshotRequest.
    vatField: null,
  },
  // mv_bonus_to_sale (Thưởng nóng) đã bỏ khỏi LADPayloadSnapshotRequest — kênh mv_bonus tạm tắt ở BE.
  {
    key: 'staff_incentive',
    label: 'Thưởng MV',
    group: 'sale',
    // Số tiền tuyệt đối, không có % — MV tự bỏ tiền, không phải phần trăm phí đại lý.
    unit: 'amt',
    amtField: 'amt_staff_incentive',
    vatField: null,
  },
  {
    key: 'revenue',
    label: 'Tỉ lệ doanh thu',
    group: 'revenue',
    unit: 'both',
    pctField: 'pct_revenue',
    amtField: 'amt_revenue',
    vatField: null,
  },
  {
    key: 'kpi_revenue_slk',
    label: 'Doanh thu KPI Sàn liên kết',
    group: 'revenue',
    // Cơ sở doanh thu NỘI BỘ của phòng SLK cho dự án tổng đại lý — độc lập với phí đại lý CĐT
    // trả, nên không tính vào delta của lô. Chỉ có ý nghĩa với dự án tổng đại lý; để trống ⇒
    // SLK dùng công thức chuẩn (theo phí đại lý).
    unit: 'both',
    pctField: 'pct_kpi_revenue_slk',
    amtField: 'amt_kpi_revenue_slk',
    vatField: null,
  },
] as const

export const LAD_CONFIG_GROUP_LABEL: Record<LadCdtConfigRow['group'], string> = {
  cdt: 'Chủ đầu tư trả MV',
  sale: 'Chia cho Sale',
  revenue: 'Tỉ lệ tính doanh thu',
}

// ----------------------------------------------------------------------
// Bước 2 — F2 per-partner (per-exchange) sub-config field keys (Card 2).
// `is_f2_commission_include_vat = null` ⇒ BE cascades from agency-fee VAT.
// ----------------------------------------------------------------------
export const LAD_F2_FIELDS = {
  /** Hoa hồng F2 dạng RateSpec (phân số / % trực tiếp) — nguồn sự thật, XOR với pct/amt. */
  SPEC_COMMISSION: 'pct_f2_commission_spec',
  PCT_COMMISSION: 'pct_f2_commission',
  AMT_COMMISSION: 'amt_f2_commission',
  IS_COMMISSION_VAT: 'is_f2_commission_include_vat',
  PCT_BONUS: 'pct_f2_bonus',
  AMT_BONUS: 'amt_f2_bonus',
  IS_BONUS_VAT: 'is_f2_bonus_include_vat',
  PCT_INVENTORY_HOLD: 'pct_f2_inventory_hold',
} as const

// Submit error codes returned by POST /submit/ (API-Usage §4.3).
export const LAD_SUBMIT_ERROR = {
  UNCONFIRMED_LINES: 'unconfirmed_lines',
  REVENUE_EXCEEDS_AGENCY_FEE: 'revenue_exceeds_agency_fee',
} as const
