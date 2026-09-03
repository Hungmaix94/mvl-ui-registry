import { describe, it, expect } from 'vitest'
import {
  advanceCapForShare,
  isCtvShare,
  COLLABORATOR_ADVANCE_TAX_PCT,
  MAX_ADVANCE_PER_LINE,
} from './commission-advance-types'

describe('advanceCapForShare (BE-rule advance cap)', () => {
  it('caps an employee line at 100% of the gross share', () => {
    expect(advanceCapForShare(20_000_000, true)).toBe(20_000_000)
  })

  it('caps a CTV line at 90% of the gross share (COLLABORATOR_ADVANCE_TAX_PCT)', () => {
    expect(COLLABORATOR_ADVANCE_TAX_PCT).toBe(10)
    expect(advanceCapForShare(20_000_000, false)).toBe(18_000_000)
  })

  it('clamps both employee and CTV to the per-line ceiling (100M)', () => {
    expect(MAX_ADVANCE_PER_LINE).toBe(100_000_000)
    expect(advanceCapForShare(500_000_000, true)).toBe(MAX_ADVANCE_PER_LINE)
    expect(advanceCapForShare(500_000_000, false)).toBe(MAX_ADVANCE_PER_LINE)
  })

  it('floors fractional đồng — never rounds the cap up', () => {
    // CTV: 1_000_001 × 0.9 = 900_000.9 → floor 900_000
    expect(advanceCapForShare(1_000_001, false)).toBe(900_000)
  })

  it('returns 0 for a zero gross share', () => {
    expect(advanceCapForShare(0, true)).toBe(0)
    expect(advanceCapForShare(0, false)).toBe(0)
  })
})

describe('isCtvShare', () => {
  it('identifies CTV shares with collaborator id or ctv recipient_kind', () => {
    expect(isCtvShare({ collaborator: { id: 12 } })).toBe(true)
    expect(isCtvShare({ recipient_kind: 'ctv_with_source', employee: { id: 99 } })).toBe(true)
    expect(isCtvShare({ recipient_kind: 'ctv_independent' })).toBe(true)
  })

  it('returns false for pure internal employee shares', () => {
    expect(isCtvShare({ employee: { id: 99 }, recipient_kind: 'mv_sale' })).toBe(false)
    expect(isCtvShare({ employee: { id: 99 } })).toBe(false)
    expect(isCtvShare({})).toBe(false)
  })
})
