import { isValid, parseISO } from 'date-fns'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { paths } from '@/api/schema'
import { parsePositiveInt } from '@/utils/common'
import { DailyTimesheetStatus, TimesheetLogMethod } from '@/constants/api-schema-aliases'

export type DailyTimesheetFilterFormValues = {
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
  date?: Date | string | null
  statuses?: DailyTimesheetStatus[]
  first_log_method?: TimesheetLogMethod
  first_log_project?: number
  first_log_biometric_device?: number
}

type DailyTimesheetApiParams = NonNullable<
  paths['/api/hrm/timesheet/daily-entries/']['get']['parameters']['query']
>

export function buildApiParamsFromUrl(searchParams: URLSearchParams): DailyTimesheetApiParams {
  const params: DailyTimesheetApiParams = {}

  const page = parsePositiveInt(searchParams.get('page'))
  params.page = page || 1

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  const ordering = searchParams.get('ordering')
  if (ordering) {
    params.ordering = ordering
  }

  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }

  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) {
    params.branch = branchId
  }

  const blockId = parsePositiveInt(searchParams.get('block'))
  if (blockId) {
    params.block = blockId
  }

  const departmentId = parsePositiveInt(searchParams.get('department'))
  if (departmentId) {
    params.department = departmentId
  }

  const positionId = parsePositiveInt(searchParams.get('position'))
  if (positionId) {
    params.position = positionId
  }

  const date = searchParams.get('date')
  if (date) {
    params.date = date
  }

  const firstLogMethod = searchParams.get('first_log_method')
  if (
    firstLogMethod &&
    Object.values(TimesheetLogMethod).includes(firstLogMethod as TimesheetLogMethod)
  ) {
    params.first_log_method = firstLogMethod as TimesheetLogMethod
  }

  const firstLogProject = parsePositiveInt(searchParams.get('first_log_project'))
  if (firstLogProject) {
    params.first_log_project = firstLogProject
  }

  const firstLogBiometricDevice = parsePositiveInt(searchParams.get('first_log_biometric_device'))
  if (firstLogBiometricDevice) {
    params.first_log_biometric_device = firstLogBiometricDevice
  }

  const statusInParam = searchParams.get('status__in')
  let statuses: DailyTimesheetStatus[] = []

  if (statusInParam) {
    statuses = statusInParam
      .split(',')
      .map((value) => value.trim())
      .filter((value): value is DailyTimesheetStatus =>
        Object.values(DailyTimesheetStatus).includes(value as DailyTimesheetStatus)
      )
  } else {
    const statusParam = searchParams.get('status')
    if (statusParam) {
      const casted = statusParam as DailyTimesheetStatus
      if (Object.values(DailyTimesheetStatus).includes(casted)) {
        statuses = [casted]
      }
    }
  }

  if (statuses.length > 0) {
    // `status__in` now natively includes `not_checked_in` in the generated schema,
    // so the validated statuses assign directly (no cast needed).
    params.status__in = statuses
  }

  return params
}

export function parseFiltersFromUrl(searchParams: URLSearchParams): DailyTimesheetFilterFormValues {
  const branch_id = parsePositiveInt(searchParams.get('branch')) || undefined
  const block_id = parsePositiveInt(searchParams.get('block')) || undefined
  const department_id = parsePositiveInt(searchParams.get('department')) || undefined
  const position_id = parsePositiveInt(searchParams.get('position')) || undefined
  const first_log_project = parsePositiveInt(searchParams.get('first_log_project')) || undefined
  const first_log_biometric_device =
    parsePositiveInt(searchParams.get('first_log_biometric_device')) || undefined

  const firstLogMethodParam = searchParams.get('first_log_method')
  const first_log_method =
    firstLogMethodParam &&
    Object.values(TimesheetLogMethod).includes(firstLogMethodParam as TimesheetLogMethod)
      ? (firstLogMethodParam as TimesheetLogMethod)
      : undefined

  let date: Date | undefined
  const dateParam = searchParams.get('date')
  if (dateParam) {
    const parsed = parseISO(dateParam)
    if (isValid(parsed)) {
      date = parsed
    }
  }

  let statuses: DailyTimesheetStatus[] | undefined
  const statusInParam = searchParams.get('status__in')
  if (statusInParam) {
    const parsed = statusInParam
      .split(',')
      .map((value) => value.trim())
      .filter((value): value is DailyTimesheetStatus =>
        Object.values(DailyTimesheetStatus).includes(value as DailyTimesheetStatus)
      )
    if (parsed.length > 0) {
      statuses = parsed
    }
  } else {
    const statusParam = searchParams.get('status')
    if (statusParam) {
      const casted = statusParam as DailyTimesheetStatus
      if (Object.values(DailyTimesheetStatus).includes(casted)) {
        statuses = [casted]
      }
    }
  }

  return {
    branch_id,
    block_id,
    department_id,
    position_id,
    date,
    statuses,
    first_log_method,
    first_log_project,
    first_log_biometric_device,
  }
}
