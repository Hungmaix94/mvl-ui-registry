/**
 * Frontend-only UI vocabulary for the tri-state "assessed" filters on the
 * KPI period evaluation list. The backend exposes these as boolean query
 * params (`employee_assessed` / `manager_assessed` / `hrm_assessed`); the URL
 * and filter form carry them as `'true' | 'false' | null` so the Select can
 * render and clear them like the other filters.
 */
export const ASSESSED_FILTER_VALUE = {
  ASSESSED: 'true',
  NOT_ASSESSED: 'false',
} as const

export type AssessedFilterValue = (typeof ASSESSED_FILTER_VALUE)[keyof typeof ASSESSED_FILTER_VALUE]

export const ASSESSED_FILTER_OPTIONS: { value: AssessedFilterValue; label: string }[] = [
  { value: ASSESSED_FILTER_VALUE.ASSESSED, label: 'Đã đánh giá' },
  { value: ASSESSED_FILTER_VALUE.NOT_ASSESSED, label: 'Chưa đánh giá' },
]

/** Convert the URL/form string value into the boolean the API expects. */
export function parseAssessedToBoolean(value?: string | null): boolean | undefined {
  if (value === ASSESSED_FILTER_VALUE.ASSESSED) return true
  if (value === ASSESSED_FILTER_VALUE.NOT_ASSESSED) return false
  return undefined
}
