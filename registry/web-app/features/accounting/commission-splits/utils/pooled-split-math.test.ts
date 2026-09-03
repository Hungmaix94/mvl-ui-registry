import { describe, expect, it } from 'vitest'

import { computePooledSplit } from './pooled-split-math'

// The accountant's reference spreadsheet (2026-07-23): total sale fee 2%, sale 1
// participates 60% (own 1.20%), sale 2 participates 40% (own 0.80%). The pooled payee
// (CTV) takes 0.80%: cuts 0.48 / 0.32, leaving 0.72 / 0.48.
const BASIS = 13_500_000_000

describe('computePooledSplit', () => {
  const groups = [
    { sharePct: 1.2, feeExpected: 162_000_000, ownerAmount: 162_000_000 }, // sale 1
    { sharePct: 0.8, feeExpected: 108_000_000, ownerAmount: 108_000_000 }, // sale 2
  ]

  it('matches the reference spreadsheet percentages', () => {
    const result = computePooledSplit(groups, 0.8, BASIS)
    expect(result).not.toBeNull()
    const [s1, s2] = result!.rows
    expect(s1.cutPct).toBeCloseTo(0.48, 10)
    expect(s2.cutPct).toBeCloseTo(0.32, 10)
    expect(s1.afterPct).toBeCloseTo(0.72, 10)
    expect(s2.afterPct).toBeCloseTo(0.48, 10)
  })

  it('cut amounts sum exactly to the payee period amount', () => {
    const result = computePooledSplit(groups, 0.8, BASIS)!
    const cutSum = result.rows.reduce((s, r) => s + r.cutAmount, 0)
    expect(cutSum).toBe(result.payeeAmount)
    // 0.8 / 2.0 of the period fee pool (270m) = 108m
    expect(result.payeeAmount).toBe(108_000_000)
    expect(result.payeeFullAmount).toBe(Math.round(0.008 * BASIS))
  })

  it('absorbs rounding drift in the last row on odd amounts', () => {
    const odd = [
      { sharePct: 1.26, feeExpected: 33_333_333, ownerAmount: 33_333_333 },
      { sharePct: 0.764, feeExpected: 20_212_121, ownerAmount: 20_212_121 },
    ]
    const result = computePooledSplit(odd, 1.0123, BASIS)!
    const cutSum = result.rows.reduce((s, r) => s + r.cutAmount, 0)
    expect(cutSum).toBe(result.payeeAmount)
    expect(Number.isInteger(result.rows[0].cutAmount)).toBe(true)
    expect(Number.isInteger(result.rows[1].cutAmount)).toBe(true)
  })

  it('flags a group whose own row cannot cover the cut', () => {
    const partiallySplit = [
      { sharePct: 1.2, feeExpected: 162_000_000, ownerAmount: 10_000_000 },
      { sharePct: 0.8, feeExpected: 108_000_000, ownerAmount: 108_000_000 },
    ]
    const result = computePooledSplit(partiallySplit, 0.8, BASIS)!
    expect(result.rows[0].insufficient).toBe(true)
    expect(result.rows[1].insufficient).toBe(false)
  })

  it('returns null when there is nothing to cut from', () => {
    expect(computePooledSplit([], 0.5, BASIS)).toBeNull()
    expect(
      computePooledSplit([{ sharePct: 0, feeExpected: 0, ownerAmount: 0 }], 0.5, BASIS)
    ).toBeNull()
  })

  it('allows x == total share pct: every group cut to zero, payee takes the whole pool', () => {
    const result = computePooledSplit(groups, 2.0, BASIS)!
    const [s1, s2] = result.rows
    expect(s1.afterPct).toBeCloseTo(0, 10)
    expect(s2.afterPct).toBeCloseTo(0, 10)
    expect(s1.afterAmount).toBe(0)
    expect(s2.afterAmount).toBe(0)
    expect(s1.insufficient).toBe(false)
    expect(s2.insufficient).toBe(false)
    expect(result.payeeAmount).toBe(270_000_000) // the whole period fee pool
  })
})

// Three channels (BE plan 2026-07-31). DEDUCTION has no input: it rides the FEE ratio.
describe('computePooledSplit — bonus + deduction channels', () => {
  const groups = [
    {
      sharePct: 1.2,
      feeExpected: 162_000_000,
      ownerAmount: 162_000_000,
      bonusExpected: 20_000_000,
      deductionExpected: -12_000_000,
    },
    {
      sharePct: 0.8,
      feeExpected: 108_000_000,
      ownerAmount: 108_000_000,
      bonusExpected: 10_000_000,
      deductionExpected: -6_000_000,
    },
  ]

  it('takes the deduction at exactly the fee ratio, per group', () => {
    // x = 0.8 of 2.0 -> fee ratio 0.4 for both groups.
    const result = computePooledSplit(groups, 0.8, BASIS)!
    expect(result.rows[0].cutAmount / groups[0].feeExpected).toBeCloseTo(0.4, 10)
    expect(result.rows[0].deductionCutAmount).toBe(-4_800_000) // 40% of -12m
    expect(result.rows[1].deductionCutAmount).toBe(-2_400_000) // 40% of -6m
    expect(result.payeeDeductionAmount).toBe(-7_200_000)
  })

  it('full fee means the whole deduction', () => {
    const result = computePooledSplit(groups, 2.0, BASIS)!
    expect(result.rows[0].deductionCutAmount).toBe(-12_000_000)
    expect(result.rows[1].deductionCutAmount).toBe(-6_000_000)
  })

  it('bonus-only bears NO deduction — the claw-back is on the fee', () => {
    const result = computePooledSplit(groups, 0, BASIS, { poolPct: 100 })!
    expect(result.payeeBonusAmount).toBe(30_000_000)
    expect(result.payeeDeductionAmount).toBe(0)
    expect(result.payeeAmount).toBe(0)
  })

  it('bonus pool pct fans by each group allocation and sums exactly', () => {
    const result = computePooledSplit(groups, 0.8, BASIS, { poolPct: 50 })!
    expect(result.rows[0].bonusCutAmount).toBe(10_000_000)
    expect(result.rows[1].bonusCutAmount).toBe(5_000_000)
    expect(result.payeeBonusAmount).toBe(15_000_000)
  })

  it('bonus absolute amount is capped at the allocated pool', () => {
    const result = computePooledSplit(groups, 0, BASIS, { amount: 99_000_000 })!
    expect(result.payeeBonusAmount).toBe(30_000_000)
  })

  it('the bonus channel never changes the deduction ratio', () => {
    const feeOnly = computePooledSplit(groups, 0.8, BASIS)!
    const withBonus = computePooledSplit(groups, 0.8, BASIS, { poolPct: 100 })!
    expect(withBonus.payeeDeductionAmount).toBe(feeOnly.payeeDeductionAmount)
  })

  it('total = fee + bonus + deduction', () => {
    const result = computePooledSplit(groups, 0.8, BASIS, { poolPct: 50 })!
    expect(result.payeeTotalAmount).toBe(
      result.payeeAmount + result.payeeBonusAmount + result.payeeDeductionAmount
    )
    expect(result.payeeTotalAmount).toBe(108_000_000 + 15_000_000 - 7_200_000)
  })
})
