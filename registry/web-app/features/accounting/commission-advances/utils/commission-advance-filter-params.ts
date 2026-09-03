import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import type {
  GetCommissionAdvancesParams,
  CommissionAdvanceFilterFormData,
} from '@/features/accounting/commission-advances/services/commission-advance-service'

/** API query params for the list endpoint, without the `| undefined` wrapper of the generated type. */
type CommissionAdvanceApiParams = NonNullable<GetCommissionAdvancesParams>

/**
 * Build the list-endpoint API query params from the URL search params.
 *
 * `recipient_employee` is a repeated URL param (`?recipient_employee=1&recipient_employee=2`)
 * mapped to a `number[]`; the openapi-fetch client is configured with
 * `array: { style: 'form', explode: false }`, so it serialises to the
 * comma-separated form the backend expects (`recipient_employee=1,2`).
 */
export function buildCommissionAdvanceApiParams(
  searchParams: URLSearchParams
): CommissionAdvanceApiParams {
  const params: CommissionAdvanceApiParams = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  params.page_size =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const status = searchParams.get('status')
  if (status) params.status = status as CommissionAdvanceApiParams['status']

  const search = searchParams.get('search')
  if (search) params.search = search

  const requesterEmployee = parsePositiveInt(searchParams.get('requester_employee'))
  if (requesterEmployee) params.requester_employee = requesterEmployee

  const recipientEmployee = searchParams
    .getAll('recipient_employee')
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
  if (recipientEmployee.length > 0) params.recipient_employee = recipientEmployee

  const deal = parsePositiveInt(searchParams.get('deal'))
  if (deal) params.deal = deal

  return params
}

/** Read the current filter values out of the URL to pre-fill the filter form. */
export function getCommissionAdvanceFilterValues(
  searchParams: URLSearchParams
): CommissionAdvanceFilterFormData {
  const data: CommissionAdvanceFilterFormData = {}

  if (searchParams.has('status')) data.status = searchParams.get('status') ?? undefined
  if (searchParams.has('requester_employee'))
    data.requester_employee = searchParams.get('requester_employee') ?? undefined

  const recipients = searchParams.getAll('recipient_employee')
  if (recipients.length > 0) data.recipient_employee = recipients

  if (searchParams.has('deal')) data.deal = searchParams.get('deal') ?? undefined

  return data
}

/**
 * Count of active filters for the toolbar badge — mirrors the previous inline logic:
 * search (driven by the search box) plus the four filter-dialog fields. A repeated
 * `recipient_employee` still counts as a single active filter.
 */
export function countCommissionAdvanceActiveFilters(searchParams: URLSearchParams): number {
  let count = 0
  if (searchParams.has('search')) count++
  if (searchParams.has('status')) count++
  if (searchParams.has('requester_employee')) count++
  if (searchParams.has('recipient_employee')) count++
  if (searchParams.has('deal')) count++
  return count
}

/**
 * Write the filter form values into a fresh `URLSearchParams`, preserving pagination + search.
 * `recipient_employee` is written as repeated params so {@link buildCommissionAdvanceApiParams}
 * can read them back via `getAll`.
 */
export function applyCommissionAdvanceFilterToParams(
  formData: CommissionAdvanceFilterFormData,
  options: { pageSize: string; search?: string }
): URLSearchParams {
  const params = new URLSearchParams()
  params.set('page', '1')
  params.set('page_size', options.pageSize)
  if (options.search) params.set('search', options.search)

  if (formData.status) params.set('status', String(formData.status))
  if (formData.requester_employee)
    params.set('requester_employee', String(formData.requester_employee))
  if (formData.recipient_employee && formData.recipient_employee.length > 0) {
    formData.recipient_employee.forEach((value) => {
      if (value != null && value !== '') params.append('recipient_employee', String(value))
    })
  }
  if (formData.deal) params.set('deal', String(formData.deal))

  return params
}
