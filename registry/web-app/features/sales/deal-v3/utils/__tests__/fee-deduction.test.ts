import { describe, it, expect } from 'vitest'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { resolveFeeDeductionCell, getFeeDeductionCell } from '../fee-deduction'

const COMMISSION_PCT_TYPES = APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES

describe('resolveFeeDeductionCell', () => {
  it('renders the magnitude of a signed-negative amount (the current BE shape)', () => {
    const cell = resolveFeeDeductionCell({ amount: '-5000', percentage: '2.5' }, null)
    expect(cell.amountMagnitude).toBe(5000)
    expect(cell.pct).toBe(2.5)
    expect(cell.hasValue).toBe(true)
  })

  it('treats a negative amount with no pct as having value', () => {
    const cell = resolveFeeDeductionCell({ amount: '-1' }, null)
    expect(cell.hasValue).toBe(true)
    expect(cell.amountMagnitude).toBe(1)
    expect(cell.pct).toBeNull()
  })

  it('hides the cell when there is no amount and no positive pct', () => {
    expect(resolveFeeDeductionCell(null, null)).toEqual({
      amountMagnitude: 0,
      pct: null,
      hasValue: false,
    })
    expect(resolveFeeDeductionCell({ amount: '0', percentage: '0' }, null).hasValue).toBe(false)
  })

  it('falls back to the legacy deduction object when the signed cell is absent', () => {
    const cell = resolveFeeDeductionCell(undefined, { amount: '3000', percentage: '1.5' })
    expect(cell.amountMagnitude).toBe(3000)
    expect(cell.pct).toBe(1.5)
    expect(cell.hasValue).toBe(true)
  })

  it('prefers the signed cell over the legacy fallback', () => {
    const cell = resolveFeeDeductionCell({ amount: '-7000' }, { amount: '3000', percentage: '1' })
    expect(cell.amountMagnitude).toBe(7000)
    // pct is nullish on the signed cell -> falls through to the legacy percentage
    expect(cell.pct).toBe(1)
  })

  it('shows a pct-only row (amount 0 but positive percentage)', () => {
    const cell = resolveFeeDeductionCell({ amount: '0', percentage: '2' }, null)
    expect(cell.hasValue).toBe(true)
    expect(cell.amountMagnitude).toBe(0)
    expect(cell.pct).toBe(2)
  })

  it('drops a non-positive or non-numeric pct to null', () => {
    expect(resolveFeeDeductionCell({ percentage: '-3' }, null).pct).toBeNull()
    expect(resolveFeeDeductionCell({ percentage: 'abc' }, null).pct).toBeNull()
  })

  it('coerces a non-numeric amount to a hidden zero rather than NaN', () => {
    const cell = resolveFeeDeductionCell({ amount: 'abc' }, null)
    expect(cell.amountMagnitude).toBe(0)
    expect(cell.hasValue).toBe(false)
  })
})

describe('getFeeDeductionCell', () => {
  it('reads the F2 fee-deduction key when isF2 is true', () => {
    const row = {
      commissions: {
        [COMMISSION_PCT_TYPES.F2_FEE_DEDUCTION.pct]: { amount: '-4000', percentage: '2' },
        [COMMISSION_PCT_TYPES.F1_FEE_DEDUCTION.pct]: { amount: '-9999' },
      },
    }
    const cell = getFeeDeductionCell(row, true)
    expect(cell.amountMagnitude).toBe(4000)
    expect(cell.pct).toBe(2)
  })

  it('reads the sale (F1) fee-deduction key when isF2 is false', () => {
    const row = {
      commissions: {
        [COMMISSION_PCT_TYPES.F1_FEE_DEDUCTION.pct]: { amount: '-1500' },
      },
    }
    expect(getFeeDeductionCell(row, false).amountMagnitude).toBe(1500)
  })

  it('falls back to the legacy deduction object when the keyed cell is missing', () => {
    const row = { commissions: {}, deduction: { amount: '2000', percentage: '1' } }
    const cell = getFeeDeductionCell(row, false)
    expect(cell.amountMagnitude).toBe(2000)
    expect(cell.pct).toBe(1)
  })

  it('returns an empty cell for a null/undefined row', () => {
    expect(getFeeDeductionCell(null, true).hasValue).toBe(false)
    expect(getFeeDeductionCell(undefined, false).hasValue).toBe(false)
  })
})
