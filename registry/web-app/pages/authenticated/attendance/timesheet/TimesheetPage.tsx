import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import { startOfMonth } from 'date-fns'
import {
  useTimesheets,
  useExportTimesheets,
  type GetTimesheetsParams,
} from '@/features/attendance/services/timesheet-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
  usePositionForFilter,
  useEmployeeForFilter,
} from '@/hooks/useFilterEntityValidation'
import {
  formatMonthForApi,
  parseMonthFromApi,
} from '@/features/attendance/timesheet/_shares/utils/timesheet-utils'
import TimesheetTable from '@/components/ui/timesheet-table/TimesheetTable'
import TimesheetMonthSelector from '@/components/ui/timesheet-table/TimesheetMonthSelector'
import TimesheetPagination from '@/components/ui/timesheet-table/TimesheetPagination'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { FullScreenLoading } from '@/components/Loading'
import { APP_PATH } from '@/routes'
import { useDebounceValue } from 'usehooks-ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { cn } from '@/utils'
import AppDialog from '@/components/dialog/AppDialog'
import TimesheetFilterForm, {
  type TimesheetFilterFormRef,
} from '@/features/attendance/timesheet/_shares/components/TimesheetFilterForm.tsx'
import TableError from '@/components/ui/table/TableError'
import { EmployeeSalaryType } from '@/constants/api-schema-aliases'

type FilterParams = {
  month?: Date | null
  branchId?: number
  blockId?: number
  departmentId?: number
  positionId?: number
  employeeId?: number
  employeeSalaryType?: EmployeeSalaryType[]
  hasConflict?: boolean
}

/**
 * Parse filter params from URL search params (for form display only, no validation)
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}

  const month = searchParams.get('month')
  if (month) {
    const parsedMonth = parseMonthFromApi(month)
    if (parsedMonth) {
      params.month = parsedMonth
    }
  }

  // Parse IDs without validation (validation happens via hooks)
  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) params.branchId = branchId

  const blockId = parsePositiveInt(searchParams.get('block'))
  if (blockId) params.blockId = blockId

  const departmentId = parsePositiveInt(searchParams.get('department'))
  if (departmentId) params.departmentId = departmentId

  const positionId = parsePositiveInt(searchParams.get('position'))
  if (positionId) params.positionId = positionId

  const employeeId = parsePositiveInt(searchParams.get('employee'))
  if (employeeId) params.employeeId = employeeId

  // Parse employee_salary_type (multi params)
  const salaryTypes = searchParams.getAll('employee_salary_type')
  if (salaryTypes.length > 0) {
    const validTypes = salaryTypes.filter(
      (type): type is EmployeeSalaryType => type === 'salaried' || type === 'unsalaried'
    )
    if (validTypes.length > 0) {
      params.employeeSalaryType = validTypes
    }
  }

  if (searchParams.get('has_conflict') === 'true') {
    params.hasConflict = true
  }

  return params
}

/**
 * Build API params from URL search params (without validation - will be validated separately)
 */
function buildApiParamsFromUrl(searchParams: URLSearchParams): NonNullable<GetTimesheetsParams> {
  const params: NonNullable<GetTimesheetsParams> = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  // Ordering - URL format: -field for desc, field for asc
  const ordering = searchParams.get('ordering')
  if (ordering) {
    params.ordering = ordering
  }

  // Search
  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }

  // Month - always set (validate from URL, default to current month if missing/invalid)
  const month = searchParams.get('month')
  if (month) {
    // Validate month format by trying to parse it
    const parsedMonth = parseMonthFromApi(month)
    if (parsedMonth) {
      params.month = month
    } else {
      // Invalid month format, use current month
      params.month = formatMonthForApi(startOfMonth(new Date()))
    }
  } else {
    // No month in URL, use current month
    params.month = formatMonthForApi(startOfMonth(new Date()))
  }

  // Conflict filter
  if (searchParams.get('has_conflict') === 'true') {
    params.has_conflict = true
  }

  // Note: branch, block, department, position, employee, employee_salary_type will be added after validation

  return params
}

export default function TimesheetPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<TimesheetFilterFormRef>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const { open: isSidebarOpen } = useSidebar()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // UI state (not in URL)
  const [hideDays, setHideDays] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // ===== Validate cascade select IDs from URL =====
  const branchIdFromUrl = parsePositiveInt(searchParams.get('branch'))
  const blockIdFromUrl = parsePositiveInt(searchParams.get('block'))
  const departmentIdFromUrl = parsePositiveInt(searchParams.get('department'))
  const positionIdFromUrl = parsePositiveInt(searchParams.get('position'))
  const employeeIdFromUrl = parsePositiveInt(searchParams.get('employee'))

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

  const employeeQuery = useEmployeeForFilter(employeeIdFromUrl ?? 0)
  const isEmployeeValid = !!employeeQuery.data

  const validatedFilterParams = useMemo(() => {
    return {
      branchId: isBranchValid ? branchIdFromUrl : undefined,
      blockId: isBlockValid ? blockIdFromUrl : undefined,
      departmentId: isDepartmentValid ? departmentIdFromUrl : undefined,
      positionId: isPositionValid ? positionIdFromUrl : undefined,
      employeeId: isEmployeeValid ? employeeIdFromUrl : undefined,
    }
  }, [
    isBranchValid,
    branchIdFromUrl,
    isBlockValid,
    blockIdFromUrl,
    isDepartmentValid,
    departmentIdFromUrl,
    isPositionValid,
    positionIdFromUrl,
    isEmployeeValid,
    employeeIdFromUrl,
  ])

  const isFilterValidationLoading = useMemo(() => {
    const isBranchLoading = !!branchIdFromUrl && branchQuery.isLoading
    const isBlockLoading = !!blockIdFromUrl && blockQuery.isLoading
    const isDepartmentLoading = !!departmentIdFromUrl && departmentQuery.isLoading
    const isPositionLoading = !!positionIdFromUrl && positionQuery.isLoading
    const isEmployeeLoading = !!employeeIdFromUrl && employeeQuery.isLoading
    return (
      isBranchLoading ||
      isBlockLoading ||
      isDepartmentLoading ||
      isPositionLoading ||
      isEmployeeLoading
    )
  }, [
    branchIdFromUrl,
    branchQuery.isLoading,
    blockIdFromUrl,
    blockQuery.isLoading,
    departmentIdFromUrl,
    departmentQuery.isLoading,
    positionIdFromUrl,
    positionQuery.isLoading,
    employeeIdFromUrl,
    employeeQuery.isLoading,
  ])

  // Initialize URL with defaults if empty
  useEffect(() => {
    // Check actual browser URL to avoid race condition with searchParams
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')
    const hasMonth = searchParams.has('month') || actualUrlParams.has('month')

    // Always apply defaults if URL is completely empty
    // When navigating back from detail, we use location.state.from which already has full query params,
    // so we won't hit isUrlEmpty in that case
    if (isUrlEmpty) {
      const newParams = new URLSearchParams()

      // Set defaults: pagination and month (required for API)
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      newParams.set('month', formatMonthForApi(startOfMonth(new Date())))

      setSearchParams(newParams, { replace: true })
    } else {
      // URL has some params - ensure page, page_size, and month exist
      const needsUpdate = !hasPage || !hasPageSize || !hasMonth
      if (needsUpdate) {
        const newParams = new URLSearchParams(searchParams)
        if (!hasPage) {
          newParams.set('page', '1')
        }
        if (!hasPageSize) {
          newParams.set('page_size', String(PAGE_SIZE))
        }
        if (!hasMonth) {
          newParams.set('month', formatMonthForApi(startOfMonth(new Date())))
        }

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
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  const isTimesheetsQueryReady = isUrlReady && !isFilterValidationLoading

  // Build API params from URL (with validated IDs)
  const apiParams = useMemo(() => {
    if (!isTimesheetsQueryReady) return undefined

    const baseParams = buildApiParamsFromUrl(searchParams)

    // Only add validated IDs to API params
    if (validatedFilterParams.branchId) {
      baseParams.branch = validatedFilterParams.branchId
    }
    if (validatedFilterParams.blockId) {
      baseParams.block = validatedFilterParams.blockId
    }
    if (validatedFilterParams.departmentId) {
      baseParams.department = validatedFilterParams.departmentId
    }
    if (validatedFilterParams.positionId) {
      baseParams.position = validatedFilterParams.positionId
    }
    if (validatedFilterParams.employeeId) {
      baseParams.employee = validatedFilterParams.employeeId
    }

    // Add employee_salary_type (already validated in parseFilterParamsFromUrl)
    const salaryTypes = searchParams.getAll('employee_salary_type')
    if (salaryTypes.length > 0) {
      const validTypes = salaryTypes.filter(
        (type): type is EmployeeSalaryType => type === 'salaried' || type === 'unsalaried'
      )
      if (validTypes.length > 0) {
        baseParams.employee_salary_type = validTypes[0] // API accepts single value, not array
      }
    }

    return baseParams
  }, [searchParams, isTimesheetsQueryReady, validatedFilterParams])

  // Call API with params derived from URL
  const {
    data: timesheetsData,
    isLoading,
    error,
    isFetching,
    isRefetching,
    refetch: refetchTimesheets,
  } = useTimesheets(apiParams, {
    enabled: isTimesheetsQueryReady && !!apiParams,
  })

  const { openExportDialog: openExportTimesheetsDialog } = useExportTimesheets()

  // Refetch data when navigating back to this page
  useEffect(() => {
    // Check if this is a navigate back (has from in location.state)
    const isNavigateBack = location.state?.from
    if (isNavigateBack && isTimesheetsQueryReady && apiParams) {
      // Refetch timesheets list
      refetchTimesheets()
    }
  }, [location.state, isTimesheetsQueryReady, apiParams, refetchTimesheets])

  // Get pagination info from URL
  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Get month from URL
  const monthFromUrl = searchParams.get('month')
  const selectedMonth = useMemo(() => {
    if (monthFromUrl) {
      const parsed = parseMonthFromApi(monthFromUrl)
      if (parsed) return parsed
    }
    return startOfMonth(new Date())
  }, [monthFromUrl])

  const timesheets = useMemo(() => {
    return timesheetsData?.results || []
  }, [timesheetsData?.results])

  const totalRecords = useMemo(() => {
    return timesheetsData?.count || 0
  }, [timesheetsData?.count])

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
  const handleApplyFilter = useCallback(async () => {
    // Trigger form validation
    const isValid = await formRef.current?.trigger()
    if (!isValid) {
      return
    }

    const formData = formRef.current?.getRawValues()
    if (!formData?.month) {
      return
    }

    const apiParams = formRef.current?.getValues()
    if (!apiParams) return

    const newParams = new URLSearchParams()

    // Keep non-filter params
    newParams.set('page', '1') // Reset to page 1 when filter changes
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search')
    if (search) {
      newParams.set('search', search)
    }

    const ordering = searchParams.get('ordering')
    if (ordering) {
      newParams.set('ordering', ordering)
    }

    // Add filter params from form (month is required)
    newParams.set('month', apiParams.month || formatMonthForApi(startOfMonth(new Date())))

    if (apiParams.branch) {
      newParams.set('branch', String(apiParams.branch))
    }

    if (apiParams.block) {
      newParams.set('block', String(apiParams.block))
    }

    if (apiParams.department) {
      newParams.set('department', String(apiParams.department))
    }

    if (apiParams.position) {
      newParams.set('position', String(apiParams.position))
    }

    if (apiParams.employee) {
      newParams.set('employee', String(apiParams.employee))
    }

    // Add employee_salary_type (multi params)
    if (apiParams.employee_salary_type && Array.isArray(apiParams.employee_salary_type)) {
      apiParams.employee_salary_type.forEach((type) => {
        newParams.append('employee_salary_type', type)
      })
    }

    if (apiParams.has_conflict) {
      newParams.set('has_conflict', 'true')
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, pageSize])

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const handleToggleHideDays = useCallback((hide: boolean) => {
    setHideDays(hide)
  }, [])

  const handleExport = useCallback(() => {
    if (!apiParams) return
    const { page, page_size, ...exportParams } = apiParams
    openExportTimesheetsDialog(exportParams)
  }, [apiParams, openExportTimesheetsDialog])

  const handleSelectEntry = useCallback(
    (entryId: number, date: string) => {
      // Add scroll_to_entry to current URL search params
      // This will be preserved in browser history when navigating to detail
      const currentParams = new URLSearchParams(searchParams)
      currentParams.set('scroll_to_entry', String(entryId))
      // Update URL (this creates a history entry)
      setSearchParams(currentParams, { replace: false })

      // Navigate to detail page
      // The previous URL with scroll_to_entry will be in history
      const detailPath = APP_PATH.ATTENDANCE_TIMESHEET_DETAIL.replace(':entryId', String(entryId))
      navigate(`${detailPath}?date=${date}`, {
        state: { from: window.location.pathname + window.location.search },
      })
    },
    [navigate, searchParams, setSearchParams]
  )

  // Parse current filter params from URL for dialog (merge validated IDs)
  const currentFilterParams = useMemo(() => {
    const urlParams = parseFilterParamsFromUrl(searchParams)
    return {
      month: urlParams.month || selectedMonth,
      branch_id: validatedFilterParams.branchId,
      block_id: validatedFilterParams.blockId,
      department_id: validatedFilterParams.departmentId,
      position_id: validatedFilterParams.positionId,
      employee_id: validatedFilterParams.employeeId,
      employee_salary_type: urlParams.employeeSalaryType || [],
      has_conflict: urlParams.hasConflict || false,
    }
  }, [searchParams, validatedFilterParams, selectedMonth])

  // Calculate active filter count
  const filterBadgeCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.branch_id) count++
    if (currentFilterParams.block_id) count++
    if (currentFilterParams.department_id) count++
    if (currentFilterParams.position_id) count++
    if (currentFilterParams.employee_id) count++
    if (
      currentFilterParams.employee_salary_type &&
      currentFilterParams.employee_salary_type.length > 0
    )
      count++
    if (currentFilterParams.month) count++
    if (currentFilterParams.has_conflict) count++
    return count
  }, [currentFilterParams])

  const isTableLoading = isLoading || isFetching || isRefetching

  // Scroll to entry when returning from detail page
  useEffect(() => {
    // Check if we have scroll_to_entry in URL (from navigation state or direct URL)
    const scrollToEntryId = searchParams.get('scroll_to_entry')
    if (!scrollToEntryId || !timesheets.length || isTableLoading) {
      return
    }

    // Wait for DOM to be fully rendered
    const timeoutId = setTimeout(() => {
      const entryId = Number(scrollToEntryId)
      if (!Number.isFinite(entryId)) {
        // Remove invalid entryId from URL
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('scroll_to_entry')
        setSearchParams(newParams, { replace: true })
        return
      }

      // Find the entry in timesheets data to get employee id
      let employeeId: number | null = null
      for (const timesheet of timesheets) {
        const foundEntry = timesheet.dates?.find((entry) => entry?.id === entryId)
        if (foundEntry && timesheet.employee?.id) {
          employeeId = timesheet.employee.id
          break
        }
      }

      // Find the row by employee id (preferred method for better scroll accuracy)
      let rowElement: HTMLTableRowElement | null = null
      if (employeeId) {
        rowElement = document.querySelector(
          `tr[data-employee-id="${employeeId}"]`
        ) as HTMLTableRowElement | null
      }

      // Find the cell with this entryId
      const cellElement = document.querySelector(
        `[data-entry-id="${entryId}"]`
      ) as HTMLElement | null

      // If row not found by employee id, try to find it from cell
      if (!rowElement && cellElement) {
        rowElement = cellElement.closest('tr') as HTMLTableRowElement | null
      }

      if (rowElement && cellElement && tableContainerRef.current) {
        // Get the container element
        const container = tableContainerRef.current

        // First, scroll row into view vertically
        rowElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        })

        // Step 1: Highlight row after vertical scroll starts with blinking effect
        setTimeout(() => {
          // Store original background color
          const originalBgColor = rowElement.style.backgroundColor || ''
          rowElement.style.transition = 'background-color 0.5s ease'

          // Create blinking effect: red -> white -> red (repeat for 2 seconds)
          let isRed = true
          const blinkInterval = setInterval(() => {
            if (isRed) {
              rowElement.style.backgroundColor = 'var(--color-content-light-2)'
            } else {
              rowElement.style.backgroundColor = 'transparent'
            }
            isRed = !isRed
          }, 500) // Toggle every 250ms

          // Stop blinking and restore original background after 2 seconds
          setTimeout(() => {
            clearInterval(blinkInterval)
            rowElement.style.backgroundColor = originalBgColor
            setTimeout(() => {
              rowElement.style.transition = ''
            }, 200)
          }, 2000)
        }, 300) // Wait a bit for scroll to start

        // Step 2: After vertical scroll completes, scroll horizontally to cell
        setTimeout(() => {
          // Recalculate cell position after vertical scroll
          const newCellRect = cellElement.getBoundingClientRect()
          const newContainerRect = container.getBoundingClientRect()
          const newScrollLeft =
            container.scrollLeft +
            newCellRect.left -
            newContainerRect.left -
            newContainerRect.width / 2 +
            newCellRect.width / 2

          container.scrollTo({
            left: Math.max(0, newScrollLeft),
            top: container.scrollTop, // Keep current vertical position
            behavior: 'smooth',
          })

          // Step 3: Highlight cell after horizontal scroll starts
          setTimeout(() => {
            // Highlight the cell briefly
            cellElement.style.transition = 'box-shadow 0.3s ease'
            cellElement.style.boxShadow = '0 0 0 2px var(--color-red-40)'
            setTimeout(() => {
              cellElement.style.boxShadow = ''
              setTimeout(() => {
                cellElement.style.transition = ''
              }, 300)
            }, 2000)
          }, 300) // Wait a bit for horizontal scroll to start
        }, 600) // Wait for vertical scroll to complete
      } else if (cellElement && tableContainerRef.current) {
        // Fallback: if row not found, scroll to cell only
        const container = tableContainerRef.current
        const containerRect = container.getBoundingClientRect()
        const cellRect = cellElement.getBoundingClientRect()

        const scrollLeft =
          container.scrollLeft +
          cellRect.left -
          containerRect.left -
          containerRect.width / 2 +
          cellRect.width / 2

        const scrollTop =
          container.scrollTop +
          cellRect.top -
          containerRect.top -
          containerRect.height / 2 +
          cellRect.height / 2

        container.scrollTo({
          left: Math.max(0, scrollLeft),
          top: Math.max(0, scrollTop),
          behavior: 'smooth',
        })
      }

      // Highlight fallback: if row not found, only highlight cell
      if (cellElement && !rowElement) {
        // Highlight the cell briefly
        cellElement.style.transition = 'box-shadow 0.3s ease'
        cellElement.style.boxShadow = '0 0 0 3px var(--color-red-40)'
        setTimeout(() => {
          cellElement.style.boxShadow = ''
          setTimeout(() => {
            cellElement.style.transition = ''
          }, 300)
        }, 2000)
      }

      // Remove scroll_to_entry from URL after scrolling (whether found or not)
      // Use window.location.search instead of searchParams to ensure we get the actual URL params
      // (searchParams from React Router may not be fully synced after browser back navigation)
      const newParams = new URLSearchParams(window.location.search)
      newParams.delete('scroll_to_entry')
      setSearchParams(newParams, { replace: true })
    }, 150)

    return () => clearTimeout(timeoutId)
  }, [searchParams, timesheets, isTableLoading, setSearchParams])

  // Convert currentFilterParams to form initialValues format
  const formInitialValues = useMemo(() => {
    return {
      month: currentFilterParams.month || startOfMonth(new Date()),
      branch_id: currentFilterParams.branch_id || undefined,
      block_id: currentFilterParams.block_id || undefined,
      department_id: currentFilterParams.department_id || undefined,
      position_id: currentFilterParams.position_id || undefined,
      employee_id: currentFilterParams.employee_id || undefined,
      employee_salary_type: currentFilterParams.employee_salary_type || [],
      has_conflict: currentFilterParams.has_conflict || false,
    }
  }, [currentFilterParams])

  return (
    <>
      <PageTitle
        handleSearch={handleSearch}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        handleExportBtnFull={handleExport}
        filterBadgeCount={filterBadgeCount}
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <TimesheetMonthSelector
          selectedMonth={selectedMonth}
          hideDays={hideDays}
          onToggleHideDays={handleToggleHideDays}
        />
        <div
          ref={tableContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10"
        >
          {isTableLoading ? (
            <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
          ) : error ? (
            <TableError />
          ) : (
            <>
              <TimesheetTable
                data={timesheets}
                month={selectedMonth}
                hideDays={hideDays}
                onSelectEntry={handleSelectEntry}
                searchQuery={debouncedSearch}
              />
              <div
                className={cn(
                  'fixed bottom-0 z-20 flex flex-col',
                  'bg-content-light-1',
                  isSidebarOpen
                    ? 'left-[var(--sidebar-width)] w-[calc(100%-var(--sidebar-width))]'
                    : 'left-[var(--sidebar-width-icon)] w-[calc(100%-var(--sidebar-width-icon))]'
                )}
              >
                <div className="pl-10">
                  <HorizontalScrollBar
                    containerRef={tableContainerRef}
                    className="border-border-1 border-x-0 border-b-0"
                  />
                </div>
                <TimesheetPagination
                  page={currentPage - 1}
                  pageSize={pageSize}
                  totalRecords={totalRecords}
                  onPageChange={(pageIndex) => handlePaginationChange(pageIndex, pageSize)}
                  onPageSizeChange={(newPageSize) => handlePaginationChange(0, newPageSize)}
                  position="static"
                />
              </div>
            </>
          )}
        </div>
      </Flex>

      {/* Filter Dialog using AppDialog with variant='filter' */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        title="Bộ lọc"
        content={
          <TimesheetFilterForm
            ref={formRef}
            initialValues={formInitialValues}
            onValidationChange={() => {
              // Validation is handled by form itself
            }}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}
