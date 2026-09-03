import type { CommMgrMonthlyFilterFormData } from '../components/CommMgrMonthlyFilter'

/**
 * Every filter the "HH theo tháng — Quản lý" dialog owns, in one list.
 *
 * Writing the URL and counting the badge both read this, so a filter can never end up
 * applied-but-uncounted (or counted-but-never-sent). The period (`year`/`month`) is
 * deliberately absent — it is the mandatory toolbar axis, not an optional dialog filter.
 */
export const COMM_MGR_MONTHLY_FILTER_PARAMS = [
  'status',
  'branch',
  'block',
  'department',
  'position',
  'beneficiary_employee',
] as const satisfies readonly (keyof CommMgrMonthlyFilterFormData)[]

/**
 * A new `URLSearchParams` with the dialog's selection applied over `current`.
 *
 * Cleared levels must be *deleted*, not written as empty — the cascade resets children when
 * a parent changes, and an empty `department=` left behind would keep filtering the list to
 * nothing while the dialog shows the field as blank.
 */
export function applyCommMgrMonthlyFilters(
  current: URLSearchParams,
  formData: CommMgrMonthlyFilterFormData
): URLSearchParams {
  const next = new URLSearchParams(current)

  COMM_MGR_MONTHLY_FILTER_PARAMS.forEach((key) => {
    const value = formData[key]
    if (value === null || value === undefined || value === '') next.delete(key)
    else next.set(key, String(value))
  })

  return next
}

/** How many dialog filters are currently on — drives `PageTitle.filterBadgeCount`. */
export function countCommMgrMonthlyFilters(params: URLSearchParams): number {
  return COMM_MGR_MONTHLY_FILTER_PARAMS.filter((key) => !!params.get(key)).length
}
