import { z } from 'zod'

import {
  createEmptyInvestorReconciliationSheetItem,
  reconItemBaseSchema,
  type InvestorReconciliationSheetCreateItemValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'

/**
 * F2 (Sàn F2) reconciliation form schema.
 *
 * F2 reuses the CANONICAL line model (so the shared CĐT card tree — ReconConfigTable / header /
 * derived — renders identically), but the SHEET header is F2-specific (exchange + sales_allocation,
 * not project/source/investor) and there is no "create" (sheets are generated from the parent CĐT
 * commission shares; this form only edits).
 *
 * The item schema is the canonical base object ({@link reconItemBaseSchema}) + a LIGHT F2 refine:
 * F2 only persists a subset (see the adapter), and period_type / progress / per-field VAT flags are
 * inherited read-only from the parent CĐT — so we DROP the investor-only refinements
 * (cancellation/adjustment-first guards, required progress pair, settlement→100%) that would reject
 * valid F2 rows the user cannot change. Only the XOR (% vs ₫) rules remain.
 */
export const f2ReconciliationSheetItemSchema = reconItemBaseSchema.superRefine((item, ctx) => {
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

export const f2ReconciliationSheetSchema = z.object({
  exchange_id: z.coerce
    .number({
      required_error: 'Vui lòng chọn sàn giao dịch',
      invalid_type_error: 'Vui lòng chọn sàn giao dịch',
    })
    .positive('Vui lòng chọn sàn giao dịch'),
  sales_allocation_id: z.coerce
    .number({
      required_error: 'Vui lòng chọn thông tin bán hàng',
      invalid_type_error: 'Vui lòng chọn thông tin bán hàng',
    })
    .positive('Vui lòng chọn thông tin bán hàng'),
  reconciliation_date: z.string().min(1, 'Vui lòng chọn ngày đối chiếu'),
  note: z.string().optional(),
  items: z
    .array(f2ReconciliationSheetItemSchema)
    .min(1, 'Vui lòng thêm ít nhất một dòng chi tiết đối chiếu'),
})

export type F2ReconciliationSheetValues = z.infer<typeof f2ReconciliationSheetSchema>
/** F2 line values ARE the canonical item values (same base object) — shared cards consume them as-is. */
export type F2ReconciliationSheetItemValues = InvestorReconciliationSheetCreateItemValues

/**
 * Empty F2 line = canonical empty item. F2 has no manual create, so this is only a defensive fallback
 * (e.g. an unexpected empty sheet) — the real lines always come hydrated through the F2 adapter.
 */
export const createEmptyF2ReconciliationSheetItem = createEmptyInvestorReconciliationSheetItem
