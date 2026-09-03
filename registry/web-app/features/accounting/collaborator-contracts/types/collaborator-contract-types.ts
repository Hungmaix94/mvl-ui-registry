import { z } from 'zod'

import { CollaboratorContractStatus, CtvLineType } from '@/constants/api-schema-aliases'

// Re-export with friendly names
export const ContractStatus = CollaboratorContractStatus
export type ContractStatus = CollaboratorContractStatus

export { CtvLineType }

// Vietnamese labels
export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  [ContractStatus.draft]: 'Bản nháp',
  [ContractStatus.signed]: 'Đã ký',
  [ContractStatus.cancelled]: 'Đã huỷ',
}

export const CTV_LINE_TYPE_LABELS: Record<string, string> = {
  [CtvLineType.exchange_dept]: 'Phòng giao dịch',
  [CtvLineType.management]: 'Ban quản lý',
  [CtvLineType.internal_sale]: 'Sale nội bộ',
  [CtvLineType.independent]: 'Độc lập / Kế toán',
}

// ---------------------------------------------------------------------------
// Status workflow helpers
// ---------------------------------------------------------------------------

export function canMarkSigned(status?: string | null): boolean {
  return status === ContractStatus.draft
}

export function canCancel(status?: string | null): boolean {
  return status === ContractStatus.draft
}

export function canEditStatus(status?: string | null): boolean {
  return status === ContractStatus.draft
}

export function canEditAttachment(status?: string | null): boolean {
  return status === ContractStatus.draft
}

/**
 * Commission / bonus / line fields are only editable while the contract is a
 * draft. Once signed or cancelled the figures are locked to keep settled
 * numbers stable — the backend rejects any PATCH once the contract leaves
 * Draft (FR-CT10, ClickUp 86eyc20t8).
 */
export function canEditCommission(status?: string | null): boolean {
  return status === ContractStatus.draft
}

// ---------------------------------------------------------------------------
// Edit form schema
// ---------------------------------------------------------------------------
// Editable fields are limited to what the API actually accepts on
// `PatchedCollaboratorContractRequest`. Note: the API does NOT expose
// `collaborator` / `ctv_line_employee` / `ctv_line_department` as writable, so
// the collaborator (CTV) and the line owner cannot be changed here.
//
// Percentage fields flow through a `TextField` → string. VND amount fields flow
// through `CurrencyInput` → number. Both are unioned so the same schema accepts
// the API's string defaults and the inputs' runtime values without a transform.
const decimalValue = z.union([z.string(), z.number()]).nullish()

export const collaboratorContractEditSchema = z.object({
  // Always-editable (subject to permission)
  status: z.nativeEnum(ContractStatus).optional(),
  attachment: z.any().optional(),
  // Draft-only editable
  contract_number: z.string().nullish(),
  // Stored in API format (yyyy-MM-dd); the DatePicker converts on change.
  signed_date: z.string().nullish(),
  pct_commission: decimalValue,
  fixed_amount: decimalValue,
  pct_line_bonus: decimalValue,
  amt_supplementary_fee: decimalValue,
  pct_supplementary_fee: decimalValue,
  // BE trả '' (Django blank) cho HĐ CTV không có tuyến line (vd CTV nhận hộ); enum sinh từ schema
  // không có phần tử rỗng nên phải chấp nhận '' để tránh lỗi giả "Invalid enum value". Dùng union
  // (không dùng z.preprocess/transform vì nó làm lệch input/output type của zodResolver — TS2719).
  // '' là falsy nên vẫn không bị gửi lên BE ở bước submit.
  ctv_line_type: z.union([z.nativeEnum(CtvLineType), z.literal('')]).nullish(),
  note: z.string().nullish(),
})

export type CollaboratorContractEditValues = z.infer<typeof collaboratorContractEditSchema>

// ---------------------------------------------------------------------------
// Filter schema (3 fields)
// ---------------------------------------------------------------------------

export const collaboratorContractFilterSchema = z.object({
  status: z.nativeEnum(ContractStatus).nullable().optional(),
  collaborator: z.number().nullable().optional(),
  signed_date_from: z.union([z.date(), z.string(), z.null()]).optional(),
  signed_date_to: z.union([z.date(), z.string(), z.null()]).optional(),
})

export type CollaboratorContractFilterValues = z.infer<typeof collaboratorContractFilterSchema>

export const DEFAULT_CONTRACT_FILTER_VALUES: CollaboratorContractFilterValues = {
  status: null,
  collaborator: null,
  signed_date_from: null,
  signed_date_to: null,
}
