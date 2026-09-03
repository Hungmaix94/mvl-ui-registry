import { describe, expect, it } from 'vitest'
import { buildCumulativeChartData, getUnitNames } from './deposit-cumulative-chart'
import type { DepositCumulativeResponse } from '@/features/sales/deposit-cumulative/services/deposit-cumulative-service'

const RESPONSE: DepositCumulativeResponse = {
  year: 2026,
  month: 7,
  weeks: [
    { index: 1, week_start: '2026-06-29', week_end: '2026-07-05' },
    { index: 2, week_start: '2026-07-06', week_end: '2026-07-12' },
    { index: 3, week_start: '2026-07-13', week_end: '2026-07-19' },
  ],
  data: {
    'Chi nhánh A': { '1': '100', '2': '50', '3': '25', total: '175' },
    'Chi nhánh B': { '1': '0', '2': '200', '3': '0', total: '200' },
    summary: { '1': '100', '2': '250', '3': '25', total: '375' },
  },
}

describe('buildCumulativeChartData', () => {
  it('produces one wide point per week with a running sum per unit and excludes summary', () => {
    const points = buildCumulativeChartData(RESPONSE)
    expect(points).toEqual([
      { week: 'Tuần 1', 'Chi nhánh A': 100, 'Chi nhánh B': 0 },
      { week: 'Tuần 2', 'Chi nhánh A': 150, 'Chi nhánh B': 200 },
      { week: 'Tuần 3', 'Chi nhánh A': 175, 'Chi nhánh B': 200 },
    ])
    // No `summary` series leaks into the points.
    expect(points.every((p) => !('summary' in p))).toBe(true)
  })

  it('treats missing / non-numeric cells as 0', () => {
    const points = buildCumulativeChartData({
      year: 2026,
      month: 7,
      weeks: [
        { index: 1, week_start: '2026-06-29', week_end: '2026-07-05' },
        { index: 2, week_start: '2026-07-06', week_end: '2026-07-12' },
      ],
      data: { 'Khối X': { '2': '30', total: '30' } },
    })
    expect(points).toEqual([
      { week: 'Tuần 1', 'Khối X': 0 },
      { week: 'Tuần 2', 'Khối X': 30 },
    ])
  })

  it('returns an empty array for undefined input', () => {
    expect(buildCumulativeChartData(undefined)).toEqual([])
  })
})

describe('getUnitNames', () => {
  it('lists unit names excluding summary', () => {
    expect(getUnitNames(RESPONSE)).toEqual(['Chi nhánh A', 'Chi nhánh B'])
  })

  it('returns an empty array for undefined input', () => {
    expect(getUnitNames(undefined)).toEqual([])
  })
})
