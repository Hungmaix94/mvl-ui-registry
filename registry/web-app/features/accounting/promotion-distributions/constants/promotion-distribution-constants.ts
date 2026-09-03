import { ColoredValueVariant } from '@/api/schema'
import { PromotionDistributionStatus } from '@/constants/api-schema-aliases'

// Status enum — alias the schema enum (DRAFT / CONFIRMED / VOIDED). Never redefine.
export { PromotionDistributionStatus }
export type PromotionDistributionStatusType = PromotionDistributionStatus

const Status = PromotionDistributionStatus

// pct_type values (from ProjectPromotionDistributionLine.pct_type) — closed business set.
export const PROMOTION_PCT_TYPE = {
  RELATIONSHIP: 'pct_relationship',
  PLANNING: 'pct_planning',
  PACKAGING: 'pct_packaging',
  SALES_SUPPORT: 'pct_sales_support',
  COORDINATION: 'pct_coordination',
} as const
export type PromotionPctType = (typeof PROMOTION_PCT_TYPE)[keyof typeof PROMOTION_PCT_TYPE]

// Business render order for the breakdown table grouping.
export const PROMOTION_PCT_TYPE_ORDER: PromotionPctType[] = [
  PROMOTION_PCT_TYPE.RELATIONSHIP,
  PROMOTION_PCT_TYPE.PLANNING,
  PROMOTION_PCT_TYPE.PACKAGING,
  PROMOTION_PCT_TYPE.SALES_SUPPORT,
  PROMOTION_PCT_TYPE.COORDINATION,
]

// "Loại xúc tiến" labels. Local map: the matching server constant key for THIS enum is not
// confirmed; values are stable business vocabulary. Swap to useAppConstant once the exact
// constant key (e.g. ProjectPromotionRecipient_PCT_TYPE_CHOICES) is verified with backend.
export const PROMOTION_PCT_TYPE_LABEL: Record<string, string> = {
  [PROMOTION_PCT_TYPE.RELATIONSHIP]: 'Đầu mối quan hệ',
  [PROMOTION_PCT_TYPE.PLANNING]: 'Hoạch định – đàm phán – ký HĐ',
  [PROMOTION_PCT_TYPE.PACKAGING]: 'Đóng gói sản phẩm',
  [PROMOTION_PCT_TYPE.SALES_SUPPORT]: 'Hỗ trợ kinh doanh',
  [PROMOTION_PCT_TYPE.COORDINATION]: 'Điều phối chung dự án',
}

// Status labels — schema-documented small fixed set. Swap to useAppConstant if a backend key
// for this status is later confirmed.
export const PROMOTION_DISTRIBUTION_STATUS_LABEL: Record<PromotionDistributionStatus, string> = {
  [Status.DRAFT]: 'Nháp',
  [Status.CONFIRMED]: 'Chính thức',
  [Status.VOIDED]: 'Đã huỷ',
}

// UI color variant only (Chip / ColoredValue).
export const PROMOTION_DISTRIBUTION_STATUS_VARIANT: Record<
  PromotionDistributionStatus,
  ColoredValueVariant
> = {
  [Status.DRAFT]: ColoredValueVariant.GREY,
  [Status.CONFIRMED]: ColoredValueVariant.GREEN,
  [Status.VOIDED]: ColoredValueVariant.RED,
}

// Status filter options for the filter dialog Select.
export const PROMOTION_DISTRIBUTION_STATUS_OPTIONS = (
  Object.keys(PROMOTION_DISTRIBUTION_STATUS_LABEL) as Array<PromotionDistributionStatus>
).map((value) => ({ value, label: PROMOTION_DISTRIBUTION_STATUS_LABEL[value] }))

// CASL subject + actions. Permissions parse to { action, subject } — call ability.can(action, SUBJECT).
export const PROMOTION_DISTRIBUTION_SUBJECT = 'promotion_distribution'

// confirm/reopen/void/preview/recompute have NO annotated permission code in schema.ts → mapped
// to the closest documented codes (state mutations → `update`; preview → `create`). Isolated here
// for a one-line swap once backend confirms dedicated codes.
export const PROMOTION_DISTRIBUTION_ACTIONS = {
  LIST: 'list',
  RETRIEVE: 'retrieve',
  CREATE: 'create',
  UPDATE: 'update',
  PARTIAL_UPDATE: 'partial_update',
  DESTROY: 'destroy',
  CONFIRM: 'update', // ⚠ provisional
  REOPEN: 'update', // ⚠ provisional
  VOID: 'update', // ⚠ provisional
  RECOMPUTE: 'update', // "Tính lại" = PUT update re-snapshot
  PREVIEW: 'create', // ⚠ provisional
  BULK_DRAFT: 'bulk_draft', // dedicated code — `promotion_distribution.bulk_draft`
} as const

// Full dotted codes for route-level `permission` guards (parsed via parsePermissionCode).
export const PROMOTION_DISTRIBUTION_PERMISSIONS = {
  LIST: 'promotion_distribution.list',
  RETRIEVE: 'promotion_distribution.retrieve',
  CREATE: 'promotion_distribution.create',
  UPDATE: 'promotion_distribution.update',
  PARTIAL_UPDATE: 'promotion_distribution.partial_update',
  DESTROY: 'promotion_distribution.destroy',
  BULK_DRAFT: 'promotion_distribution.bulk_draft',
} as const

// Skip reasons returned by bulk-draft. Labels come from the server (`accounting`
// app_constants key `PromotionBulkSkipReason`); this map is the ORDER + UI grouping only.
// `NO_CONFIG` first: it is the group that needs the accountant to act.
export const PROMOTION_BULK_SKIP_REASON = {
  NO_CONFIG: 'no_config',
  ERROR: 'error',
  NO_REVENUE: 'no_revenue',
  ALREADY_EXISTS: 'already_exists',
} as const
export type PromotionBulkSkipReason =
  (typeof PROMOTION_BULK_SKIP_REASON)[keyof typeof PROMOTION_BULK_SKIP_REASON]

// Render order of the skipped table: actionable groups on top, "đã có phiếu" last.
export const PROMOTION_BULK_SKIP_REASON_ORDER: PromotionBulkSkipReason[] = [
  PROMOTION_BULK_SKIP_REASON.NO_CONFIG,
  PROMOTION_BULK_SKIP_REASON.ERROR,
  PROMOTION_BULK_SKIP_REASON.NO_REVENUE,
  PROMOTION_BULK_SKIP_REASON.ALREADY_EXISTS,
]

// Dependency reads called by Select option loaders on this page.
export const PROMOTION_DISTRIBUTION_DEP = {
  ACCOUNTING_PERIOD: { action: 'list', subject: 'accountingperiod' },
  PROJECT: { action: 'list', subject: 'project' },
} as const
