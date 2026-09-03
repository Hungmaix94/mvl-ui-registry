import { PageTitle } from '@/components/ui'
import Button from '@/components/ui/button/Button'
import { IconExport } from '@/assets/icons'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import EmployeeTable from '@/features/employee/management/view/EmployeeTable.tsx'
import { Flex } from '@radix-ui/themes'
import { useEmployeeDelete } from '@/features/employee/management/_shares/hooks/useEmployeeDelete.tsx'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import useEmployeeImport from '@/features/employee/management/_shares/hooks/useEmployeeImport.tsx'
import { useEmployeeExport } from '@/features/employee/management/_shares/hooks/useEmployeeExport.tsx'
import {
  EmployeeFilterFormData,
  EmployeeFilterFormRef,
} from '@/features/employee/management/_shares/components/EmployeeFilterForm.tsx'
import EmployeeFilterForm from '@/features/employee/management/_shares/components/EmployeeFilterForm.tsx'
import { applyEmployeeListDefaultFilters } from '@/features/employee/management/_shares/utils/employee-list-default-filters.ts'
import { GetEmployeesParams, GetEmployeesExportParams } from '@/services'
import {
  useExportEmployeesLimit,
  type GetEmployeesExportLimitParams,
} from '@/features/employee/services/employee-service'
import {
  EMPLOYEE_FILTER_STATUS_VALUES,
  EMPLOYEE_FILTER_YES_NO_VALUES,
  TEmployeeFilter,
} from '@/constants/employee-filter.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { useDebounceValue } from 'usehooks-ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
  usePositionForFilter,
} from '@/hooks/useFilterEntityValidation'
import { useExport } from '@/hooks/useExport.tsx'
import {
  ExportDelivery,
  EmployeeDocumentSubmissionStatus,
  EmployeeType,
  EmployeeStatus,
  EmployeeGender,
} from '@/constants/api-schema-aliases'

// Valid values for predefined option fields
const VALID_GENDER_VALUES: string[] = Object.values(EmployeeGender)
// "Nghỉ không lương" bị loại khỏi bộ lọc — chặn cả khi đọc từ URL (nguồn: employee-filter.ts)
const VALID_STATUS_VALUES: string[] = EMPLOYEE_FILTER_STATUS_VALUES
const VALID_EMPLOYEE_TYPE_VALUES: string[] = Object.values(EmployeeType)
const VALID_DOCUMENT_SUBMISSION_STATUS_VALUES: string[] = Object.values(
  EmployeeDocumentSubmissionStatus
)
const VALID_BOOLEAN_VALUES: string[] = [
  EMPLOYEE_FILTER_YES_NO_VALUES.YES,
  EMPLOYEE_FILTER_YES_NO_VALUES.NO,
]

/**
 * Parse employee filter params from URL search params
 * Only set values that are valid options (for predefined option fields)
 */
function parseEmployeeFilterParamsFromUrl(searchParams: URLSearchParams): EmployeeFilterFormData {
  const params: EmployeeFilterFormData = {}

  // Statuses (multi-value) - only include valid status values
  const statuses = searchParams.getAll('statuses')
  if (statuses.length > 0) {
    const validStatuses = statuses.filter((s) => VALID_STATUS_VALUES.includes(s))
    if (validStatuses.length > 0) {
      params.statuses = validStatuses as EmployeeStatus[]
    }
  }

  // Employee types (multi-value)
  const employeeTypes = searchParams.getAll('employee_types')
  if (employeeTypes.length > 0) {
    const valid = employeeTypes.filter((t) => VALID_EMPLOYEE_TYPE_VALUES.includes(t))
    if (valid.length > 0) {
      params.employee_types = valid as EmployeeType[]
    }
  }

  // Gender - only set if value is valid
  const gender = searchParams.get('gender')
  if (gender && VALID_GENDER_VALUES.includes(gender)) {
    params.gender = gender as EmployeeGender
  }

  // Birthday month (stored as 1-12 in URL)
  const birthdayMonth = searchParams.get('birthday_month')
  if (birthdayMonth) {
    const monthNum = parseInt(birthdayMonth, 10)
    if (monthNum >= 1 && monthNum <= 12) {
      // Create a Date object with that month (0-indexed in JS Date)
      params.birthday_month = new Date(new Date().getFullYear(), monthNum - 1, 1)
    }
  }

  // Boolean-like filter fields - only set if value is valid ('true' or 'false')
  const isLeadership = searchParams.get('position__is_leadership')
  if (isLeadership && VALID_BOOLEAN_VALUES.includes(isLeadership)) {
    params.is_leadership = isLeadership as TEmployeeFilter
  }

  const sendOnboardingEmail = searchParams.get('is_onboarding_email_sent')
  if (sendOnboardingEmail && VALID_BOOLEAN_VALUES.includes(sendOnboardingEmail)) {
    params.send_onboarding_email = sendOnboardingEmail as TEmployeeFilter
  }

  const hasCitizenIdFile = searchParams.get('has_citizen_id_file')
  if (hasCitizenIdFile && VALID_BOOLEAN_VALUES.includes(hasCitizenIdFile)) {
    params.has_citizen_id_file = hasCitizenIdFile as TEmployeeFilter
  }

  const documentSubmissionStatus = searchParams.get('document_submission_status')
  if (
    documentSubmissionStatus &&
    VALID_DOCUMENT_SUBMISSION_STATUS_VALUES.includes(documentSubmissionStatus)
  ) {
    params.document_submission_status = documentSubmissionStatus as EmployeeDocumentSubmissionStatus
  }

  const isTerminationNoticeSent = searchParams.get('is_termination_notice_sent')
  if (isTerminationNoticeSent && VALID_BOOLEAN_VALUES.includes(isTerminationNoticeSent)) {
    params.is_termination_notice_sent = isTerminationNoticeSent as TEmployeeFilter
  }

  const handoverCompleted = searchParams.get('handover_completed')
  if (handoverCompleted && VALID_BOOLEAN_VALUES.includes(handoverCompleted)) {
    params.handover_completed = handoverCompleted as TEmployeeFilter
  }

  const isOsCodeType = searchParams.get('is_os_code_type')
  if (isOsCodeType && VALID_BOOLEAN_VALUES.includes(isOsCodeType)) {
    params.is_os_code_type = isOsCodeType as TEmployeeFilter
  }

  const includeReportExcludedPositions = searchParams.get('include_report_excluded_positions')
  if (
    includeReportExcludedPositions &&
    VALID_BOOLEAN_VALUES.includes(includeReportExcludedPositions)
  ) {
    params.include_report_excluded_positions = includeReportExcludedPositions as TEmployeeFilter
  }

  const isReturningEmployee = searchParams.get('is_returning_employee')
  if (isReturningEmployee && VALID_BOOLEAN_VALUES.includes(isReturningEmployee)) {
    params.is_returning_employee = isReturningEmployee as TEmployeeFilter
  }

  params.start_date__gte = parseDateFromApi(searchParams.get('start_date__gte'))
  params.start_date__lte = parseDateFromApi(searchParams.get('start_date__lte'))
  params.resignation_start_date__gte = parseDateFromApi(
    searchParams.get('resignation_start_date__gte')
  )
  params.resignation_start_date__lte = parseDateFromApi(
    searchParams.get('resignation_start_date__lte')
  )

  return params
}

/**
 * Build API params from URL search params (typed as GetEmployeesParams)
 * Only use valid values for predefined option fields
 */
function buildApiParamsFromUrl(searchParams: URLSearchParams): NonNullable<GetEmployeesParams> {
  const params: NonNullable<GetEmployeesParams> = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  // Ordering
  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering

  // Search
  const search = searchParams.get('search')
  if (search) params.search = search

  // Statuses (multi-value) - only use valid status values
  const statuses = searchParams.getAll('statuses')
  if (statuses.length > 0) {
    const validStatuses = statuses.filter((s) => VALID_STATUS_VALUES.includes(s))
    if (validStatuses.length > 0) {
      params.statuses = validStatuses as EmployeeStatus[]
    }
  }

  // Employee types (multi-value)
  const employeeTypes = searchParams.getAll('employee_types')
  if (employeeTypes.length > 0) {
    const valid = employeeTypes.filter((t) => VALID_EMPLOYEE_TYPE_VALUES.includes(t))
    if (valid.length > 0) {
      params.employee_types = valid as EmployeeType[]
    }
  }

  // Gender - only use if value is valid
  const gender = searchParams.get('gender')
  if (gender && VALID_GENDER_VALUES.includes(gender)) {
    params.gender = gender as EmployeeGender
  }

  // Birthday month - validate range
  const birthdayMonth = searchParams.get('birthday_month')
  if (birthdayMonth) {
    const monthNum = parseInt(birthdayMonth, 10)
    if (monthNum >= 1 && monthNum <= 12) {
      params.date_of_birth__month = monthNum
    }
  }

  // Boolean API fields
  const isLeadership = searchParams.get('position__is_leadership')
  if (isLeadership === 'true') params.position__is_leadership = true
  else if (isLeadership === 'false') params.position__is_leadership = false

  const sendOnboardingEmail = searchParams.get('is_onboarding_email_sent')
  if (sendOnboardingEmail === 'true') params.is_onboarding_email_sent = true
  else if (sendOnboardingEmail === 'false') params.is_onboarding_email_sent = false

  const hasCitizenIdFile = searchParams.get('has_citizen_id_file')
  if (hasCitizenIdFile === 'true') params.has_citizen_id_file = true
  else if (hasCitizenIdFile === 'false') params.has_citizen_id_file = false

  const documentSubmissionStatus = searchParams.get('document_submission_status')
  if (
    documentSubmissionStatus &&
    VALID_DOCUMENT_SUBMISSION_STATUS_VALUES.includes(documentSubmissionStatus)
  ) {
    params.document_submission_status = documentSubmissionStatus as EmployeeDocumentSubmissionStatus
  }

  const isTerminationNoticeSent = searchParams.get('is_termination_notice_sent')
  if (isTerminationNoticeSent === 'true') params.is_termination_notice_sent = true
  else if (isTerminationNoticeSent === 'false') params.is_termination_notice_sent = false

  const handoverCompleted = searchParams.get('handover_completed')
  if (handoverCompleted === 'true') params.handover_completed = true
  else if (handoverCompleted === 'false') params.handover_completed = false

  const isOsCodeType = searchParams.get('is_os_code_type')
  if (isOsCodeType === 'true') params.is_os_code_type = true
  else if (isOsCodeType === 'false') params.is_os_code_type = false

  const includeReportExcludedPositions = searchParams.get('include_report_excluded_positions')
  if (includeReportExcludedPositions === 'true') {
    params.include_report_excluded_positions = true
  } else if (includeReportExcludedPositions === 'false') {
    params.include_report_excluded_positions = false
  }

  const isReturningEmployee = searchParams.get('is_returning_employee')
  if (isReturningEmployee === 'true') params.is_returning_employee = true
  else if (isReturningEmployee === 'false') params.is_returning_employee = false

  const startDateGte = searchParams.get('start_date__gte')
  if (startDateGte) params.start_date__gte = startDateGte
  const startDateLte = searchParams.get('start_date__lte')
  if (startDateLte) params.start_date__lte = startDateLte

  const resignationStartGte = searchParams.get('resignation_start_date__gte')
  if (resignationStartGte) params.resignation_start_date__gte = resignationStartGte
  const resignationStartLte = searchParams.get('resignation_start_date__lte')
  if (resignationStartLte) params.resignation_start_date__lte = resignationStartLte

  return params
}

/**
 * Serialize employee filter form values to URL search params
 */
function serializeEmployeeFiltersToUrl(
  values: EmployeeFilterFormData,
  baseParams: URLSearchParams
): URLSearchParams {
  const newParams = new URLSearchParams()

  // Keep non-filter params
  newParams.set('page', '1') // Reset to page 1 when filter changes
  const pageSizeFromUrl = parsePositiveInt(baseParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  newParams.set('page_size', String(safePageSize))

  const search = baseParams.get('search')
  if (search) newParams.set('search', search)

  const ordering = baseParams.get('ordering')
  if (ordering) newParams.set('ordering', ordering)

  // Serialize filter values
  if (values.branch_id) newParams.set('branch', String(values.branch_id))
  if (values.block_id) newParams.set('block', String(values.block_id))
  if (values.department_id) newParams.set('department', String(values.department_id))
  if (values.position) newParams.set('position', String(values.position))

  // Statuses (multi-value)
  if (values.statuses && values.statuses.length > 0) {
    values.statuses.forEach((status) => newParams.append('statuses', status))
  }

  // Employee types (multi-value)
  if (values.employee_types && values.employee_types.length > 0) {
    values.employee_types.forEach((t) => {
      if (t != null) newParams.append('employee_types', t)
    })
  }

  if (values.gender) newParams.set('gender', values.gender)

  // Birthday month (store as 1-12)
  if (values.birthday_month) {
    newParams.set('birthday_month', String(values.birthday_month.getMonth() + 1))
  }

  // Boolean-like fields
  if (values.is_leadership) {
    newParams.set('position__is_leadership', values.is_leadership)
  }
  if (values.send_onboarding_email) {
    newParams.set('is_onboarding_email_sent', values.send_onboarding_email)
  }
  if (values.has_citizen_id_file) {
    newParams.set('has_citizen_id_file', values.has_citizen_id_file)
  }
  if (values.document_submission_status) {
    newParams.set('document_submission_status', values.document_submission_status)
  }
  if (values.is_termination_notice_sent) {
    newParams.set('is_termination_notice_sent', values.is_termination_notice_sent)
  }
  if (values.handover_completed) {
    newParams.set('handover_completed', values.handover_completed)
  }
  if (values.is_os_code_type) {
    newParams.set('is_os_code_type', values.is_os_code_type)
  }
  if (values.include_report_excluded_positions) {
    newParams.set('include_report_excluded_positions', values.include_report_excluded_positions)
  }
  if (values.is_returning_employee) {
    newParams.set('is_returning_employee', values.is_returning_employee)
  }

  if (values.start_date__gte) {
    newParams.set('start_date__gte', formatDateToApi(values.start_date__gte))
  }
  if (values.start_date__lte) {
    newParams.set('start_date__lte', formatDateToApi(values.start_date__lte))
  }

  if (values.resignation_start_date__gte) {
    newParams.set(
      'resignation_start_date__gte',
      formatDateToApi(values.resignation_start_date__gte)
    )
  }
  if (values.resignation_start_date__lte) {
    newParams.set(
      'resignation_start_date__lte',
      formatDateToApi(values.resignation_start_date__lte)
    )
  }

  return newParams
}

function buildEmployeesExportParamsFromListQuery(
  apiParams: NonNullable<GetEmployeesParams> | undefined
): GetEmployeesExportParams {
  const exportParams: GetEmployeesExportParams = {}

  if (apiParams) {
    if (apiParams.branch) exportParams.branch = apiParams.branch
    if (apiParams.block) exportParams.block = apiParams.block
    if (apiParams.department) exportParams.department = apiParams.department
    if (apiParams.position) exportParams.position = apiParams.position
    if (Array.isArray(apiParams.statuses) && apiParams.statuses.length > 0) {
      exportParams.statuses = apiParams.statuses
    }
    if (Array.isArray(apiParams.employee_types) && apiParams.employee_types.length > 0) {
      exportParams.employee_types = apiParams.employee_types.filter(
        (t): t is EmployeeType => t !== null
      )
    }
    if (apiParams.gender) exportParams.gender = apiParams.gender
    if (apiParams.date_of_birth__month) {
      exportParams.date_of_birth__month = apiParams.date_of_birth__month
    }
    if (apiParams.position__is_leadership !== undefined) {
      exportParams.position__is_leadership = apiParams.position__is_leadership
    }
    if (apiParams.is_onboarding_email_sent !== undefined) {
      exportParams.is_onboarding_email_sent = apiParams.is_onboarding_email_sent
    }
    if (apiParams.has_citizen_id_file !== undefined) {
      exportParams.has_citizen_id_file = apiParams.has_citizen_id_file
    }
    if (apiParams.document_submission_status) {
      exportParams.document_submission_status = apiParams.document_submission_status
    }
    if (apiParams.is_termination_notice_sent !== undefined) {
      exportParams.is_termination_notice_sent = apiParams.is_termination_notice_sent
    }
    if (apiParams.handover_completed !== undefined) {
      exportParams.handover_completed = apiParams.handover_completed
    }
    if (apiParams.is_os_code_type !== undefined) {
      exportParams.is_os_code_type = apiParams.is_os_code_type
    }
    if (apiParams.include_report_excluded_positions !== undefined) {
      exportParams.include_report_excluded_positions = apiParams.include_report_excluded_positions
    }
    if (apiParams.is_returning_employee !== undefined) {
      exportParams.is_returning_employee = apiParams.is_returning_employee
    }
    if (apiParams.search && apiParams.search.trim() !== '') {
      exportParams.search = apiParams.search
    }
    if (apiParams.start_date__gte) exportParams.start_date__gte = apiParams.start_date__gte
    if (apiParams.start_date__lte) exportParams.start_date__lte = apiParams.start_date__lte
    if (apiParams.resignation_start_date__gte) {
      exportParams.resignation_start_date__gte = apiParams.resignation_start_date__gte
    }
    if (apiParams.resignation_start_date__lte) {
      exportParams.resignation_start_date__lte = apiParams.resignation_start_date__lte
    }
  }

  return exportParams
}

const EmployeeManagementPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()
  const formRef = useRef<EmployeeFilterFormRef>(null)

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Table column config state
  const [shouldShowConfig, setShouldShowConfig] = useState<boolean>(false)

  // Local search input state (for controlled input with debounce)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // Hooks for employee operations
  const { openDeleteDialog } = useEmployeeDelete()
  const { openImportDialog } = useEmployeeImport()
  const { openExportDialog } = useEmployeeExport()
  const exportEmployeesLimitMutation = useExportEmployeesLimit()
  const { openExportDialog: openExportLimitDialog } = useExport<
    NonNullable<GetEmployeesExportParams> & Record<string, unknown>
  >({
    exportFunction: (params) =>
      exportEmployeesLimitMutation.mutateAsync(params as unknown as GetEmployeesExportLimitParams),
    defaultFilename: 'employees-limit.xlsx',
  })

  // ===== Validate cascade selects (top-down): Branch -> Block -> Department, Position independent =====
  const branchIdFromUrl = parsePositiveInt(searchParams.get('branch'))
  const blockIdFromUrl = parsePositiveInt(searchParams.get('block'))
  const departmentIdFromUrl = parsePositiveInt(searchParams.get('department'))
  const positionIdFromUrl = parsePositiveInt(searchParams.get('position'))

  const branchQuery = useBranchForFilter(branchIdFromUrl ?? 0)
  const isBranchValid = !!branchQuery.data

  const blockQuery = useBlockForFilter(blockIdFromUrl ?? 0, branchIdFromUrl)
  const isBlockValid =
    isBranchValid && !!blockQuery.data && blockQuery.data.branch === branchIdFromUrl

  const departmentQuery = useDepartmentForFilter(
    departmentIdFromUrl ?? 0,
    branchIdFromUrl,
    blockIdFromUrl
  )
  const isDepartmentValid = isBlockValid && !!departmentQuery.data

  const positionQuery = usePositionForFilter(positionIdFromUrl ?? 0)
  const isPositionValid = !!positionQuery.data

  const validatedOrgFilterParams = useMemo((): Pick<
    EmployeeFilterFormData,
    'branch_id' | 'block_id' | 'department_id' | 'position'
  > => {
    return {
      branch_id: isBranchValid ? branchIdFromUrl : undefined,
      block_id: isBlockValid ? blockIdFromUrl : undefined,
      department_id: isDepartmentValid ? departmentIdFromUrl : undefined,
      position: isPositionValid ? positionIdFromUrl : undefined,
    }
  }, [
    blockIdFromUrl,
    branchIdFromUrl,
    departmentIdFromUrl,
    isBlockValid,
    isBranchValid,
    isDepartmentValid,
    isPositionValid,
    positionIdFromUrl,
  ])

  const isOrgValidationLoading = useMemo(() => {
    const isBranchLoading = !!branchIdFromUrl && branchQuery.isLoading
    const isBlockLoading = !!blockIdFromUrl && isBranchValid && blockQuery.isLoading
    const isDepartmentLoading = !!departmentIdFromUrl && isBlockValid && departmentQuery.isLoading
    const isPositionLoading = !!positionIdFromUrl && positionQuery.isLoading

    return isBranchLoading || isBlockLoading || isDepartmentLoading || isPositionLoading
  }, [
    blockIdFromUrl,
    blockQuery.isLoading,
    branchIdFromUrl,
    branchQuery.isLoading,
    departmentIdFromUrl,
    departmentQuery.isLoading,
    isBlockValid,
    isBranchValid,
    positionIdFromUrl,
    positionQuery.isLoading,
  ])

  // Initialize URL with defaults if empty
  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    // Apply defaults if URL is completely empty
    if (isUrlEmpty) {
      const newParams = new URLSearchParams()

      // Set pagination defaults (no ordering - only set when user sorts)
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))

      // Bộ lọc mặc định (CR269) — xem employee-list-default-filters.ts
      applyEmployeeListDefaultFilters(newParams)

      setSearchParams(newParams, { replace: true })
    } else {
      // URL has some params - only ensure page and page_size exist (don't force filter defaults)
      const needsUpdate = !hasPage || !hasPageSize
      if (needsUpdate) {
        const newParams = new URLSearchParams(searchParams)
        if (!hasPage) newParams.set('page', '1')
        if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
        setSearchParams(newParams, { replace: true })
      }
    }

    setIsUrlReady(true)
  }, []) // Only run once on mount

  // Sync search input when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  // Update URL when debounced search changes
  useEffect(() => {
    if (!isUrlReady) return

    const currentSearchTerm = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearchTerm) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
      } else {
        newParams.delete('search')
      }
      // Reset to page 1 when search changes
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady])

  const isEmployeesQueryReady = isUrlReady && !isOrgValidationLoading

  // Build API params from URL (ignore invalid cascade selects)
  const apiParams = useMemo(() => {
    if (!isEmployeesQueryReady) return undefined

    const params = buildApiParamsFromUrl(searchParams)

    if (validatedOrgFilterParams.branch_id) params.branch = validatedOrgFilterParams.branch_id
    if (validatedOrgFilterParams.block_id) params.block = validatedOrgFilterParams.block_id
    if (validatedOrgFilterParams.department_id)
      params.department = validatedOrgFilterParams.department_id
    if (validatedOrgFilterParams.position) params.position = validatedOrgFilterParams.position

    return params
  }, [searchParams, isEmployeesQueryReady, validatedOrgFilterParams])

  // Parse current filter params from URL for dialog
  const currentFilterParams = useMemo(() => {
    return {
      ...parseEmployeeFilterParamsFromUrl(searchParams),
      ...validatedOrgFilterParams,
    }
  }, [searchParams, validatedOrgFilterParams])

  // Get pagination info from URL
  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Count active filters (derived from URL)
  const activeFilterCount = useMemo(() => {
    let count = 0

    if (currentFilterParams.branch_id) count++
    if (currentFilterParams.block_id) count++
    if (currentFilterParams.department_id) count++
    if (currentFilterParams.position) count++
    if (currentFilterParams.statuses && currentFilterParams.statuses.length > 0) count++
    if (currentFilterParams.employee_types && currentFilterParams.employee_types.length > 0) count++
    if (currentFilterParams.birthday_month) count++
    if (currentFilterParams.gender) count++
    if (currentFilterParams.is_leadership) count++
    if (currentFilterParams.send_onboarding_email) count++
    if (currentFilterParams.has_citizen_id_file) count++
    if (currentFilterParams.document_submission_status) count++
    if (currentFilterParams.is_termination_notice_sent) count++
    if (currentFilterParams.handover_completed) count++
    if (currentFilterParams.is_os_code_type) count++
    if (currentFilterParams.include_report_excluded_positions) count++
    if (currentFilterParams.is_returning_employee) count++
    if (currentFilterParams.start_date__gte) count++
    if (currentFilterParams.start_date__lte) count++
    if (currentFilterParams.resignation_start_date__gte) count++
    if (currentFilterParams.resignation_start_date__lte) count++

    return count
  }, [currentFilterParams])

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Handle sorting change
  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (!field || !direction) {
        newParams.delete('ordering')
      } else {
        const ordering = direction === 'desc' ? `-${field}` : field
        newParams.set('ordering', ordering)
      }
      // Reset to page 1 when sorting changes
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Handle config table column
  const handleConfigTableColumn = useCallback(() => {
    setShouldShowConfig(true)
  }, [])

  // Handle delete employee
  const handleDeleteEmployee = useCallback(
    (employee: any) => {
      openDeleteDialog(employee)
    },
    [openDeleteDialog]
  )

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  // Handle create new
  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.EMPLOYEE_MANAGEMENT_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  // Handle filter dialog open
  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  // Handle filter dialog close (cancel)
  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  // Handle clear filter in dialog (only clears form, doesn't close dialog or call API)
  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  // Handle apply filter (updates URL and closes dialog)
  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = serializeEmployeeFiltersToUrl(formData, searchParams)
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  // Handle clear all (search + filters) - reset to defaults
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    // No ordering - only set when user sorts
    // Về đúng bộ lọc mặc định (CR269) — dùng chung với lúc vào màn lần đầu
    applyEmployeeListDefaultFilters(newParams)
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  // Handle export
  const handleExport = useCallback(() => {
    openExportDialog(buildEmployeesExportParamsFromListQuery(apiParams))
  }, [openExportDialog, apiParams])

  const handleExportLimit = useCallback(() => {
    const exportParams = buildEmployeesExportParamsFromListQuery(apiParams)
    void openExportLimitDialog({
      async: true,
      delivery: ExportDelivery.link,
      ...exportParams,
    })
  }, [apiParams, openExportLimitDialog])

  // Handle import
  const handleImport = useCallback(() => {
    openImportDialog()
  }, [openImportDialog])

  // Reset trigger after a short delay to allow dialog to open
  useEffect(() => {
    if (shouldShowConfig) {
      const timer = setTimeout(() => {
        setShouldShowConfig(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldShowConfig])

  return (
    <>
      <PageTitle
        handleSearch={handleSearch}
        searchPlaceholder="Tìm kiếm theo mã, tên nhân viên, cccd"
        searchClassName={'!w-[350px]'}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleConfigTableColumn={handleConfigTableColumn}
        handleExportBtnFull={ability.can('export', 'employee') ? handleExport : undefined}
        customActions={
          ability.can('export_limit', 'employee') ? (
            <Button
              variant="secondary"
              size="small"
              leftIcon={<IconExport />}
              onClick={handleExportLimit}
              className="bg-data-light-grey-hover"
              title="Export bản thu gọn"
            >
              Export bản thu gọn
            </Button>
          ) : undefined
        }
        handleImportBtnFull={ability.can('start_import', 'employee') ? handleImport : undefined}
        handleCreateNew={ability.can('create', 'employee') ? handleCreateNew : undefined}
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <EmployeeTable
            onDeleteEmployee={handleDeleteEmployee}
            isShowTableColumnConfig={shouldShowConfig}
            apiParams={apiParams}
            currentPage={currentPage}
            pageSize={pageSize}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            onClearFilter={handleClearAll}
            hasFilter={!!searchInput || activeFilterCount > 0}
            isUrlReady={isEmployeesQueryReady}
            forceBirthdayColumn={!!searchParams.get('birthday_month')}
          />
        </div>
      </Flex>

      {/* Filter Dialog using AppDialog with variant='filter' */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <EmployeeFilterForm
            ref={formRef}
            initialValues={currentFilterParams}
            isOpen={isFilterDialogOpen}
            showReportExcludedPositionsFilter
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default EmployeeManagementPage
