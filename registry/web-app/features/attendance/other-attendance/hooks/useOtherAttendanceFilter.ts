import { startOfDay, endOfDay, isValid, parseISO } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import type { OtherAttendanceFilterValues } from '@/features/attendance/other-attendance/components/OtherAttendanceFilterForm'
import type { GetAttendanceRecordsParams } from '@/features/attendance/services/attendance-record-service'
import { parsePositiveInt } from '@/utils/common'
import {
  TimesheetLogMethod as AttendanceType,
  AttendanceApproveStatus,
} from '@/constants/api-schema-aliases'

const ATTENDANCE_TYPE_OTHER = AttendanceType.other

type AttendanceRecordFilterParams = NonNullable<GetAttendanceRecordsParams> & {
  branch?: number
  block?: number
  department?: number
  position?: number
}

function parseDateSafe(value: string | null): Date | undefined {
  if (!value) return undefined
  const parsed = parseISO(value)
  if (!isValid(parsed)) {
    return undefined
  }
  return parsed
}

/**
 * Build API params from URL search params
 */
export function buildApiParamsFromUrl(searchParams: URLSearchParams): AttendanceRecordFilterParams {
  const params: AttendanceRecordFilterParams = {
    attendance_type: ATTENDANCE_TYPE_OTHER,
  }

  // Always set page and page_size (with defaults if not in URL)
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

  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  if (dateFrom) {
    const fromDate = parseDateSafe(dateFrom) ?? new Date(dateFrom)
    if (isValid(fromDate)) {
      params.timestamp_after = startOfDay(fromDate).toISOString()
    }
  }

  if (dateTo) {
    const toDate = parseDateSafe(dateTo) ?? new Date(dateTo)
    if (isValid(toDate)) {
      params.timestamp_before = endOfDay(toDate).toISOString()
    }
  }

  const approveStatusParam = searchParams.get('approve_status')
  if (approveStatusParam) {
    const statuses = approveStatusParam
      .split(',')
      .map((s) => s.trim())
      .filter((s) =>
        Object.values(AttendanceApproveStatus).includes(s as AttendanceApproveStatus)
      ) as AttendanceApproveStatus[]
    if (statuses.length > 0) {
      params.approve_status = statuses
    }
  }

  return params
}

/**
 * Parse filter params from URL search params (for form display)
 */
export function parseFiltersFromUrl(searchParams: URLSearchParams): OtherAttendanceFilterValues {
  const branch_id = parsePositiveInt(searchParams.get('branch')) || undefined
  const block_id = parsePositiveInt(searchParams.get('block')) || undefined
  const department_id = parsePositiveInt(searchParams.get('department')) || undefined
  const position_id = parsePositiveInt(searchParams.get('position')) || undefined
  const employee_id = parsePositiveInt(searchParams.get('employee')) || undefined

  const date_from = searchParams.get('date_from')
  const date_to = searchParams.get('date_to')

  let date_range: DateRange | undefined
  const fromDate = date_from ? (parseDateSafe(date_from) ?? new Date(date_from)) : undefined
  const toDate = date_to ? (parseDateSafe(date_to) ?? new Date(date_to)) : undefined

  if ((fromDate && isValid(fromDate)) || (toDate && isValid(toDate))) {
    date_range = {
      from: fromDate && isValid(fromDate) ? fromDate : undefined,
      to: toDate && isValid(toDate) ? toDate : undefined,
    }
  }

  const approveStatusParam = searchParams.get('approve_status')
  let approve_status: AttendanceApproveStatus[] | undefined
  if (approveStatusParam) {
    const statuses = approveStatusParam
      .split(',')
      .map((s) => s.trim())
      .filter((s) =>
        Object.values(AttendanceApproveStatus).includes(s as AttendanceApproveStatus)
      ) as AttendanceApproveStatus[]
    if (statuses.length > 0) {
      approve_status = statuses
    }
  }

  return {
    branch_id,
    block_id,
    department_id,
    position_id,
    employee_id,
    date_range,
    approve_status,
  }
}
