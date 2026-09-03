import { z } from 'zod'

import {
  createEmptyInvestorReconciliationSheetItem,
  reconItemBaseSchema,
  type InvestorReconciliationSheetCreateItemValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'

/**
 * CTV (Cộng tác viên) reconciliation form schema — NGHIỆP VỤ Y HỆT F2.
 *
 * CTV reuses the CANONICAL line model (so the shared card tree — ReconConfigTable / header / derived —
 * renders identically). The sheet header (project / sales_allocation / collaborator) is fixed and
 * shown read-only from the detail; only `reconciliation_date` / `note` / `items` are editable and the
 * CTV PATCH payload carries just those (see the adapter). period_type / progress are inherited
 * read-only from the parent CĐT, so we DROP the investor-only refinements that would reject valid CTV
 * rows the user cannot change — only the XOR (% vs ₫) rules remain.
 */
export const ctvReconciliationSheetItemSchema = reconItemBaseSchema.superRefine((item, ctx) => {
  if (item.pct_agency_fee != null && item.amt_agency_fee != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amt_agency_fee'],
      message: 'Chỉ nhập % hoặc số tiền hoa hồng',
    })
  }
  if (item.extra_bonus_pct != null && item.extra_bonus_amount != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['extra_bonus_amount'],
      message: 'Chỉ nhập % hoặc số tiền phí tăng thêm',
    })
  }
})

export const ctvReconciliationSheetSchema = z.object({
  reconciliation_date: z.string().min(1, 'Vui lòng chọn ngày đối chiếu'),
  note: z.string().optional(),
  items: z
    .array(ctvReconciliationSheetItemSchema)
    .min(1, 'Vui lòng thêm ít nhất một dòng chi tiết đối chiếu'),
})

export type CTVReconciliationSheetValues = z.infer<typeof ctvReconciliationSheetSchema>
/** CTV line values ARE the canonical item values (same base object) — shared cards consume them as-is. */
export type CTVReconciliationSheetItemValues = InvestorReconciliationSheetCreateItemValues

/** Empty CTV line = canonical empty item (defensive fallback; real lines hydrate through the adapter). */
export const createEmptyCTVReconciliationSheetItem = createEmptyInvestorReconciliationSheetItem
