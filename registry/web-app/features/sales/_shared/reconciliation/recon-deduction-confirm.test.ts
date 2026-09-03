import { describe, expect, it } from 'vitest'

import { formatCurrencyVND } from '@/utils/common'

import {
  buildReconDeductionConfirmLines,
  shouldConfirmReconDeduction,
  type ReconDeductionConfirmPayload,
} from './recon-deduction-confirm'

const vnd = (value: number) => `${formatCurrencyVND(value, { maximumFractionDigits: 0 })} đ`

const payload = (
  overrides: Partial<ReconDeductionConfirmPayload> = {}
): ReconDeductionConfirmPayload => ({
  unitLabel: 'A-101',
  feeDeduction: 2_000_000,
  feeDeductionToSale: null,
  prior: { total: 5_000_000, toSale: 1_000_000 },
  ...overrides,
})

describe('shouldConfirmReconDeduction — gate', () => {
  it('asks for confirmation only when the period has a deduction (> 0)', () => {
    expect(shouldConfirmReconDeduction(payload({ feeDeduction: 2_000_000 }))).toBe(true)
    expect(shouldConfirmReconDeduction(payload({ feeDeduction: 0 }))).toBe(false)
    expect(shouldConfirmReconDeduction(payload({ feeDeduction: -1 }))).toBe(false)
  })

  it('the sale portion alone never triggers the dialog (schema forbids sale > total anyway)', () => {
    expect(
      shouldConfirmReconDeduction(payload({ feeDeduction: 0, feeDeductionToSale: 1_000_000 }))
    ).toBe(false)
  })
})

describe('buildReconDeductionConfirmLines — copy', () => {
  it('renders the kỳ này · lũy kế pair and the running total for the deal', () => {
    const lines = buildReconDeductionConfirmLines(payload())
    expect(lines).toEqual([
      `Giảm trừ khác — kỳ này: ${vnd(2_000_000)} · lũy kế các kỳ đã duyệt trước: ${vnd(5_000_000)}`,
      `→ Tổng giảm trừ của deal sau kỳ này: ${vnd(7_000_000)}`,
    ])
  })

  it('adds the sale pair only when feeDeductionToSale != null', () => {
    const lines = buildReconDeductionConfirmLines(
      payload({ feeDeductionToSale: 500_000, prior: { total: 5_000_000, toSale: 1_000_000 } })
    )
    expect(lines).toHaveLength(4)
    expect(lines[2]).toBe(
      `Trong đó Sale / F2 phải chịu — kỳ này: ${vnd(500_000)} · lũy kế các kỳ đã duyệt trước: ${vnd(1_000_000)}`
    )
    expect(lines[3]).toBe(`→ Tổng trừ từ lương Sale của deal sau kỳ này: ${vnd(1_500_000)}`)
  })

  it('feeDeductionToSale = 0 is EXPLICIT (không trừ vào lương Sale) — still shown, totals keep prior', () => {
    const lines = buildReconDeductionConfirmLines(payload({ feeDeductionToSale: 0 }))
    expect(lines).toHaveLength(4)
    expect(lines[3]).toBe(`→ Tổng trừ từ lương Sale của deal sau kỳ này: ${vnd(1_000_000)}`)
  })

  it('zero priors render as 0 đ (loaded-and-zero, not hidden)', () => {
    const lines = buildReconDeductionConfirmLines(
      payload({ prior: { total: 0, toSale: 0 }, feeDeduction: 2_000_000 })
    )
    expect(lines[0]).toContain(`lũy kế các kỳ đã duyệt trước: ${vnd(0)}`)
    expect(lines[1]).toBe(`→ Tổng giảm trừ của deal sau kỳ này: ${vnd(2_000_000)}`)
  })
})
