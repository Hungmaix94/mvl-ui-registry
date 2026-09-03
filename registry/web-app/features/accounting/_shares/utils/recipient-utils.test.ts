import { describe, expect, it } from 'vitest'

import { parseNumberSafe } from './recipient-utils'

describe('parseNumberSafe', () => {
  it('keeps plain integers', () => {
    expect(parseNumberSafe('1200000')).toBe(1200000)
    expect(parseNumberSafe(1200000)).toBe(1200000)
  })

  it('strips thousand separators used by the VND inputs', () => {
    expect(parseNumberSafe('1.200.000')).toBe(1200000)
  })

  // The BE reclaims commission issued above what a share entitles (2026-08-06), so money
  // fields that were always >= 0 on the sale/F2/KPI tracks now arrive negative. DRF
  // serialises DecimalField as a STRING, so these are the exact payload shapes.
  it('keeps the minus sign on a reclaim', () => {
    expect(parseNumberSafe('-800000')).toBe(-800000)
  })

  it('does not inflate a decimal payload by dropping the separator', () => {
    // "-800000.00" used to become 80000000 — wrong sign AND 100x too big.
    expect(parseNumberSafe('-800000.00')).toBe(-800000)
    expect(parseNumberSafe('1200000.00')).toBe(1200000)
  })

  it('falls back to 0 for empty or unparseable input', () => {
    expect(parseNumberSafe('')).toBe(0)
    expect(parseNumberSafe(null)).toBe(0)
    expect(parseNumberSafe(undefined)).toBe(0)
    expect(parseNumberSafe('abc')).toBe(0)
  })

  it('reads a lone minus as 0 rather than NaN (mid-typing state)', () => {
    expect(parseNumberSafe('-')).toBe(0)
  })
})
