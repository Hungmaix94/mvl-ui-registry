/**
 * URL <-> form plumbing for the "Hoa hồng theo doanh thu" filter dialog.
 *
 * The screen keeps every filter in the URL so a filtered view is shareable and survives a
 * reload, which means each value crosses three shapes: a form value (string from a text field,
 * number from `CurrencyInput`, boolean from a checkbox), a URL string, and an API query param.
 * These helpers own those conversions so the page component stays about layout.
 */

import {
  DEPARTMENT_MONTHLY_KPI_RANGE_KEYS,
  type DepartmentMonthlyKpiFilterValues,
  type DepartmentMonthlyKpiRangeKey,
} from '../schemas/department-monthly-kpi-schemas'
import type { GetDepartmentMonthlyKpisParams } from '../types/department-monthly-kpi-types'

/**
 * Checkbox field name -> the query param it maps to.
 *
 * The labels are phrased as "bỏ phòng không có ... khỏi danh sách" while the API asks the
 * question the other way round ("has ..."), and both mean the same thing once ticked. Leaving
 * a box unticked sends nothing at all, so the default list stays complete.
 */
export const DEPARTMENT_MONTHLY_KPI_TOGGLES = {
  only_departments_with_employees: 'has_employees',
  only_departments_with_deals: 'has_deals',
} as const

type ToggleField = keyof typeof DEPARTMENT_MONTHLY_KPI_TOGGLES

const TOGGLE_FIELDS = Object.keys(DEPARTMENT_MONTHLY_KPI_TOGGLES) as ToggleField[]

/** The dialog's plain single-value filters — org axis plus the two status dropdowns. */
export const DEPARTMENT_MONTHLY_KPI_SIMPLE_PARAMS = [
  'branch',
  'block',
  'department',
  'has_revenue',
  'is_computed',
] as const

/**
 * Bảy khoảng lọc, kèm nhãn đúng như dialog hiển thị — dùng để báo lỗi trỏ đúng ô nào sai.
 */
export const DEPARTMENT_MONTHLY_KPI_RANGE_PAIRS = [
  { base: 'completion_pct', label: 'Tỷ lệ hoàn thành' },
  { base: 'leader_pct', label: 'HH Quản lý Trưởng phòng – Tỷ lệ' },
  { base: 'leader_amount', label: 'HH Quản lý Trưởng phòng – Thành tiền' },
  { base: 'director_pct', label: 'HH Quản lý Giám đốc – Tỷ lệ' },
  { base: 'director_amount', label: 'HH Quản lý Giám đốc – Thành tiền' },
  { base: 'ceo_pct', label: 'HH Quản lý Tổng giám đốc – Tỷ lệ' },
  { base: 'ceo_amount', label: 'HH Quản lý Tổng giám đốc – Thành tiền' },
] as const

/**
 * A bound the user typed, as a number the API can take — or `undefined` when there is nothing
 * to send. An emptied field arrives as `''` or `null`, and a half-typed one (`'-'`) as junk;
 * both must drop out rather than reach the API as `NaN` and filter everything away.
 */
export function parseRangeBound(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined

  // Trim BEFORE the emptiness check: `Number('   ')` is 0, not NaN, so a field holding only
  // whitespace would otherwise sail through as a real "từ 0" bound.
  const text = String(value).trim()
  if (text === '') return undefined
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Range + toggle params read back off the URL, ready to spread into the list query. */
export function readDepartmentMonthlyKpiFilters(
  searchParams: URLSearchParams
): Pick<
  GetDepartmentMonthlyKpisParams,
  'has_employees' | 'has_deals' | DepartmentMonthlyKpiRangeKey
> {
  const params: Record<string, number | boolean | undefined> = {}

  for (const param of Object.values(DEPARTMENT_MONTHLY_KPI_TOGGLES)) {
    if (searchParams.get(param) === 'true') params[param] = true
  }

  for (const key of DEPARTMENT_MONTHLY_KPI_RANGE_KEYS) {
    const bound = parseRangeBound(searchParams.get(key))
    if (bound !== undefined) params[key] = bound
  }

  return params
}

/** Form values to seed the dialog with when it reopens on an already-filtered list. */
export function readDepartmentMonthlyKpiFormValues(
  searchParams: URLSearchParams
): Partial<DepartmentMonthlyKpiFilterValues> {
  const values: Record<string, unknown> = {}

  for (const field of TOGGLE_FIELDS) {
    values[field] = searchParams.get(DEPARTMENT_MONTHLY_KPI_TOGGLES[field]) === 'true'
  }

  for (const key of DEPARTMENT_MONTHLY_KPI_RANGE_KEYS) {
    const raw = searchParams.get(key)
    values[key] = raw === null ? null : raw
  }

  return values as Partial<DepartmentMonthlyKpiFilterValues>
}

/**
 * Write the dialog's values onto a copy of the current URL params.
 *
 * Every filter is rewritten on each apply, including the ones the user just emptied — carrying
 * a stale bound forward would leave the badge counting a filter the dialog no longer shows.
 */
export function applyDepartmentMonthlyKpiFilters(
  searchParams: URLSearchParams,
  formData: DepartmentMonthlyKpiFilterValues
): URLSearchParams {
  const next = new URLSearchParams(searchParams)

  for (const field of TOGGLE_FIELDS) {
    const param = DEPARTMENT_MONTHLY_KPI_TOGGLES[field]
    if (formData[field]) next.set(param, 'true')
    else next.delete(param)
  }

  for (const key of DEPARTMENT_MONTHLY_KPI_RANGE_KEYS) {
    const bound = parseRangeBound(formData[key])
    if (bound !== undefined) next.set(key, String(bound))
    else next.delete(key)
  }

  return next
}

/**
 * Nhãn của những khoảng bị gõ ngược ("Từ" lớn hơn "Đến"), rỗng nếu không có khoảng nào sai.
 *
 * Một khoảng ngược luôn trả về danh sách rỗng, mà bảng rỗng lại là kết quả hợp lệ của nhiều bộ
 * lọc khác trên màn này — nên không chặn ở đây thì người dùng chỉ thấy "không có dữ liệu" và
 * không có cách nào biết mình gõ nhầm.
 */
export function findInvertedDepartmentMonthlyKpiRanges(
  formData: Partial<DepartmentMonthlyKpiFilterValues>
): string[] {
  return DEPARTMENT_MONTHLY_KPI_RANGE_PAIRS.filter(({ base }) => {
    const min = parseRangeBound(formData[`${base}_min` as DepartmentMonthlyKpiRangeKey])
    const max = parseRangeBound(formData[`${base}_max` as DepartmentMonthlyKpiRangeKey])
    return min !== undefined && max !== undefined && min > max
  }).map(({ label }) => label)
}

/**
 * The org / status params, parsed exactly the way the list request parses them.
 *
 * Shared with `buildApiParamsFromUrl` so the badge and the request can never disagree — a
 * hand-edited `?branch=0` or `?has_revenue=yes` is dropped by both, instead of being counted
 * here and thrown away there.
 */
export function readDepartmentMonthlyKpiSimpleParams(
  searchParams: URLSearchParams
): Pick<
  GetDepartmentMonthlyKpisParams,
  'branch' | 'block' | 'department' | 'has_revenue' | 'is_computed'
> {
  const params: Record<string, number | boolean> = {}

  for (const key of ['branch', 'block', 'department'] as const) {
    const raw = searchParams.get(key)
    const parsed = raw === null ? NaN : Number(raw)
    if (Number.isInteger(parsed) && parsed > 0) params[key] = parsed
  }

  for (const key of ['has_revenue', 'is_computed'] as const) {
    const raw = searchParams.get(key)
    if (raw === 'true') params[key] = true
    else if (raw === 'false') params[key] = false
  }

  return params
}

/**
 * How many filters the badge on the toolbar should show.
 *
 * Counted off what actually survives parsing rather than off raw URL keys: a hand-edited
 * `completion_pct_min=abc`, `branch=0` or `has_deals=false` never reaches the API, and a badge
 * counting it would promise a filter the list is not applying.
 */
export function countDepartmentMonthlyKpiFilters(searchParams: URLSearchParams): number {
  return (
    Object.keys(readDepartmentMonthlyKpiSimpleParams(searchParams)).length +
    Object.keys(readDepartmentMonthlyKpiFilters(searchParams)).length
  )
}
