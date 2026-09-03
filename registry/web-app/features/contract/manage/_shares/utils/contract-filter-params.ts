import { parse } from 'date-fns'
import { EmployeeType } from '@/constants/api-schema-aliases'
import { type GetContractsParams } from '@/features/contract/services/contract-service'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'

export const VALID_EMPLOYEE_TYPE_VALUES: string[] = Object.values(EmployeeType)

// Default ordering: contracts closest to expiration first (ascending expiration_date)
export const DEFAULT_CONTRACT_ORDERING = 'expiration_date'

export type ContractFilterParams = {
  effective_date_range?: { from?: Date; to?: Date } | null
  expiration_date_range?: { from?: Date; to?: Date } | null
  contract_type_id?: number
  branch_id?: number
  block_id?: number
  department_id?: number
  employee_id?: number
  employee_type?: string
  status?: string[]
}

/**
 * Parse a `<field>_from` / `<field>_to` pair from the URL into a date range for the filter form
 */
function parseDateRangeFromUrl(
  searchParams: URLSearchParams,
  fromKey: string,
  toKey: string
): { from?: Date; to?: Date } | undefined {
  const fromDate = searchParams.get(fromKey)
  const toDate = searchParams.get(toKey)
  if (!fromDate && !toDate) return undefined

  try {
    return {
      from: fromDate ? parse(fromDate, DATE_SERVER_FORMAT, new Date()) : undefined,
      to: toDate ? parse(toDate, DATE_SERVER_FORMAT, new Date()) : undefined,
    }
  } catch {
    // If parsing fails, leave as undefined
    return undefined
  }
}

/**
 * Parse filter params from URL search params (for form display only, no validation)
 */
export function parseFilterParamsFromUrl(searchParams: URLSearchParams): ContractFilterParams {
  const params: ContractFilterParams = {}

  const effectiveDateRange = parseDateRangeFromUrl(
    searchParams,
    'effective_date_from',
    'effective_date_to'
  )
  if (effectiveDateRange) {
    params.effective_date_range = effectiveDateRange
  }

  const expirationDateRange = parseDateRangeFromUrl(
    searchParams,
    'expiration_date_from',
    'expiration_date_to'
  )
  if (expirationDateRange) {
    params.expiration_date_range = expirationDateRange
  }

  // Parse IDs without validation (validation happens via hooks)
  const contractTypeId = parsePositiveInt(searchParams.get('contract_type'))
  if (contractTypeId) {
    params.contract_type_id = contractTypeId
  }

  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) {
    params.branch_id = branchId
  }

  const blockId = parsePositiveInt(searchParams.get('block'))
  if (blockId) {
    params.block_id = blockId
  }

  const departmentId = parsePositiveInt(searchParams.get('department'))
  if (departmentId) {
    params.department_id = departmentId
  }

  const employeeId = parsePositiveInt(searchParams.get('employee'))
  if (employeeId) {
    params.employee_id = employeeId
  }

  const employeeType = searchParams.get('employee_type')
  if (employeeType && VALID_EMPLOYEE_TYPE_VALUES.includes(employeeType)) {
    params.employee_type = employeeType
  }

  // Parse status (array from URL)
  const statuses = searchParams.getAll('status')
  if (statuses.length > 0) {
    params.status = statuses
  }

  return params
}

/**
 * Build API params from URL search params (without validation - will be validated separately)
 */
export function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetContractsParams> {
  const params: NonNullable<GetContractsParams> = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  // Ordering - URL format: -field for desc, field for asc
  // Default to expiration_date ascending (nearest expiration first) when not set
  params.ordering = searchParams.get('ordering') || DEFAULT_CONTRACT_ORDERING

  // Search
  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }

  // Filter params - date range
  const fromDate = searchParams.get('effective_date_from')
  if (fromDate) {
    params.effective_date_from = fromDate
  }

  const toDate = searchParams.get('effective_date_to')
  if (toDate) {
    params.effective_date_to = toDate
  }

  const expirationFromDate = searchParams.get('expiration_date_from')
  if (expirationFromDate) {
    params.expiration_date_from = expirationFromDate
  }

  const expirationToDate = searchParams.get('expiration_date_to')
  if (expirationToDate) {
    params.expiration_date_to = expirationToDate
  }

  // Note: contract_type, branch, block, department, employee, employee_type, status will be added after validation

  return params
}
