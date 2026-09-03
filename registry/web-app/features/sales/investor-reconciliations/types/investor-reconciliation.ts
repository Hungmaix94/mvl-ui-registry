import type { components } from '@/api/schema'

export type InvestorReconciliation = components['schemas']['InvestorReconciliation']
export type InvestorReconciliationSheet = components['schemas']['InvestorReconciliationSheet']
export type InvestorReconciliationSheetItem =
  components['schemas']['InvestorReconciliationSheetItem']
export type InvestorReconciliationSheetItemRequest =
  components['schemas']['InvestorReconciliationSheetItemRequest']
export type InvestorReconciliationSheetRequest =
  components['schemas']['InvestorReconciliationSheetRequest']
export type PatchedInvestorReconciliationSheetRequest =
  components['schemas']['PatchedInvestorReconciliationSheetRequest']

/** Sheet detail khi BE trả thêm `items[]` writable (chưa có trên InvestorReconciliationSheet response). */
export type InvestorReconciliationSheetWithItems = InvestorReconciliationSheet & {
  items?: InvestorReconciliationSheetItem[]
}

/** Row tối thiểu từ `reconciliations[]` khi map về form (test + runtime đều dùng được). */
export type InvestorReconciliationFormRowSource = Partial<InvestorReconciliation> &
  Pick<InvestorReconciliation, 'product_inventory'>

/** Subset dùng cho `mapSheetToFormValues` — chỉ field adapter đọc (mock-friendly). */
export type InvestorReconciliationSheetFormSource = {
  project_detail: { id: number }
  source_type: InvestorReconciliationSheet['source_type']
  source_exchange_detail?: { id: number } | null
  reconciliation_date?: string | null
  note?: string | null
  reconciliations?: InvestorReconciliationFormRowSource[]
  items?: InvestorReconciliationSheetItem[]
}
