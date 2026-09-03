import { describe, expect, it } from 'vitest'
import { derivePayout, netAfterHold } from './payout-math'

describe('derivePayout — thực nhận clamp', () => {
  it('floors thực nhận at 0 when a hold overshoots the gross (no negative display)', () => {
    // A deal-wide account hold larger than this band's slice used to drive thực nhận negative.
    const r = derivePayout({
      fee: 10_000_000,
      bonus: 0,
      isCtv: false,
      paid: 0,
      postTaxHold: 15_000_000,
    })
    expect(r.thucNhan).toBe(0)
    expect(r.conLai).toBe(0)
  })

  it('normal case is unchanged (hold within the gross)', () => {
    const r = derivePayout({
      fee: 10_000_000,
      bonus: 0,
      isCtv: false,
      paid: 0,
      postTaxHold: 4_000_000,
    })
    expect(r.thucNhan).toBe(6_000_000)
  })

  it('keeps a genuinely net-negative deduction band (deduction > commission, no hold)', () => {
    const r = derivePayout({
      fee: 1_000_000,
      bonus: 0,
      deduction: 3_000_000,
      isCtv: false,
      paid: 0,
    })
    expect(r.thucNhan).toBe(-2_000_000)
  })

  it('CTV PIT then hold still floors at 0', () => {
    // 21.5M − 2.15M PIT − 19.35M hold = 0
    const r = derivePayout({
      fee: 21_500_000,
      bonus: 0,
      isCtv: true,
      paid: 0,
      postTaxHold: 19_350_000,
    })
    expect(r.thucNhan).toBe(0)
  })
})

describe('derivePayout on a reclaim band', () => {
  // BE reclaims commission issued above what a share entitles (2026-08-06), so an ordinary
  // fee band can be negative without carrying the deduction flag.
  it('reports the debt instead of flooring "còn lại" at 0', () => {
    const r = derivePayout({ bonus: 0, fee: -800000, isCtv: false, paid: 0 })

    expect(r.tongTra).toBe(-800000)
    expect(r.thucNhan).toBe(-800000)
    expect(r.conLai).toBe(-800000)
  })

  it('keeps flooring "còn lại" at 0 for an ordinary fully-paid band', () => {
    const r = derivePayout({ bonus: 0, fee: 1000000, isCtv: false, paid: 1200000 })

    expect(r.conLai).toBe(0)
  })
})

describe('netAfterHold', () => {
  it('floors a positive band at 0 when the hold overshoots it', () => {
    expect(netAfterHold(1000000, 1500000)).toBe(0)
  })

  it('subtracts normally inside a positive band', () => {
    expect(netAfterHold(1000000, 300000)).toBe(700000)
  })

  it('keeps a reclaim negative instead of showing 0', () => {
    expect(netAfterHold(-800000, 0)).toBe(-800000)
  })
})
