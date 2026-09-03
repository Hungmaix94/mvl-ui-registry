import type { DateRange } from 'react-day-picker'

import type { GetCommissionHoldsParams } from '@/features/accounting/commission-holds/services/commission-hold-service'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'

/**
 * Filter values held in the "Tạm giữ HH Sale" filter dialog and mirrored in the URL.
 * `tax_base` moved from a page-level tab to a normal filter (ClickUp 86eyc21xw: gộp 2 tab
 * trước/sau thuế thành 1 bảng). `held_at_after`/`held_at_before` (ngày giữ, `yyyy-MM-dd`) drive
 * the endpoint's `DateFromToRangeFilter` — inclusive both ends, `before` covers the whole day.
 *
 * `employee_code` keeps its legacy param name but matches the code of ANY payee type
 * (nhân viên / CTV / sàn F2) — hence the "Mã người nhận" label. `branch_id`/`block_id`/
 * `department_id` resolve through the employee only, so filtering by org chart narrows the
 * list to employee rows: CTV and sàn F2 belong to no phòng ban.
 */
export type CommHoldFilterValues = {
  status?: string | null
  branch_id?: number | null
  block_id?: number | null
  department_id?: number | null
  employee_code?: string | null
  hold_reason?: string | null
  tax_base?: string | null
  held_at_after?: string | null
  held_at_before?: string | null
}

/**
 * Split a "Trước/sau thuế" label served by `useAppConstant` into a short head and its
 * parenthetical note, e.g. `"Sau thuế (tính thuế ngay; giữ lại từ số ròng)"` →
 * `{ head: 'Sau thuế', note: 'tính thuế ngay; giữ lại từ số ròng' }`.
 *
 * The BE label is a full sentence, far too long for one table cell line. Rendering head +
 * note as two text lines keeps the column readable at any width; labels without parentheses
 * fall through untouched with `note: null`.
 */
export function splitTaxBaseLabel(label: string): { head: string; note: string | null } {
  const match = label.match(/^([^(]+)\((.+)\)\s*$/)
  // A label that is only a note ("(ghi chú)") would leave an empty first line — keep it raw.
  if (!match || !match[1].trim()) return { head: label.trim(), note: null }
  return { head: match[1].trim(), note: match[2].trim() }
}

type BuildParamsInput = {
  filters: CommHoldFilterValues
  page: number
  pageSize: number
  search?: string | null
}

/**
 * Build the list-endpoint query params from the active filters.
 *
 * `tax_base` is only sent when the user explicitly filters by it — omitting it merges
 * PRE_TAX + POST_TAX into one list (the 2 tabs are gone). Only truthy filters are sent so
 * empty selects/clears do not narrow the result set.
 */
export function buildCommHoldApiParams({
  filters,
  page,
  pageSize,
  search,
}: BuildParamsInput): GetCommissionHoldsParams {
  const params: GetCommissionHoldsParams = { page, page_size: pageSize }

  if (filters.status) {
    params.status = filters.status as NonNullable<GetCommissionHoldsParams>['status']
  }
  if (filters.branch_id) params.branch = filters.branch_id
  if (filters.block_id) params.block = filters.block_id
  if (filters.department_id) params.department = filters.department_id
  if (filters.employee_code) params.employee_code = filters.employee_code
  if (filters.hold_reason) {
    params.hold_reason = filters.hold_reason as NonNullable<GetCommissionHoldsParams>['hold_reason']
  }
  if (filters.tax_base) {
    params.tax_base = filters.tax_base as NonNullable<GetCommissionHoldsParams>['tax_base']
  }
  if (filters.held_at_after) params.held_at_after = filters.held_at_after
  if (filters.held_at_before) params.held_at_before = filters.held_at_before
  if (search) params.search = search

  return params
}

/** Count active filter chips for the toolbar filter badge (the held date range counts as one). */
export function countActiveCommHoldFilters(filters: CommHoldFilterValues): number {
  return (
    (filters.status ? 1 : 0) +
    (filters.branch_id ? 1 : 0) +
    (filters.block_id ? 1 : 0) +
    (filters.department_id ? 1 : 0) +
    (filters.employee_code ? 1 : 0) +
    (filters.hold_reason ? 1 : 0) +
    (filters.tax_base ? 1 : 0) +
    (filters.held_at_after || filters.held_at_before ? 1 : 0)
  )
}

/**
 * Convert the "Ngày giữ" date-range picker value into the endpoint's `held_at_after`/
 * `held_at_before` params (`yyyy-MM-dd`). BE compares on `held_at__date` so the raw calendar
 * day is enough — no manual end-of-day handling.
 */
export function heldAtRangeToParams(range?: DateRange): {
  held_at_after?: string
  held_at_before?: string
} {
  const out: { held_at_after?: string; held_at_before?: string } = {}
  if (range?.from) out.held_at_after = formatDateToApi(range.from)
  if (range?.to) out.held_at_before = formatDateToApi(range.to)
  return out
}

/** Rebuild the date-range picker value from the URL's `held_at_after`/`held_at_before` strings. */
export function paramsToHeldAtRange(
  values: Pick<CommHoldFilterValues, 'held_at_after' | 'held_at_before'>
): DateRange | undefined {
  const from = parseDateFromApi(values.held_at_after ?? undefined)
  const to = parseDateFromApi(values.held_at_before ?? undefined)
  if (!from && !to) return undefined
  return { from, to }
}
