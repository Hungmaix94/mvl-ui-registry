import { describe, expect, it } from 'vitest'

import {
  computeReconDelta,
  formatReconUnit,
  vatInclusionLabel,
  withVatInclusion,
} from './ReconConfigTableRow'

describe('vatInclusionLabel / withVatInclusion', () => {
  it('renders the per-field VAT suffix, blank when undefined', () => {
    expect(vatInclusionLabel(true)).toBe('(đã gồm VAT)')
    expect(vatInclusionLabel(false)).toBe('(chưa gồm VAT)')
    expect(vatInclusionLabel(null)).toBe('')
  })

  it('appends the suffix only when the flag is defined', () => {
    expect(withVatInclusion('5%', true)).toBe('5% (đã gồm VAT)')
    expect(withVatInclusion('5%', null)).toBe('5%')
  })
})

describe('computeReconDelta', () => {
  it('returns null when there is no MV reference', () => {
    expect(computeReconDelta(5, null, 'percent')).toBeNull()
  })

  it('flags a match within the per-unit epsilon', () => {
    expect(computeReconDelta(5, 5, 'percent')).toEqual({ match: true, diff: 0 })
    expect(computeReconDelta(5.02, 5, 'percent')?.match).toBe(false) // > 0.01 pp
    expect(computeReconDelta(1_000_001, 1_000_000, 'currency')?.match).toBe(true) // ≤ 1đ
    expect(computeReconDelta(1_000_002, 1_000_000, 'currency')?.match).toBe(false)
  })

  it('keeps the sign: CĐT above MV is positive', () => {
    expect(computeReconDelta(6, 5, 'percent')?.diff).toBeCloseTo(1)
    expect(computeReconDelta(4, 5, 'percent')?.diff).toBeCloseTo(-1)
  })
})

describe('formatReconUnit', () => {
  it('formats percent with % and currency with đ', () => {
    expect(formatReconUnit(5, 'percent')).toContain('%')
    expect(formatReconUnit(1000, 'currency')).toContain('đ')
  })
})
