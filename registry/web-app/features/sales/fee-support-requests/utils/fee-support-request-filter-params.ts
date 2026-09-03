import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'

import type { FeeSupportRequestFilterFormData } from '@/features/sales/fee-support-requests/components/FeeSupportRequestFilter'
import type { GetFeeSupportRequestsParams } from '@/features/sales/fee-support-requests/services/fee-support-request-service'

/** API query params for the list endpoint, without the `| undefined` wrapper of the generated type. */
type FeeSupportRequestApiParams = NonNullable<GetFeeSupportRequestsParams>

/**
 * Filter-dialog fields that map 1:1 to a single URL param and a single API param.
 * Everything downstream (badge count, clear, apply, form pre-fill) is driven by
 * this list, so adding a field only means extending it + the filter form.
 */
export const SIMPLE_FILTER_KEYS = ['status', 'project', 'origin', 'document_status'] as const

/** Build the list-endpoint API query params from the URL search params. */
export function buildFeeSupportRequestApiParams(
  searchParams: URLSearchParams
): FeeSupportRequestApiParams {
  const params: FeeSupportRequestApiParams = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  params.page_size =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering

  const search = searchParams.get('search')
  if (search) params.search = search

  // BE khai báo status/origin/document_status là string trong query params (không phải enum)
  const status = searchParams.get('status')
  if (status) params.status = status

  const origin = searchParams.get('origin')
  if (origin) params.origin = origin

  // CR 86eyhfz9b — nhánh duyệt hồ sơ (thủ tục), độc lập với `status` (chủ trương).
  // Không phải preset `awaiting_documents`: không kèm điều kiện phiếu đã duyệt.
  const documentStatus = searchParams.get('document_status')
  if (documentStatus) params.document_status = documentStatus

  const project = parsePositiveInt(searchParams.get('project'))
  if (project) params.project = project

  return params
}

/** Read the current filter values out of the URL to pre-fill the filter form. */
export function getFeeSupportRequestFilterValues(
  searchParams: URLSearchParams
): FeeSupportRequestFilterFormData {
  const data: FeeSupportRequestFilterFormData = {}
  for (const key of SIMPLE_FILTER_KEYS) {
    const value = searchParams.get(key)
    if (value) data[key] = value
  }
  return data
}

/** Count of active filters for the toolbar badge — the filter-dialog fields only. */
export function countFeeSupportRequestActiveFilters(searchParams: URLSearchParams): number {
  let count = 0
  for (const key of SIMPLE_FILTER_KEYS) {
    if (searchParams.has(key)) count++
  }
  return count
}

/**
 * Remount key for the filter form: changes whenever any filter value in the URL
 * changes, so Controllers remount instead of re-filling stale defaults.
 */
export function getFeeSupportRequestFilterFormMountKey(searchParams: URLSearchParams): string {
  return SIMPLE_FILTER_KEYS.map((key) => searchParams.get(key) ?? '').join('|')
}

/** Write the filter form values into a fresh `URLSearchParams`, preserving pagination, search and ordering. */
export function applyFeeSupportRequestFilterToParams(
  formData: FeeSupportRequestFilterFormData,
  options: { pageSize: string; search?: string | null; ordering?: string | null }
): URLSearchParams {
  const params = new URLSearchParams()
  params.set('page', '1')
  params.set('page_size', options.pageSize)
  if (options.search) params.set('search', options.search)
  if (options.ordering) params.set('ordering', options.ordering)

  for (const key of SIMPLE_FILTER_KEYS) {
    const value = formData[key]
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }

  return params
}

/** Drop every filter-dialog field from the URL, keeping pagination/search/ordering. */
export function clearFeeSupportRequestFilterFromParams(
  searchParams: URLSearchParams
): URLSearchParams {
  const params = new URLSearchParams(searchParams)
  for (const key of SIMPLE_FILTER_KEYS) params.delete(key)
  params.set('page', '1')
  return params
}
