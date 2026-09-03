import type { DepositCumulativeResponse } from '@/features/sales/deposit-cumulative/services/deposit-cumulative-service'

/** The special row key in `data` that holds column totals (not a real unit). */
export const SUMMARY_KEY = 'summary'

/** One point on the cumulative line chart (one Mon-Sun week). Keyed by unit name. */
export type DepositCumulativeChartPoint = {
  week: string
  [unitName: string]: number | string
}

/**
 * Pure transform of the report response into wide chart rows for a cumulative line chart.
 * X axis = the report weeks (`Tuần {index}`); each unit gets its own series whose value at
 * week `i` is the **running sum** of that unit's deposits from week 1 through week `i`.
 * The `summary` row (column totals) is excluded.
 *
 * Kept free of any React import so it is unit-testable in isolation.
 */
export function buildCumulativeChartData(
  response: DepositCumulativeResponse | undefined
): DepositCumulativeChartPoint[] {
  if (!response) return []
  const weeks = response.weeks ?? []
  const units = Object.keys(response.data ?? {}).filter((name) => name !== SUMMARY_KEY)

  const running: Record<string, number> = {}
  units.forEach((unit) => {
    running[unit] = 0
  })

  return weeks.map((week) => {
    const point: DepositCumulativeChartPoint = { week: `Tuần ${week.index}` }
    units.forEach((unit) => {
      const cell = response.data[unit]?.[String(week.index)]
      running[unit] += Number(cell) || 0
      point[unit] = running[unit]
    })
    return point
  })
}

/** Unit names in the response, excluding the `summary` row. */
export function getUnitNames(response: DepositCumulativeResponse | undefined): string[] {
  if (!response) return []
  return Object.keys(response.data ?? {}).filter((name) => name !== SUMMARY_KEY)
}
