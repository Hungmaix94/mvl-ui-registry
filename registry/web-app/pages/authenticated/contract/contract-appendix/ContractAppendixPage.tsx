import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import ContractAppendixTable from '@/features/contract/contract-appendix/view/ContractAppendixTable.tsx'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import {
  useContractAppendices,
  type GetContractAppendicesParams,
  type GetContractAppendicesExportParams,
  useExportContractAppendices,
} from '@/features/contract/services/contract-appendix-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
  useEmployeeForFilter,
} from '@/hooks/useFilterEntityValidation'
import { useContractAppendixDelete } from '@/features/contract/contract-appendix/_shares/hooks/useContractAppendixDelete.tsx'
import useContractAppendixImport from '@/features/contract/contract-appendix/_shares/hooks/useContractAppendixImport.tsx'
import { useDebounceValue } from 'usehooks-ts'
import { parse } from 'date-fns'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import ContractAppendixFilterForm, {
  type ContractAppendixFilterFormRef,
} from '@/features/contract/contract-appendix/_shares/components/ContractAppendixFilterForm.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

type FilterParams = {
  effective_date_range?: { from?: Date; to?: Date } | null
  branch_id?: number
  block_id?: number
  department_id?: number
  employee_id?: number
  status?: string[]
}

/**
 * Parse filter params from URL search params (for form display only, no validation)
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}

  const fromDate = searchParams.get('effective_date_from')
  const toDate = searchParams.get('effective_date_to')
  if (fromDate || toDate) {
    try {
      params.effective_date_range = {
        from: fromDate ? parse(fromDate, DATE_SERVER_FORMAT, new Date()) : undefined,
        to: toDate ? parse(toDate, DATE_SERVER_FORMAT, new Date()) : undefined,
      }
    } catch {
      // If parsing fails, leave as undefined
    }
  }

  // Parse IDs without validation (validation happens via hooks)
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
function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetContractAppendicesParams> {
  const params: NonNullable<GetContractAppendicesParams> = {}

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

  // Filter params - date range
  const fromDate = searchParams.get('effective_date_from')
  if (fromDate) {
    params.effective_date_from = fromDate
  }

  const toDate = searchParams.get('effective_date_to')
  if (toDate) {
    params.effective_date_to = toDate
  }

  // Note: branch, block, department, employee, status will be added after validation

  return params
}

export default function ContractAppendixPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<ContractAppendixFilterFormRef>(null)
  const ability = useAbility()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useContractAppendixDelete()
  const { openExportDialog } = useExportContractAppendices()
  const { openImportDialog } = useContractAppendixImport()

  // Get status options for validation
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS],
  })

  const statusOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS) || []
      : []
  }, [keysMapOptions])

  const validStatusValues = useMemo(() => {
    return new Set(statusOptions.map((opt: { value: string }) => String(opt.value)))
  }, [statusOptions])

  // ===== Validate async select IDs from URL =====
  const branchIdFromUrl = parsePositiveInt(searchParams.get('branch'))
  const blockIdFromUrl = parsePositiveInt(searchParams.get('block'))
  const departmentIdFromUrl = parsePositiveInt(searchParams.get('department'))
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

  const employeeQuery = useEmployeeForFilter(employeeIdFromUrl ?? 0)
  const isEmployeeValid = !!employeeQuery.data

  // Validate status (filter by valid enum values)
  const statusesFromUrl = searchParams.getAll('status')
  const validatedStatuses = useMemo(() => {
    return statusesFromUrl.filter((status) => validStatusValues.has(status))
  }, [statusesFromUrl, validStatusValues])

  const validatedFilterParams = useMemo(() => {
    return {
      branch_id: isBranchValid ? branchIdFromUrl : undefined,
      block_id: isBlockValid ? blockIdFromUrl : undefined,
      department_id: isDepartmentValid ? departmentIdFromUrl : undefined,
      employee_id: isEmployeeValid ? employeeIdFromUrl : undefined,
      status: validatedStatuses.length > 0 ? validatedStatuses : undefined,
    }
  }, [
    isBranchValid,
    branchIdFromUrl,
    isBlockValid,
    blockIdFromUrl,
    isDepartmentValid,
    departmentIdFromUrl,
    isEmployeeValid,
    employeeIdFromUrl,
    validatedStatuses,
  ])

  const isFilterValidationLoading = useMemo(() => {
    const isBranchLoading = !!branchIdFromUrl && branchQuery.isLoading
    const isBlockLoading = !!blockIdFromUrl && blockQuery.isLoading
    const isDepartmentLoading = !!departmentIdFromUrl && departmentQuery.isLoading
    const isEmployeeLoading = !!employeeIdFromUrl && employeeQuery.isLoading
    return isBranchLoading || isBlockLoading || isDepartmentLoading || isEmployeeLoading
  }, [
    branchIdFromUrl,
    branchQuery.isLoading,
    blockIdFromUrl,
    blockQuery.isLoading,
    departmentIdFromUrl,
    departmentQuery.isLoading,
    employeeIdFromUrl,
    employeeQuery.isLoading,
  ])

  // Initialize URL with defaults if empty (only on direct access, not navigate back)
  useEffect(() => {
    // Check actual browser URL to avoid race condition with searchParams
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    // Check if this is a navigate back (has referrer from same origin) vs direct access
    const referrer = document.referrer
    const isNavigateBack = referrer && referrer.includes(window.location.origin)

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    // Only apply defaults if URL is completely empty AND this is direct access (not navigate back)
    if (isUrlEmpty && !isNavigateBack) {
      const newParams = new URLSearchParams()

      // Set defaults: pagination only (no filters)
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))

      setSearchParams(newParams, { replace: true })
    } else if (isUrlEmpty && isNavigateBack) {
      // URL is empty but this is navigate back - still need pagination for API to work
      // Set minimal defaults (pagination only) to ensure API can be called
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))

      setSearchParams(newParams, { replace: true })
    } else {
      // URL has some params - only ensure page and page_size exist (don't force filters)
      const needsUpdate = !hasPage || !hasPageSize
      if (needsUpdate) {
        const newParams = new URLSearchParams(searchParams)
        if (!hasPage) {
          newParams.set('page', '1')
        }
        if (!hasPageSize) {
          newParams.set('page_size', String(PAGE_SIZE))
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
  }, [debouncedSearch, isUrlReady])

  const isAppendicesQueryReady = isUrlReady && !isFilterValidationLoading

  // Build API params from URL (with validated IDs)
  const apiParams = useMemo(() => {
    if (!isAppendicesQueryReady) return undefined

    const baseParams = buildApiParamsFromUrl(searchParams)

    // Only add validated IDs to API params
    if (validatedFilterParams.branch_id) {
      baseParams.branch = validatedFilterParams.branch_id
    }
    if (validatedFilterParams.block_id) {
      baseParams.block = validatedFilterParams.block_id
    }
    if (validatedFilterParams.department_id) {
      baseParams.department = validatedFilterParams.department_id
    }
    if (validatedFilterParams.employee_id) {
      baseParams.employee = validatedFilterParams.employee_id
    }
    if (validatedFilterParams.status && validatedFilterParams.status.length > 0) {
      baseParams.status = validatedFilterParams.status as any
    }

    return baseParams
  }, [searchParams, isAppendicesQueryReady, validatedFilterParams])

  // Call API with params derived from URL
  const {
    data: appendicesData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useContractAppendices(isAppendicesQueryReady && apiParams ? apiParams : undefined)

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
    if (formData.effective_date_range?.from) {
      newParams.set('effective_date_from', formatDateToApi(formData.effective_date_range.from))
    }
    if (formData.effective_date_range?.to) {
      newParams.set('effective_date_to', formatDateToApi(formData.effective_date_range.to))
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

    if (formData.employee_id) {
      newParams.set('employee', String(formData.employee_id))
    }

    // Handle status (array)
    if (formData.status && formData.status.length > 0) {
      // Remove existing status params
      newParams.delete('status')
      // Add each status as separate param
      formData.status.forEach((status) => {
        newParams.append('status', status)
      })
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
    navigate(APP_PATH.CONTRACT_APPENDIX_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleExport = useCallback(() => {
    const exportParams: GetContractAppendicesExportParams = {}

    if (apiParams) {
      if (apiParams.block !== undefined) exportParams.block = apiParams.block
      if (apiParams.branch !== undefined) exportParams.branch = apiParams.branch
      if (apiParams.department !== undefined) exportParams.department = apiParams.department
      if (apiParams.employee !== undefined) exportParams.employee = apiParams.employee
      if (apiParams.effective_date_from) {
        exportParams.effective_date_from = apiParams.effective_date_from
      }
      if (apiParams.effective_date_to) {
        exportParams.effective_date_to = apiParams.effective_date_to
      }
      if (apiParams.ordering) exportParams.ordering = apiParams.ordering
      if (apiParams.search) exportParams.search = apiParams.search
      if (Array.isArray(apiParams.status) && apiParams.status.length > 0) {
        exportParams.status = apiParams.status
      }
    }

    openExportDialog(exportParams)
  }, [openExportDialog, apiParams])

  const handleImport = useCallback(() => {
    openImportDialog()
  }, [openImportDialog])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (
      currentFilterParams.effective_date_range?.from ||
      currentFilterParams.effective_date_range?.to
    )
      count++
    if (currentFilterParams.branch_id) count++
    if (currentFilterParams.block_id) count++
    if (currentFilterParams.department_id) count++
    if (currentFilterParams.employee_id) count++
    if (currentFilterParams.status && currentFilterParams.status.length > 0) count++
    return count
  }, [currentFilterParams])

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = appendicesData?.results ?? []
    const count = appendicesData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [appendicesData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching

  // Convert currentFilterParams to form initialValues format
  const formInitialValues = useMemo(() => {
    return {
      effective_date_range: currentFilterParams.effective_date_range || null,
      branch_id: currentFilterParams.branch_id,
      block_id: currentFilterParams.block_id,
      department_id: currentFilterParams.department_id,
      employee_id: currentFilterParams.employee_id,
      status: currentFilterParams.status || [],
    }
  }, [currentFilterParams])

  return (
    <>
      <PageTitle
        title={'Phụ lục hợp đồng'}
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm phụ lục hợp đồng"
        searchClassName="!w-[356px]"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={ability.can('create', 'contract_appendix') ? handleCreateNew : undefined}
        handleExportBtnFull={ability.can('export', 'contract_appendix') ? handleExport : undefined}
        handleImportBtnFull={
          ability.can('start_import', 'contract_appendix') ? handleImport : undefined
        }
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <ContractAppendixTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onDeleteContractAppendix={openDeleteDialog}
          onClearFilter={handleClearAll}
          hasFilter={!!searchInput || activeFilterCount > 0}
        />
      </Flex>

      {/* Filter Dialog using AppDialog with variant='filter' */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<ContractAppendixFilterForm ref={formRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}
