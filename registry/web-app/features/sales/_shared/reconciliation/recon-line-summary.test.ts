import { describe, expect, it } from 'vitest'

import { CTVReconciliationPeriod_type } from '@/api/schema'

import { buildReconLineSummary } from './recon-line-summary'
import { createEmptyInvestorReconciliationSheetItem } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import type { ReconLineDerived } from './useReconLineDerived'

const derived = (overrides: Partial<ReconLineDerived> = {}): ReconLineDerived =>
  ({
    periodCommission: 0,
    retroactiveAdjustment: 0,
    extraBonusPeriodAmount: 0,
    ...overrides,
  }) as ReconLineDerived

describe('buildReconLineSummary', () => {
  it('returns nothing for an undefined item', () => {
    expect(buildReconLineSummary(undefined, derived())).toEqual([])
  })

  it('normal payment: leads with % TT + Phí ĐL, no extra segments when zero', () => {
    const item = {
      ...createEmptyInvestorReconciliationSheetItem(),
      period_type: CTVReconciliationPeriod_type.normal_payment,
      progress_from_pct: 0,
      progress_to_pct: 20,
      shared_bonus_period_amount: 0,
      fee_deduction: 0,
    }
    const segments = buildReconLineSummary(item, derived({ periodCommission: 10_000_000 }))
    expect(segments[0]).toBe('% TT: 0→20%')
    expect(segments[1]).toMatch(/^Phí ĐL:/)
    expect(segments).toHaveLength(2)
  })

  it('normal payment: appends Thưởng / Khấu trừ when present', () => {
    const item = {
      ...createEmptyInvestorReconciliationSheetItem(),
      period_type: CTVReconciliationPeriod_type.normal_payment,
      progress_from_pct: 0,
      progress_to_pct: 20,
      shared_bonus_period_amount: 5_000_000,
      fee_deduction: 1_000_000,
    }
    const segments = buildReconLineSummary(item, derived({ periodCommission: 10_000_000 }))
    expect(segments.some((s) => s.startsWith('Thưởng:'))).toBe(true)
    expect(segments.some((s) => s.startsWith('Khấu trừ:'))).toBe(true)
  })

  it('adjustment-only: leads with Truy hồi and hides % TT/Phí ĐL when no progress', () => {
    const item = {
      ...createEmptyInvestorReconciliationSheetItem(),
      period_type: CTVReconciliationPeriod_type.adjustment_only,
      progress_from_pct: 20,
      progress_to_pct: 20,
      shared_bonus_period_amount: 0,
      fee_deduction: 0,
    }
    const segments = buildReconLineSummary(item, derived({ retroactiveAdjustment: 330_000 }))
    expect(segments[0]).toMatch(/^Truy hồi: \+/)
    expect(segments.some((s) => s.startsWith('% TT'))).toBe(false)
  })
})
