import { describe, expect, it } from 'vitest'
import { formatSlkPeriodLabel, resolveSlkAddPeriodState } from './slk-add-period'

const base = {
  canCompute: true,
  month: 7,
  year: 2026,
  isProbing: false,
  periodExists: false,
}

describe('resolveSlkAddPeriodState', () => {
  it('shows an enabled button for a filtered period that has no statement yet', () => {
    expect(resolveSlkAddPeriodState(base)).toEqual({ visible: true, disabled: false })
  })

  it('hides the button without the compute permission', () => {
    expect(resolveSlkAddPeriodState({ ...base, canCompute: false }).visible).toBe(false)
  })

  it('hides the button until the URL carries a period', () => {
    expect(resolveSlkAddPeriodState({ ...base, month: null }).visible).toBe(false)
    expect(resolveSlkAddPeriodState({ ...base, year: null }).visible).toBe(false)
  })

  it('hides the button when the period already has a statement', () => {
    expect(resolveSlkAddPeriodState({ ...base, periodExists: true }).visible).toBe(false)
  })

  it('disables (not hides) the button while the existence probe is in flight', () => {
    expect(resolveSlkAddPeriodState({ ...base, isProbing: true })).toEqual({
      visible: true,
      disabled: true,
    })
  })

  it('keeps the button hidden while probing a period that is already known to exist', () => {
    expect(resolveSlkAddPeriodState({ ...base, isProbing: true, periodExists: true }).visible).toBe(
      false
    )
  })
})

describe('formatSlkPeriodLabel', () => {
  it('zero-pads the month', () => {
    expect(formatSlkPeriodLabel(7, 2026)).toBe('07/2026')
    expect(formatSlkPeriodLabel(12, 2026)).toBe('12/2026')
  })
})
