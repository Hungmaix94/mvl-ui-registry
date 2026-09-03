import type { InvestorReconciliationSheetCreateItemValues } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'

/** Phần 4 visible when any extra-fee field (amount or separate progress schedule) is set. */
export function hasReconExtraBonusSection(
  item: InvestorReconciliationSheetCreateItemValues | undefined
): boolean {
  if (!item) return false
  return (
    item.extra_bonus_pct != null ||
    item.extra_bonus_amount != null ||
    item.extra_bonus_progress_from_pct != null ||
    item.extra_bonus_progress_to_pct != null
  )
}
