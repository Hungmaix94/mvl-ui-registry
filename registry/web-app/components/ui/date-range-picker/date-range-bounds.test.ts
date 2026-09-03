import { describe, it, expect } from 'vitest'
import { getOutOfBoundsError, startOfDay } from './date-range-bounds'

/**
 * `minDate` / `maxDate` (CR STT47, 86eyjxafg) clamp the filter picker to the accounting period
 * shown on the list toolbar. Bounds are inclusive on BOTH ends — an off-by-one here silently drops
 * the first or last day of the period from every filtered list.
 */

const MIN = new Date(2026, 4, 1) // 01/05/2026
const MAX = new Date(2026, 4, 31) // 31/05/2026

describe('getOutOfBoundsError', () => {
  it('accepts a day inside the window', () => {
    expect(getOutOfBoundsError(new Date(2026, 4, 15), MIN, MAX)).toBeUndefined()
  })

  it('accepts both boundary days — the bounds are inclusive', () => {
    expect(getOutOfBoundsError(new Date(2026, 4, 1), MIN, MAX)).toBeUndefined()
    expect(getOutOfBoundsError(new Date(2026, 4, 31), MIN, MAX)).toBeUndefined()
  })

  it('rejects the day before minDate, naming the bound', () => {
    expect(getOutOfBoundsError(new Date(2026, 3, 30), MIN, MAX)).toBe(
      'Ngày không được trước 01/05/2026'
    )
  })

  it('rejects the day after maxDate, naming the bound', () => {
    expect(getOutOfBoundsError(new Date(2026, 5, 1), MIN, MAX)).toBe(
      'Ngày không được sau 31/05/2026'
    )
  })

  it('applies a lone minDate without inventing an upper bound', () => {
    expect(getOutOfBoundsError(new Date(2026, 3, 30), MIN, undefined)).toBe(
      'Ngày không được trước 01/05/2026'
    )
    expect(getOutOfBoundsError(new Date(2099, 0, 1), MIN, undefined)).toBeUndefined()
  })

  it('applies a lone maxDate without inventing a lower bound', () => {
    expect(getOutOfBoundsError(new Date(2026, 5, 1), undefined, MAX)).toBe(
      'Ngày không được sau 31/05/2026'
    )
    expect(getOutOfBoundsError(new Date(1990, 0, 1), undefined, MAX)).toBeUndefined()
  })

  it('allows everything when neither bound is given', () => {
    expect(getOutOfBoundsError(new Date(1990, 0, 1))).toBeUndefined()
    expect(getOutOfBoundsError(new Date(2099, 0, 1))).toBeUndefined()
  })

  it('ignores the time part of the bounds', () => {
    // A caller passing `new Date()` hands over a bound at, say, 14:23 — comparing raw would knock
    // out that same day's earlier hours and lop a day off the period.
    const minAtNoon = new Date(2026, 4, 1, 14, 23, 45)
    const maxAtNoon = new Date(2026, 4, 31, 14, 23, 45)
    expect(getOutOfBoundsError(new Date(2026, 4, 1), minAtNoon, maxAtNoon)).toBeUndefined()
    expect(getOutOfBoundsError(new Date(2026, 4, 31), minAtNoon, maxAtNoon)).toBeUndefined()
  })

  it('ignores the time part of the day under test', () => {
    expect(getOutOfBoundsError(new Date(2026, 4, 31, 23, 59, 59), MIN, MAX)).toBeUndefined()
  })
})

describe('startOfDay', () => {
  it('zeroes the time and leaves the calendar day alone', () => {
    expect(startOfDay(new Date(2026, 4, 15, 18, 30, 12, 500))).toEqual(new Date(2026, 4, 15))
  })

  it('does not mutate its argument', () => {
    const original = new Date(2026, 4, 15, 18, 30)
    startOfDay(original)
    expect(original.getHours()).toBe(18)
  })
})
