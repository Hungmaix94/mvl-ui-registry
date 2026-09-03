import { format, isValid, parseISO } from 'date-fns'
import type { GetFirstAttendanceParams } from '@/features/attendance/services/attendance-record-service'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { DATE_SERVER_FORMAT } from '@/constants/date-format'
import { AttendanceApproveStatus } from '@/constants/api-schema-aliases'

export type AttendanceLogFilterValues = {
  date?: Date | null
  attendance_type?: string[]
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
  employee_id?: number
  approve_status?: AttendanceApproveStatus[]
}

function parseDateSafe(value: string | null): Date | undefined {
  if (!value) return undefined
  const parsed = parseISO(value)
  if (!isValid(parsed)) return undefined
  return parsed
}

/**
 * Build API params from URL search params for first-attendance list.
 * Does not include approve_status.
 */
export function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): GetFirstAttendanceParams | undefined {
  const params: GetFirstAttendanceParams = {}

  const page = parsePositiveInt(searchParams.get('page'))
  params.page = page || 1

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering

  const search = searchParams.get('search')
  if (search) params.search = search

  const dateStr = searchParams.get('date')
  if (dateStr) params.date = dateStr

  const attendanceTypes = searchParams.getAll('attendance_type')
  if (attendanceTypes.length > 0) params.attendance_type__in = attendanceTypes.join(',')

  const validApproveStatuses = Object.values(AttendanceApproveStatus)

  const approveStatusIn = searchParams.get('approve_status__in')
  const parsedApproveStatusIn = approveStatusIn
    ? approveStatusIn
        .split(',')
        .map((status) => status.trim())
        .filter((status) => validApproveStatuses.includes(status as AttendanceApproveStatus))
    : []

  const fallbackApproveStatus = searchParams
    .getAll('approve_status')
    .filter((status) => validApproveStatuses.includes(status as AttendanceApproveStatus))

  const approveStatus = (
    parsedApproveStatusIn.length ? parsedApproveStatusIn : fallbackApproveStatus
  ) as AttendanceApproveStatus[]

  if (approveStatus.length > 0) {
    ;(params as any).approve_status__in = approveStatus.join(',')
  }

  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) params.branch = branchId

  const blockId = parsePositiveInt(searchParams.get('block'))
  if (blockId) params.block = blockId

  const departmentId = parsePositiveInt(searchParams.get('department'))
  if (departmentId) params.department = departmentId

  const positionId = parsePositiveInt(searchParams.get('position'))
  if (positionId) params.position = positionId

  const employeeId = parsePositiveInt(searchParams.get('employee'))
  if (employeeId) params.employee = employeeId

  return params
}

/**
 * Parse filter params from URL for form display.
 */
export function parseFiltersFromUrl(searchParams: URLSearchParams): AttendanceLogFilterValues {
  const branch_id = parsePositiveInt(searchParams.get('branch')) || undefined
  const block_id = parsePositiveInt(searchParams.get('block')) || undefined
  const department_id = parsePositiveInt(searchParams.get('department')) || undefined
  const position_id = parsePositiveInt(searchParams.get('position')) || undefined
  const employee_id = parsePositiveInt(searchParams.get('employee')) || undefined

  const dateStr = searchParams.get('date')
  let date: Date | undefined
  if (dateStr) {
    const parsed = parseDateSafe(dateStr)
    if (parsed) date = parsed
  }

  const attendance_type = searchParams.getAll('attendance_type')
  const validApproveStatuses = Object.values(AttendanceApproveStatus)
  const approveStatusIn = searchParams.get('approve_status__in')
  const parsedApproveStatusIn = approveStatusIn
    ? approveStatusIn
        .split(',')
        .map((status) => status.trim())
        .filter((status) => validApproveStatuses.includes(status as AttendanceApproveStatus))
    : []
  const fallbackApproveStatus = searchParams
    .getAll('approve_status')
    .filter((status) => validApproveStatuses.includes(status as AttendanceApproveStatus))
  const approve_status = (
    parsedApproveStatusIn.length ? parsedApproveStatusIn : fallbackApproveStatus
  ) as AttendanceApproveStatus[]

  return {
    date,
    attendance_type,
    approve_status,
    branch_id,
    block_id,
    department_id,
    position_id,
    employee_id,
  }
}

/**
 * Default date string for today in API format (YYYY-MM-DD).
 */
export function getDefaultDateString(): string {
  return format(new Date(), DATE_SERVER_FORMAT)
}

export function getDefaultDateRangeParams(): {
  date_from: string
  date_to: string
} {
  const today = format(new Date(), DATE_SERVER_FORMAT)
  return {
    date_from: today,
    date_to: today,
  }
}
