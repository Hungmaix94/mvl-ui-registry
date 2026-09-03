import { describe, expect, it } from 'vitest'

import { hasReconExtraBonusSection } from './recon-extra-section'
import { createEmptyInvestorReconciliationSheetItem } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'

describe('hasReconExtraBonusSection', () => {
  it('is false for undefined or an empty (pristine) item', () => {
    expect(hasReconExtraBonusSection(undefined)).toBe(false)
    expect(hasReconExtraBonusSection(createEmptyInvestorReconciliationSheetItem())).toBe(false)
  })

  it('is true once any extra-bonus field is set', () => {
    const base = createEmptyInvestorReconciliationSheetItem()
    expect(hasReconExtraBonusSection({ ...base, extra_bonus_pct: 1 })).toBe(true)
    expect(hasReconExtraBonusSection({ ...base, extra_bonus_amount: 5_000_000 })).toBe(true)
    expect(hasReconExtraBonusSection({ ...base, extra_bonus_progress_from_pct: 0 })).toBe(true)
    expect(hasReconExtraBonusSection({ ...base, extra_bonus_progress_to_pct: 50 })).toBe(true)
  })
})
