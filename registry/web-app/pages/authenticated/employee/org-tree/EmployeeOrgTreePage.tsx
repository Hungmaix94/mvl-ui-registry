import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import EmployeeOrgTreeTable from '@/features/employee/org-tree/view/EmployeeOrgTreeTable'
import {
  type EmployeeFilterFormData,
  type EmployeeFilterFormRef,
} from '@/features/employee/management/_shares/components/EmployeeFilterForm'
import EmployeeFilterForm from '@/features/employee/management/_shares/components/EmployeeFilterForm'
import AppDialog from '@/components/dialog/AppDialog'
import {
  EMPLOYEE_FILTER_STATUS_VALUES,
  EMPLOYEE_FILTER_YES_NO_VALUES,
  type TEmployeeFilter,
} from '@/constants/employee-filter'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { parsePositiveInt } from '@/utils/common'
import { useDebounceValue } from 'usehooks-ts'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
  usePositionForFilter,
} from '@/hooks/useFilterEntityValidation'
import { PAGE_SIZE } from '@/constants/table.ts'
import type { GetEmployeesExportParams, GetEmployeesParams } from '@/services'
import { useEmployeeExport } from '@/features/employee/management/_shares/hooks/useEmployeeExport.tsx'
import { useAbility } from '@/lib/ability.ts'
import { EmployeeType, EmployeeStatus, EmployeeGender } from '@/constants/api-schema-aliases'

const VALID_GENDER_VALUES: string[] = Object.values(EmployeeGender)
// "Nghỉ không lương" bị loại khỏi bộ lọc — chặn cả khi đọc từ URL (nguồn: employee-filter.ts)
const VALID_STATUS_VALUES: string[] = EMPLOYEE_FILTER_STATUS_VALUES
const VALID_EMPLOYEE_TYPE_VALUES: string[] = Object.values(EmployeeType)
const VALID_BOOLEAN_VALUES: string[] = [
  EMPLOYEE_FILTER_YES_NO_VALUES.YES,
  EMPLOYEE_FILTER_YES_NO_VALUES.NO,
]

function parseFilterParamsFromUrl(searchParams: URLSearchParams): EmployeeFilterFormData {
  const params: EmployeeFilterFormData = {}

  const statuses = searchParams.getAll('statuses')
  if (statuses.length > 0) {
    const valid = statuses.filter((s) => VALID_STATUS_VALUES.includes(s))
    if (valid.length > 0) {
      params.statuses = valid as EmployeeStatus[]
    }
  }

  const employeeTypes = searchParams.getAll('employee_types')
  if (employeeTypes.length > 0) {
    const valid = employeeTypes.filter((t) => VALID_EMPLOYEE_TYPE_VALUES.includes(t))
    if (valid.length > 0) {
      params.employee_types = valid as EmployeeType[]
    }
  }

  const gender = searchParams.get('gender')
  if (gender && VALID_GENDER_VALUES.includes(gender)) {
    params.gender = gender as EmployeeGender
  }

  const birthdayMonth = searchParams.get('birthday_month')
  if (birthdayMonth) {
    const monthNum = parseInt(birthdayMonth, 10)
    if (monthNum >= 1 && monthNum <= 12) {
      params.birthday_month = new Date(new Date().getFullYear(), monthNum - 1, 1)
    }
  }

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

function buildEmployeeApiFilters(searchParams: URLSearchParams): NonNullable<GetEmployeesParams> {
  const params: NonNullable<GetEmployeesParams> = {}

  const search = searchParams.get('search')
  if (search) params.search = search

  const statuses = searchParams.getAll('statuses')
  if (statuses.length > 0) {
    const valid = statuses.filter((s) => VALID_STATUS_VALUES.includes(s))
    if (valid.length > 0) params.statuses = valid as EmployeeStatus[]
  }

  const employeeTypes = searchParams.getAll('employee_types')
  if (employeeTypes.length > 0) {
    const valid = employeeTypes.filter((t) => VALID_EMPLOYEE_TYPE_VALUES.includes(t))
    if (valid.length > 0) {
      params.employee_types = valid as EmployeeType[]
    }
  }

  const gender = searchParams.get('gender')
  if (gender && VALID_GENDER_VALUES.includes(gender)) {
    params.gender = gender as EmployeeGender
  }

  const birthdayMonth = searchParams.get('birthday_month')
  if (birthdayMonth) {
    const monthNum = parseInt(birthdayMonth, 10)
    if (monthNum >= 1 && monthNum <= 12) params.date_of_birth__month = monthNum
  }

  const isLeadership = searchParams.get('position__is_leadership')
  if (isLeadership === 'true') params.position__is_leadership = true
  else if (isLeadership === 'false') params.position__is_leadership = false

  const sendOnboardingEmail = searchParams.get('is_onboarding_email_sent')
  if (sendOnboardingEmail === 'true') params.is_onboarding_email_sent = true
  else if (sendOnboardingEmail === 'false') params.is_onboarding_email_sent = false

  const hasCitizenIdFile = searchParams.get('has_citizen_id_file')
  if (hasCitizenIdFile === 'true') params.has_citizen_id_file = true
  else if (hasCitizenIdFile === 'false') params.has_citizen_id_file = false

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

function serializeFiltersToUrl(
  values: EmployeeFilterFormData,
  baseParams: URLSearchParams
): URLSearchParams {
  const newParams = new URLSearchParams()

  const search = baseParams.get('search')
  if (search) newParams.set('search', search)

  if (values.branch_id) newParams.set('branch', String(values.branch_id))
  if (values.block_id) newParams.set('block', String(values.block_id))
  if (values.department_id) newParams.set('department', String(values.department_id))
  if (values.position) newParams.set('position', String(values.position))

  if (values.statuses && values.statuses.length > 0) {
    values.statuses.forEach((status) => newParams.append('statuses', status))
  }

  if (values.employee_types && values.employee_types.length > 0) {
    values.employee_types.forEach((t) => {
      if (t != null) newParams.append('employee_types', t)
    })
  }

  if (values.gender) newParams.set('gender', values.gender)

  if (values.birthday_month) {
    newParams.set('birthday_month', String(values.birthday_month.getMonth() + 1))
  }

  if (values.is_leadership) newParams.set('position__is_leadership', values.is_leadership)
  if (values.send_onboarding_email) {
    newParams.set('is_onboarding_email_sent', values.send_onboarding_email)
  }
  if (values.has_citizen_id_file) newParams.set('has_citizen_id_file', values.has_citizen_id_file)
  if (values.is_termination_notice_sent) {
    newParams.set('is_termination_notice_sent', values.is_termination_notice_sent)
  }
  if (values.handover_completed) {
    newParams.set('handover_completed', values.handover_completed)
  }
  if (values.is_os_code_type) newParams.set('is_os_code_type', values.is_os_code_type)
  if (values.include_report_excluded_positions) {
    newParams.set('include_report_excluded_positions', values.include_report_excluded_positions)
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

const EmployeeOrgTreePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<EmployeeFilterFormRef>(null)
  const ability = useAbility()
  const { openExportDialog } = useEmployeeExport()

  const [shouldShowConfig, setShouldShowConfig] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  // Flips true once the init effect has normalized the URL. Gating the employee
  // fetch on this (not on URL emptiness) avoids a soft-lock when the user clears
  // all filters and applies — that legitimately empties the URL but must still load.
  const [isInitialized, setIsInitialized] = useState(false)

  // Search
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // Validate cascade org selects from URL
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

  const validatedOrgFilterParams = useMemo(
    (): Pick<EmployeeFilterFormData, 'branch_id' | 'block_id' | 'department_id' | 'position'> => ({
      branch_id: isBranchValid ? branchIdFromUrl : undefined,
      block_id: isBlockValid ? blockIdFromUrl : undefined,
      department_id: isDepartmentValid ? departmentIdFromUrl : undefined,
      position: isPositionValid ? positionIdFromUrl : undefined,
    }),
    [
      blockIdFromUrl,
      branchIdFromUrl,
      departmentIdFromUrl,
      isBlockValid,
      isBranchValid,
      isDepartmentValid,
      isPositionValid,
      positionIdFromUrl,
    ]
  )

  // Sync search input when URL changes
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      // Default status filter on first visit: đang làm việc + onboarding + nghỉ thai sản
      newParams.append('statuses', EmployeeStatus.Active)
      newParams.append('statuses', EmployeeStatus.Onboarding)
      newParams.append('statuses', EmployeeStatus.Maternity_Leave)
      newParams.set('is_os_code_type', EMPLOYEE_FILTER_YES_NO_VALUES.NO)
      // Org-tree screen defaults to showing report-excluded positions
      newParams.set('include_report_excluded_positions', EMPLOYEE_FILTER_YES_NO_VALUES.YES)
      setSearchParams(newParams, { replace: true })
      setIsInitialized(true)
      return
    }

    if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }
    setIsInitialized(true)
  }, [])

  // Update URL when debounced search changes
  useEffect(() => {
    const currentSearchTerm = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearchTerm) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
      } else {
        newParams.delete('search')
      }
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch])

  // Build employee filter params from URL (passed to table for employee fetching)
  const employeeFilterParams = useMemo((): NonNullable<GetEmployeesParams> => {
    const params = buildEmployeeApiFilters(searchParams)
    if (validatedOrgFilterParams.branch_id) params.branch = validatedOrgFilterParams.branch_id
    if (validatedOrgFilterParams.block_id) params.block = validatedOrgFilterParams.block_id
    if (validatedOrgFilterParams.department_id) {
      params.department = validatedOrgFilterParams.department_id
    }
    if (validatedOrgFilterParams.position) params.position = validatedOrgFilterParams.position
    return params
  }, [searchParams, validatedOrgFilterParams])

  // Filter form initial values
  const currentFilterParams = useMemo(
    () => ({
      ...parseFilterParamsFromUrl(searchParams),
      ...validatedOrgFilterParams,
    }),
    [searchParams, validatedOrgFilterParams]
  )

  // Count active filters
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
    if (currentFilterParams.is_termination_notice_sent) count++
    if (currentFilterParams.handover_completed) count++
    if (currentFilterParams.is_os_code_type) count++
    if (currentFilterParams.include_report_excluded_positions) count++
    if (currentFilterParams.start_date__gte) count++
    if (currentFilterParams.start_date__lte) count++
    if (currentFilterParams.resignation_start_date__gte) count++
    if (currentFilterParams.resignation_start_date__lte) count++
    return count
  }, [currentFilterParams])

  // Org cascade IDs from the URL are validated asynchronously above. Until those
  // settle, validatedOrgFilterParams (and treeOrgFilter) omit them, so fetching
  // now would kick off an unfiltered fetch-all that races the validated one
  // (same bug class for a deep link like ?branch=5). Gate the fetch on both the
  // one-time URL init and the cascade validation completing (guide §4.1.3).
  const isValidationLoading =
    branchQuery.isLoading ||
    blockQuery.isLoading ||
    departmentQuery.isLoading ||
    positionQuery.isLoading
  const isQueryReady = isInitialized && !isValidationLoading

  // Tree filter: branch/block/department from URL to narrow tree display
  const treeOrgFilter = useMemo(
    () => ({
      branchId: validatedOrgFilterParams.branch_id,
      blockId: validatedOrgFilterParams.block_id,
      departmentId: validatedOrgFilterParams.department_id,
    }),
    [validatedOrgFilterParams]
  )

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const handleConfigTableColumn = useCallback(() => {
    setShouldShowConfig(true)
  }, [])

  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return
    const newParams = serializeFiltersToUrl(formData, searchParams)
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  const handleExport = useCallback(() => {
    const exportParams: GetEmployeesExportParams = {}

    if (employeeFilterParams.branch !== undefined) exportParams.branch = employeeFilterParams.branch
    if (employeeFilterParams.block !== undefined) exportParams.block = employeeFilterParams.block
    if (employeeFilterParams.department !== undefined) {
      exportParams.department = employeeFilterParams.department
    }
    if (employeeFilterParams.position !== undefined) {
      exportParams.position = employeeFilterParams.position
    }
    if (Array.isArray(employeeFilterParams.statuses) && employeeFilterParams.statuses.length > 0) {
      exportParams.statuses = employeeFilterParams.statuses
    }
    if (
      Array.isArray(employeeFilterParams.employee_types) &&
      employeeFilterParams.employee_types.length > 0
    ) {
      exportParams.employee_types = employeeFilterParams.employee_types.filter(
        (t): t is EmployeeType => t !== null
      )
    }
    if (employeeFilterParams.gender) exportParams.gender = employeeFilterParams.gender
    if (employeeFilterParams.date_of_birth__month) {
      exportParams.date_of_birth__month = employeeFilterParams.date_of_birth__month
    }
    if (employeeFilterParams.position__is_leadership !== undefined) {
      exportParams.position__is_leadership = employeeFilterParams.position__is_leadership
    }
    if (employeeFilterParams.is_onboarding_email_sent !== undefined) {
      exportParams.is_onboarding_email_sent = employeeFilterParams.is_onboarding_email_sent
    }
    if (employeeFilterParams.has_citizen_id_file !== undefined) {
      exportParams.has_citizen_id_file = employeeFilterParams.has_citizen_id_file
    }
    if (employeeFilterParams.is_termination_notice_sent !== undefined) {
      exportParams.is_termination_notice_sent = employeeFilterParams.is_termination_notice_sent
    }
    if (employeeFilterParams.handover_completed !== undefined) {
      exportParams.handover_completed = employeeFilterParams.handover_completed
    }
    if (employeeFilterParams.is_os_code_type !== undefined) {
      exportParams.is_os_code_type = employeeFilterParams.is_os_code_type
    }
    if (employeeFilterParams.include_report_excluded_positions !== undefined) {
      exportParams.include_report_excluded_positions =
        employeeFilterParams.include_report_excluded_positions
    }
    if (employeeFilterParams.search && employeeFilterParams.search.trim() !== '') {
      exportParams.search = employeeFilterParams.search
    }
    if (employeeFilterParams.start_date__gte) {
      exportParams.start_date__gte = employeeFilterParams.start_date__gte
    }
    if (employeeFilterParams.start_date__lte) {
      exportParams.start_date__lte = employeeFilterParams.start_date__lte
    }
    if (employeeFilterParams.resignation_start_date__gte) {
      exportParams.resignation_start_date__gte = employeeFilterParams.resignation_start_date__gte
    }
    if (employeeFilterParams.resignation_start_date__lte) {
      exportParams.resignation_start_date__lte = employeeFilterParams.resignation_start_date__lte
    }

    openExportDialog(exportParams)
  }, [employeeFilterParams, openExportDialog])

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
        searchClassName="!w-[350px]"
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleConfigTableColumn={handleConfigTableColumn}
        handleExportBtnFull={
          ability.can('export_limit', 'employee') || ability.can('export', 'employee')
            ? handleExport
            : undefined
        }
      />
      <div className="flex min-h-0 flex-1 flex-col px-7 pb-10">
        <EmployeeOrgTreeTable
          isShowTableColumnConfig={shouldShowConfig}
          employeeFilterParams={employeeFilterParams}
          treeOrgFilter={treeOrgFilter}
          enabled={isQueryReady}
        />
      </div>

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

export default EmployeeOrgTreePage
