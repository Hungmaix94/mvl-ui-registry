import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { TravelExpenseTable } from '@/features/payroll/travel-expense'
import { useTravelExpenseDelete } from '@/features/payroll/travel-expense/_shares/hooks/useTravelExpenseDelete.tsx'
import { useTravelExpenseExport } from '@/features/payroll/travel-expense/_shares/hooks/useTravelExpenseExport.tsx'
import useTravelExpenseImport from '@/features/payroll/travel-expense/_shares/hooks/useTravelExpenseImport.tsx'
import {
  type TravelExpense,
  type GetTravelExpensesParams,
  useTravelExpenses,
} from '@/features/payroll/services/travel-expense-service'
import { useEmployeeForFilter } from '@/hooks/useFilterEntityValidation'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { useDebounceValue } from 'usehooks-ts'
import { parse, format } from 'date-fns'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import TravelExpenseFilterForm, {
  type TravelExpenseFilterFormRef,
  type TravelExpenseFilterForm as FilterFormType,
} from '@/features/payroll/travel-expense/_shares/components/TravelExpenseFilterForm.tsx'

type FilterParams = {
  month?: Date
  employee?: string
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
  expense_type?: string[]
  status?: string[]
}

/**
 * Parse filter params from URL search params (for form display only, no validation)
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}

  const month = searchParams.get('month')
  if (month) {
    try {
      params.month = parse(month, 'MM/yyyy', new Date())
    } catch {
      // If parsing fails, leave as undefined
    }
  }

  const employee = searchParams.get('employee')
  if (employee) {
    params.employee = employee
  }

  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) params.branch_id = branchId

  const blockId = parsePositiveInt(searchParams.get('block'))
  if (blockId) params.block_id = blockId

  const departmentId = parsePositiveInt(searchParams.get('department'))
  if (departmentId) params.department_id = departmentId

  const positionId = parsePositiveInt(searchParams.get('position'))
  if (positionId) params.position_id = positionId

  const expenseTypes = searchParams.getAll('expense_type')
  if (expenseTypes.length > 0) {
    params.expense_type = expenseTypes
  }

  const statuses = searchParams.getAll('status')
  if (statuses.length > 0) {
    params.status = statuses
  }

  return params
}

/**
 * Build API params from URL search params (without validation - will be validated separately)
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetTravelExpensesParams> {
  const params: NonNullable<GetTravelExpensesParams> = {}

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

  // Filter params - month
  const month = searchParams.get('month')
  if (month) {
    params.month = month
  }

  // Note: employee, branch, block, department, position, expense_type, status will be added after validation

  return params
}

const TravelExpensePage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<TravelExpenseFilterFormRef>(null)
  const ability = useAbility()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useTravelExpenseDelete()
  const { openExportDialog } = useTravelExpenseExport()
  const { openImportDialog } = useTravelExpenseImport()

  // ===== Validate async select IDs from URL =====
  const employeeIdFromUrl = parsePositiveInt(searchParams.get('employee'))

  const employeeQuery = useEmployeeForFilter(employeeIdFromUrl ?? 0)
  const isEmployeeValid = !!employeeQuery.data

  const validatedFilterParams = useMemo(() => {
    return {
      employee: isEmployeeValid ? String(employeeIdFromUrl) : undefined,
    }
  }, [isEmployeeValid, employeeIdFromUrl])

  const isFilterValidationLoading = useMemo(
    () => (employeeIdFromUrl ? employeeQuery.isLoading : false),
    [employeeIdFromUrl, employeeQuery.isLoading]
  )

  // Initialize URL with defaults on mount (only once)
  useEffect(() => {
    if (!isUrlReady) {
      const hasParams = searchParams.toString().length > 0
      if (!hasParams) {
        const defaultParams = new URLSearchParams()
        defaultParams.set('page', '1')
        defaultParams.set('page_size', String(PAGE_SIZE))
        setSearchParams(defaultParams, { replace: true })
      }
      setIsUrlReady(true)
    }
  }, [isUrlReady, searchParams, setSearchParams])

  // Update search param when debounced search changes
  useEffect(() => {
    if (isUrlReady) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
        newParams.set('page', '1') // Reset to page 1 when search changes
      } else {
        newParams.delete('search')
        newParams.set('page', '1')
      }

      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady])

  const isExpensesQueryReady = isUrlReady && !isFilterValidationLoading

  // Build API params from URL (with validated IDs)
  const apiParams = useMemo(() => {
    if (!isExpensesQueryReady) return undefined

    const baseParams = buildApiParamsFromUrl(searchParams)

    // Only add validated IDs to API params
    if (validatedFilterParams.employee) {
      baseParams.employee = parseInt(validatedFilterParams.employee, 10)
    }

    // Add other filter params from URL
    const branchId = parsePositiveInt(searchParams.get('branch'))
    if (branchId) baseParams.branch = branchId

    const blockId = parsePositiveInt(searchParams.get('block'))
    if (blockId) baseParams.block = blockId

    const departmentId = parsePositiveInt(searchParams.get('department'))
    if (departmentId) baseParams.department = departmentId

    const positionId = parsePositiveInt(searchParams.get('position'))
    if (positionId) baseParams.position = positionId

    const expenseTypes = searchParams.getAll('expense_type')
    if (expenseTypes.length > 0) {
      baseParams.expense_types = expenseTypes as any
    }

    const statuses = searchParams.getAll('status')
    if (statuses.length > 0) {
      baseParams.statuses = statuses as any
    }

    return baseParams
  }, [searchParams, isExpensesQueryReady, validatedFilterParams])

  // Call API with params derived from URL
  const {
    data: expensesData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useTravelExpenses(apiParams, {
    enabled: isExpensesQueryReady && !!apiParams,
  })

  // Parse current filter params from URL for dialog (merge validated IDs)
  const currentFilterParams = useMemo(() => {
    return {
      ...parseFilterParamsFromUrl(searchParams),
      ...validatedFilterParams,
    }
  }, [searchParams, validatedFilterParams])

  // Get pagination info from URL
  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  const currentOrdering = searchParams.get('ordering') || undefined

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
      if (direction === null) {
        newParams.delete('ordering')
      } else {
        const orderingValue = direction === 'desc' ? `-${field}` : field
        newParams.set('ordering', orderingValue)
      }
      newParams.set('page', '1') // Reset to page 1 when sorting changes
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
  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

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

    // Add filter params from form
    if (formData.month) {
      newParams.set('month', format(formData.month, 'MM/yyyy'))
    }

    if (formData.employee) {
      newParams.set('employee', String(formData.employee))
    }

    if (formData.branch_id) {
      newParams.set('branch', String(formData.branch_id))
    }

    if (formData.block_id) {
      newParams.set('block', String(formData.block_id))
    }

    if (formData.department_id) {
      newParams.set('department', String(formData.department_id))
    }

    if (formData.position_id) {
      newParams.set('position', String(formData.position_id))
    }

    if (formData.expense_type && formData.expense_type.length > 0) {
      formData.expense_type.forEach((type) => newParams.append('expense_type', type))
    }

    if (formData.status && formData.status.length > 0) {
      formData.status.forEach((status) => newParams.append('status', status))
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, pageSize])

  // Handle clear all (search + filters) - reset to defaults (no filters)
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.TRAVEL_EXPENSE_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleDeleteTravelExpense = useCallback(
    (expense: TravelExpense) => {
      openDeleteDialog(expense)
    },
    [openDeleteDialog]
  )

  const handleExport = useCallback(() => {
    openExportDialog(searchInput, currentFilterParams as FilterFormType)
  }, [openExportDialog, searchInput, currentFilterParams])

  const handleImport = useCallback(() => {
    openImportDialog(currentFilterParams.month)
  }, [openImportDialog, currentFilterParams.month])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.month) count++
    if (currentFilterParams.employee) count++
    if (currentFilterParams.branch_id) count++
    if (currentFilterParams.block_id) count++
    if (currentFilterParams.department_id) count++
    if (currentFilterParams.position_id) count++
    if (currentFilterParams.expense_type && currentFilterParams.expense_type.length > 0) count++
    if (currentFilterParams.status && currentFilterParams.status.length > 0) count++
    return count
  }, [currentFilterParams])

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = expensesData?.results ?? []
    const count = expensesData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [expensesData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching

  // Convert currentFilterParams to form initialValues format
  const formInitialValues = useMemo(() => {
    return {
      month: currentFilterParams.month || undefined,
      employee: currentFilterParams.employee || undefined,
      branch_id: currentFilterParams.branch_id || undefined,
      block_id: currentFilterParams.block_id || undefined,
      department_id: currentFilterParams.department_id || undefined,
      position_id: currentFilterParams.position_id || undefined,
      expense_type: currentFilterParams.expense_type as any,
      status: currentFilterParams.status as any,
    }
  }, [currentFilterParams])

  return (
    <>
      <PageTitle
        searchPlaceholder="Tìm kiếm theo tên, mã công tác phí"
        searchClassName="!w-[350px]"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={
          ability.can('create', 'payroll.travel_expense') ? handleCreateNew : undefined
        }
        handleImportBtnFull={
          ability.can('start_import', 'payroll.travel_expense') ? handleImport : undefined
        }
        handleExportBtnFull={
          ability.can('export', 'payroll.travel_expense') ? handleExport : undefined
        }
      />
      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <TravelExpenseTable
            data={tableData}
            isLoading={isTableLoading}
            error={error}
            pageCount={pageCount}
            pageSize={pageSize}
            currentPage={currentPage}
            totalRecords={totalRecords}
            ordering={currentOrdering}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            onDeleteTravelExpense={handleDeleteTravelExpense}
            onClearFilter={handleClearAll}
            hasFilter={!!searchInput || activeFilterCount > 0}
          />
        </div>
      </Flex>

      {/* Filter Dialog using AppDialog with variant='filter' */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<TravelExpenseFilterForm ref={formRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default TravelExpensePage
