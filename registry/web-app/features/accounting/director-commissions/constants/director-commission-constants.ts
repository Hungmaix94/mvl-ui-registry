import { ColoredValueVariant, ProjectDirectorCommissionPeriodBalance_state } from '@/api/schema'
import { PromotionDistributionStatus } from '@/constants/api-schema-aliases'

// Lifecycle status — the director-commission list `status` query param shares the
// promotion DRAFT/CONFIRMED/VOIDED enum (deduped in schema). Alias to a local name.
export { PromotionDistributionStatus as DirectorCommissionStatus }
export type DirectorCommissionStatusType = PromotionDistributionStatus

const Status = PromotionDistributionStatus

// Status labels come from the BE app_constant `DirectorCommissionStatus` (module `accounting`)
// via useDirectorCommissionConstants — NOT a local map. Only the UI color variant stays here.
export const DIRECTOR_COMMISSION_STATUS_VARIANT: Record<
  PromotionDistributionStatus,
  ColoredValueVariant
> = {
  [Status.DRAFT]: ColoredValueVariant.GREY,
  [Status.CONFIRMED]: ColoredValueVariant.GREEN,
  [Status.VOIDED]: ColoredValueVariant.RED,
}

// balance_state labels come from the BE app_constant `DirectorCommissionBalanceState`
// via useDirectorCommissionConstants — only the UI color variant stays here.
export { ProjectDirectorCommissionPeriodBalance_state as BalanceState } from '@/api/schema'
export const BALANCE_STATE_VARIANT: Record<
  ProjectDirectorCommissionPeriodBalance_state,
  ColoredValueVariant
> = {
  [ProjectDirectorCommissionPeriodBalance_state.owed]: ColoredValueVariant.RED,
  [ProjectDirectorCommissionPeriodBalance_state.overpaid]: ColoredValueVariant.ORANGE,
  [ProjectDirectorCommissionPeriodBalance_state.settled]: ColoredValueVariant.GREY,
}

// CASL subject.
export const DIRECTOR_COMMISSION_SUBJECT = 'project_director_commission'

// CASL actions — the backend registered dedicated permission codes for every action,
// so these are the real codes (no provisional mapping like the promotion module).
export const DIRECTOR_COMMISSION_ACTIONS = {
  LIST: 'list',
  RETRIEVE: 'retrieve',
  CREATE: 'create',
  PARTIAL_UPDATE: 'partial_update',
  DESTROY: 'destroy',
  PREVIEW: 'preview',
  CONFIRM: 'confirm',
  VOID: 'void',
  REOPEN: 'reopen',
  RECOMPUTE: 'recompute',
  LEDGER: 'ledger',
  RECEIPTS: 'receipts',
} as const

// Full dotted codes for route-level `permission` guards.
export const DIRECTOR_COMMISSION_PERMISSIONS = {
  LIST: 'project_director_commission.list',
  RETRIEVE: 'project_director_commission.retrieve',
} as const

// Dependency reads called by Select option loaders on this page.
export const DIRECTOR_COMMISSION_DEP = {
  ACCOUNTING_PERIOD: { action: 'list', subject: 'accountingperiod' },
  PROJECT: { action: 'list', subject: 'project' },
} as const
