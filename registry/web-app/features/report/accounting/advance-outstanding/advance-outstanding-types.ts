import type { components } from '@/api/schema'

// Row/response shapes come straight from the generated OpenAPI schema — the
// GET /api/accounting/reports/advance-outstanding/ endpoint is now in the committed
// schema (see report-service.ts). The maps below stay FE-owned because the BE does
// not (yet) expose matching app_constants keys for these small closed sets.
export type AdvanceOutstandingRow = components['schemas']['AdvanceOutstandingRow']
export type AdvanceOutstandingReportResponse = components['schemas']['AdvanceOutstandingResponse']

export const AGING_BUCKET = {
  D0_30: '0-30',
  D31_60: '31-60',
  D61_90: '61-90',
  D90_PLUS: '90+',
} as const
export type AgingBucket = (typeof AGING_BUCKET)[keyof typeof AGING_BUCKET]

export const AGING_BUCKET_LABEL: Record<AgingBucket, string> = {
  [AGING_BUCKET.D0_30]: '0-30 ngày',
  [AGING_BUCKET.D31_60]: '31-60 ngày',
  [AGING_BUCKET.D61_90]: '61-90 ngày',
  [AGING_BUCKET.D90_PLUS]: 'Trên 90 ngày',
}

export const RECIPIENT_TYPE = {
  EMPLOYEE: 'employee',
  COLLABORATOR: 'collaborator',
  EXCHANGE: 'exchange',
} as const
export type RecipientType = (typeof RECIPIENT_TYPE)[keyof typeof RECIPIENT_TYPE]
