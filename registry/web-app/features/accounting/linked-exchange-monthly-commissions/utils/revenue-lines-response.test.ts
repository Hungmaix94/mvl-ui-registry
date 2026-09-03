import { describe, it, expect } from 'vitest'
import { unwrapSlkRevenueLines } from './revenue-lines-response'

/**
 * Fixtures here are deliberately synthetic (`slk_revenue: '1'`, `'2'`…) and must stay that
 * way. A sibling suite once used real figures copied off dev period 07/2026, and the next
 * reader who found those same numbers on screen reasonably concluded the app was rendering
 * test data. Shape is what this module is about; the amounts carry no meaning.
 */
type Line = { slk_revenue: string }

const LINES: Line[] = [{ slk_revenue: '1' }, { slk_revenue: '2' }]

describe('unwrapSlkRevenueLines', () => {
  it('returns a bare array unchanged — the shape the backend serves today', () => {
    expect(unwrapSlkRevenueLines<Line>(LINES)).toEqual(LINES)
  })

  it('unwraps the paginated envelope the schema declares when it holds the whole period', () => {
    const payload = { count: 2, next: null, previous: null, results: LINES }

    expect(unwrapSlkRevenueLines<Line>(payload)).toEqual(LINES)
  })

  it('returns [] for a period with no revenue lines — an empty period is legitimate', () => {
    expect(unwrapSlkRevenueLines<Line>([])).toEqual([])
    expect(unwrapSlkRevenueLines<Line>({ count: 0, next: null, results: [] })).toEqual([])
  })

  it('throws when pages remain, instead of understating every director pool', () => {
    const truncated = {
      count: 120,
      next: 'https://api.example.org/revenue-lines/?page=2',
      results: LINES,
    }

    expect(() => unwrapSlkRevenueLines<Line>(truncated)).toThrow(/more pages remain/)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'oops'],
    ['an object without results', { detail: 'Not found' }],
  ])('throws on %s rather than silently reporting an empty period', (_label, payload) => {
    expect(() => unwrapSlkRevenueLines<Line>(payload)).toThrow(/unrecognised response body/)
  })
})
