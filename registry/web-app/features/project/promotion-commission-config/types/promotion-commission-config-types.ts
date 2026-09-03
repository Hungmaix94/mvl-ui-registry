import { z } from 'zod'

import { PatchedProjectPromotionRecipientRequestPct_type as PctTypeEnum } from '@/api/schema'
import { resolveRecipientOrgFields } from '@/features/project/shared/utils/resolveRecipientOrgFields'
import {
  PROMOTION_PCT_TYPE_ORDER,
  type PromotionPctType,
} from '@/features/project/promotion-commission-config/constants/promotion-commission-config-constants'
import type {
  ProjectPromotionCommissionConfig,
  ProjectPromotionCommissionConfigRequest,
} from '@/features/project/promotion-commission-config/services/promotion-commission-config-service'

// ─── schema ─────────────────────────────────────────────────────────────────

/** A single recipient row inside a pct_type group. Org fields use the API field names. */
const recipientRowSchema = z.object({
  id: z.number().optional(),
  contribution_level: z.string().or(z.number()).nullish(),
  employee: z.number().nullable().optional(),
  employee_name: z.string().optional(),
  department: z.number().nullable().optional(),
  department_name: z.string().optional(),
  branch: z.number().nullable().optional(),
  branch_name: z.string().optional(),
  block: z.number().nullable().optional(),
  block_name: z.string().optional(),
  position: z.number().nullable().optional(),
  position_name: z.string().optional(),
})

const configGroupSchema = z.object({
  pct_type: z.enum(PROMOTION_PCT_TYPE_ORDER),
  recipients: z.array(recipientRowSchema),
})

export const promotionConfigFormSchema = z.object({
  pct_promotion_revenue: z.string().or(z.number()).nullish(),
  pct_relationship: z.string().or(z.number()).nullish(),
  pct_planning: z.string().or(z.number()).nullish(),
  pct_packaging: z.string().or(z.number()).nullish(),
  pct_sales_support: z.string().or(z.number()).nullish(),
  pct_coordination: z.string().or(z.number()).nullish(),
  note: z.string().nullish(),
  groups: z.array(configGroupSchema),
})

export type PromotionConfigFormValues = z.infer<typeof promotionConfigFormSchema>
export type PromotionRecipientRow = z.infer<typeof recipientRowSchema>

// ─── mappers ────────────────────────────────────────────────────────────────

/** Maps PROMOTION_PCT_TYPE_ORDER string → schema enum (no `as` casting at call sites). */
const PCT_TYPE_TO_ENUM: Record<PromotionPctType, PctTypeEnum> = {
  pct_relationship: PctTypeEnum.pct_relationship,
  pct_planning: PctTypeEnum.pct_planning,
  pct_packaging: PctTypeEnum.pct_packaging,
  pct_sales_support: PctTypeEnum.pct_sales_support,
  pct_coordination: PctTypeEnum.pct_coordination,
}

const toNullablePct = (v: string | number | null | undefined): string | null => {
  if (v === '' || v == null) return null
  return String(v)
}

const toRequiredPct = (v: string | number | null | undefined): string => {
  if (v === '' || v == null) return '0'
  return String(v)
}

/** Build the editable form shape from the (possibly absent) singleton config. */
export function mapConfigToForm(
  config?: ProjectPromotionCommissionConfig | null
): PromotionConfigFormValues {
  const recipients = config?.recipients ?? []

  const groups = PROMOTION_PCT_TYPE_ORDER.map((pctType) => ({
    pct_type: pctType,
    recipients: recipients
      .filter((r) => r.pct_type === pctType)
      .map(
        (r): PromotionRecipientRow => ({
          id: r.id,
          contribution_level: r.contribution_level ?? null,
          employee: r.employee ?? null,
          department: r.department ?? null,
          branch: r.branch ?? null,
          block: r.block ?? null,
          position: r.position ?? null,
        })
      ),
  }))

  return {
    pct_promotion_revenue: config?.pct_promotion_revenue ?? '',
    pct_relationship: config?.pct_relationship ?? null,
    pct_planning: config?.pct_planning ?? null,
    pct_packaging: config?.pct_packaging ?? null,
    pct_sales_support: config?.pct_sales_support ?? null,
    pct_coordination: config?.pct_coordination ?? null,
    note: config?.note ?? '',
    groups,
  }
}

/** Build the PUT/POST replace-all request body from form values. */
export function buildConfigRequest(
  values: PromotionConfigFormValues
): ProjectPromotionCommissionConfigRequest {
  const recipients = (values.groups ?? []).flatMap((group) =>
    group.recipients
      // Persist only the SMALLEST chosen org level (department > block > branch) + position,
      // per the backend rule. The full path is reconstructed on edit by resolving parents.
      .map((row) => {
        const org = resolveRecipientOrgFields({
          employee: row.employee ?? null,
          department: row.department ?? null,
          branch: row.branch ?? null,
          block: row.block ?? null,
          position: row.position ?? null,
        })
        return {
          pct_type: PCT_TYPE_TO_ENUM[group.pct_type],
          contribution_level: toRequiredPct(row.contribution_level),
          ...org,
        }
      })
      // Drop empty rows that carry no org target.
      .filter(
        (r) =>
          r.employee != null ||
          r.department != null ||
          r.branch != null ||
          r.block != null ||
          r.position != null
      )
  )

  return {
    pct_promotion_revenue: toRequiredPct(values.pct_promotion_revenue),
    pct_relationship: toNullablePct(values.pct_relationship),
    pct_planning: toNullablePct(values.pct_planning),
    pct_packaging: toNullablePct(values.pct_packaging),
    pct_sales_support: toNullablePct(values.pct_sales_support),
    pct_coordination: toNullablePct(values.pct_coordination),
    note: values.note ?? '',
    recipients,
  }
}

/** Sum of a group's recipient contribution_level values. */
export function sumContribution(recipients: PromotionRecipientRow[]): number {
  return recipients.reduce((sum, r) => sum + (Number(r.contribution_level) || 0), 0)
}

/**
 * Returns the pct_type values whose recipients' contribution_level does NOT total exactly 100.
 * Groups with no recipients are skipped (a pct_type with no recipients is allowed).
 * Mirrors the backend rule: "Recipient contribution total for <pct_type> must be exactly 100."
 */
export function getInvalidContributionGroups(values: PromotionConfigFormValues): string[] {
  return (values.groups ?? [])
    .filter((group) => {
      const recipients = group.recipients ?? []
      if (recipients.length === 0) return false
      return Math.abs(sumContribution(recipients) - 100) > 0.001
    })
    .map((group) => group.pct_type)
}

/** Map a recipient row → AddContributorDialog initialValues (dialog uses *_id field names). */
export function recipientRowToDialogValues(row: PromotionRecipientRow | undefined) {
  if (!row) return undefined
  return {
    branch_id: row.branch ?? undefined,
    branch_name: row.branch_name,
    block_id: row.block ?? undefined,
    block_name: row.block_name,
    department_id: row.department ?? undefined,
    department_name: row.department_name,
    position_id: row.position ?? undefined,
    position_name: row.position_name,
    employee_id: row.employee ?? undefined,
    employee_name: row.employee_name,
    contribution_level:
      row.contribution_level != null && String(row.contribution_level) !== '0'
        ? String(row.contribution_level)
        : '',
  }
}
