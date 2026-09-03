import { PageTitle } from '@/components/ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { useSearchParams } from 'react-router-dom'
import { useAbility } from '@/lib/ability.ts'
import LeaderEmployeeTable from '@/features/employee/leadership/components/LeaderEmployeeTable.tsx'
import LeaderEmployeeFilterForm, {
  LeaderEmployeeFilterFormData,
  LeaderEmployeeFilterFormRef,
} from '@/features/employee/leadership/components/LeaderEmployeeFilterForm.tsx'
import { useLeaderEmployeeExport } from '@/features/employee/leadership/hooks/useLeaderEmployeeExport.tsx'
import {
  type GetLeaderEmployeesParams,
  type GetLeaderEmployeesExportParams,
} from '@/features/employee/services/employee-service'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { useDebounceValue } from 'usehooks-ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import { EmployeeType } from '@/constants/api-schema-aliases'

const VALID_EMPLOYEE_TYPE_VALUES: string[] = Object.values(EmployeeType)

/**
 * Parse leadership filter params from URL search params
 * Only set values that are valid options (for predefined option fields)
 */
function parseLeaderFilterParamsFromUrl(
  searchParams: URLSearchParams
): LeaderEmployeeFilterFormData {
  const params: LeaderEmployeeFilterFormData = {}

  const employeeTypes = searchParams.getAll('employee_types')
  if (employeeTypes.length > 0) {
    const valid = employeeTypes.filter((t) => VALID_EMPLOYEE_TYPE_VALUES.includes(t))
    if (valid.length > 0) {
      params.employee_types = valid as EmployeeType[]
    }
  }

  return params
}

/**
 * Build API params from URL search params (typed as GetLeaderEmployeesParams)
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetLeaderEmployeesParams> {
  const params: NonNullable<GetLeaderEmployeesParams> = {}

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

  // Employee types (multi-value)
  const employeeTypes = searchParams.getAll('employee_types')
  if (employeeTypes.length > 0) {
    const valid = employeeTypes.filter((t) => VALID_EMPLOYEE_TYPE_VALUES.includes(t))
    if (valid.length > 0) {
      params.employee_types = valid as EmployeeType[]
    }
  }

  return params
}

/**
 * Serialize leadership filter form values to URL search params
 */
function serializeLeaderFiltersToUrl(
  values: LeaderEmployeeFilterFormData,
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

  if (values.employee_types && values.employee_types.length > 0) {
    values.employee_types.forEach((t) => {
      if (t != null) newParams.append('employee_types', t)
    })
  }

  return newParams
}

function buildLeaderExportParamsFromListQuery(
  apiParams: NonNullable<GetLeaderEmployeesParams> | undefined
): GetLeaderEmployeesExportParams {
  const exportParams: GetLeaderEmployeesExportParams = {}

  if (apiParams) {
    if (apiParams.branch) exportParams.branch = apiParams.branch
    if (apiParams.block) exportParams.block = apiParams.block
    if (apiParams.department) exportParams.department = apiParams.department
    if (Array.isArray(apiParams.employee_types) && apiParams.employee_types.length > 0) {
      exportParams.employee_types = apiParams.employee_types.filter(
        (t): t is EmployeeType => t !== null
      )
    }
    if (apiParams.search && apiParams.search.trim() !== '') {
      exportParams.search = apiParams.search
    }
  }

  return exportParams
}

const EmployeeLeadershipPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()
  const formRef = useRef<LeaderEmployeeFilterFormRef>(null)

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

  const { openExportDialog } = useLeaderEmployeeExport()

  // ===== Validate cascade selects (top-down): Branch -> Block -> Department =====
  const branchIdFromUrl = parsePositiveInt(searchParams.get('branch'))
  const blockIdFromUrl = parsePositiveInt(searchParams.get('block'))
  const departmentIdFromUrl = parsePositiveInt(searchParams.get('department'))

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

  const validatedOrgFilterParams = useMemo((): Pick<
    LeaderEmployeeFilterFormData,
    'branch_id' | 'block_id' | 'department_id'
  > => {
    return {
      branch_id: isBranchValid ? branchIdFromUrl : undefined,
      block_id: isBlockValid ? blockIdFromUrl : undefined,
      department_id: isDepartmentValid ? departmentIdFromUrl : undefined,
    }
  }, [
    blockIdFromUrl,
    branchIdFromUrl,
    departmentIdFromUrl,
    isBlockValid,
    isBranchValid,
    isDepartmentValid,
  ])

  const isOrgValidationLoading = useMemo(() => {
    const isBranchLoading = !!branchIdFromUrl && branchQuery.isLoading
    const isBlockLoading = !!blockIdFromUrl && isBranchValid && blockQuery.isLoading
    const isDepartmentLoading = !!departmentIdFromUrl && isBlockValid && departmentQuery.isLoading

    return isBranchLoading || isBlockLoading || isDepartmentLoading
  }, [
    blockIdFromUrl,
    blockQuery.isLoading,
    branchIdFromUrl,
    branchQuery.isLoading,
    departmentIdFromUrl,
    departmentQuery.isLoading,
    isBlockValid,
    isBranchValid,
  ])

  // Initialize URL with defaults if empty
  useEffect(() => {
    const hasPage = searchParams.has('page')
    const hasPageSize = searchParams.has('page_size')

    if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
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

  const isQueryReady = isUrlReady && !isOrgValidationLoading

  // Build API params from URL (ignore invalid cascade selects)
  const apiParams = useMemo(() => {
    if (!isQueryReady) return undefined

    const params = buildApiParamsFromUrl(searchParams)

    if (validatedOrgFilterParams.branch_id) params.branch = validatedOrgFilterParams.branch_id
    if (validatedOrgFilterParams.block_id) params.block = validatedOrgFilterParams.block_id
    if (validatedOrgFilterParams.department_id)
      params.department = validatedOrgFilterParams.department_id

    return params
  }, [searchParams, isQueryReady, validatedOrgFilterParams])

  // Parse current filter params from URL for dialog
  const currentFilterParams = useMemo(() => {
    return {
      ...parseLeaderFilterParamsFromUrl(searchParams),
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
    if (currentFilterParams.employee_types && currentFilterParams.employee_types.length > 0) count++

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

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  // Handle config table column
  const handleConfigTableColumn = useCallback(() => {
    setShouldShowConfig(true)
  }, [])

  // Reset trigger after a short delay to allow dialog to open
  useEffect(() => {
    if (shouldShowConfig) {
      const timer = setTimeout(() => {
        setShouldShowConfig(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldShowConfig])

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

    const newParams = serializeLeaderFiltersToUrl(formData, searchParams)
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  // Handle clear all (search + filters) - reset to defaults
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  // Handle export
  const handleExport = useCallback(() => {
    openExportDialog(buildLeaderExportParamsFromListQuery(apiParams))
  }, [openExportDialog, apiParams])

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
        handleExportBtnFull={ability.can('leader_export', 'employee') ? handleExport : undefined}
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <LeaderEmployeeTable
            isShowTableColumnConfig={shouldShowConfig}
            apiParams={apiParams}
            currentPage={currentPage}
            pageSize={pageSize}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            onClearFilter={handleClearAll}
            hasFilter={!!searchInput || activeFilterCount > 0}
            isUrlReady={isQueryReady}
          />
        </div>
      </Flex>

      {/* Filter Dialog using AppDialog with variant='filter' */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <LeaderEmployeeFilterForm
            ref={formRef}
            initialValues={currentFilterParams}
            isOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default EmployeeLeadershipPage
