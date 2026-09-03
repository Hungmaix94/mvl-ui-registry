import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { SalesRevenueTable } from '@/features/payroll/sales-revenue'
import {
  type SalesRevenue,
  type GetSalesRevenuesParams,
  useSalesRevenues,
} from '@/features/payroll/services/sales-revenue-service'
import { useAbility } from '@/lib/ability.ts'
import { useDebounceValue } from 'usehooks-ts'
import { parse, format } from 'date-fns'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { MONTH_FORMAT } from '@/constants/date-format.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import SalesRevenueFilterForm, {
  type SalesRevenueFilterFormRef,
  type SalesRevenueFilterForm as FilterFormType,
} from '@/features/payroll/sales-revenue/_shares/components/SalesRevenueFilterForm.tsx'
import { useSalesRevenueExport } from '@/features/payroll/sales-revenue/_shares/hooks/useSalesRevenueExport.tsx'
import useSalesRevenueImport from '@/features/payroll/sales-revenue/_shares/hooks/useSalesRevenueImport.tsx'

type FilterParams = {
  month?: Date
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
  status?: string
}

/**
 * Parse filter params from URL search params (for form display only, no validation)
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}

  const month = searchParams.get('month')
  if (month) {
    try {
      params.month = parse(month, MONTH_FORMAT, new Date())
    } catch {
      // If parsing fails, leave as undefined
    }
  }

  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) params.branch_id = branchId

  const blockId = parsePositiveInt(searchParams.get('block'))
  if (blockId) params.block_id = blockId

  const departmentId = parsePositiveInt(searchParams.get('department'))
  if (departmentId) params.department_id = departmentId

  const positionId = parsePositiveInt(searchParams.get('position'))
  if (positionId) params.position_id = positionId

  const status = searchParams.get('status')
  if (status) {
    params.status = status
  }

  return params
}

/**
 * Build API params from URL search params (without validation - will be validated separately)
 */
function buildApiParamsFromUrl(searchParams: URLSearchParams): NonNullable<GetSalesRevenuesParams> {
  const params: NonNullable<GetSalesRevenuesParams> = {}

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

  // Note: branch, block, department, position, status will be added after validation

  return params
}

const SalesRevenuePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<SalesRevenueFilterFormRef>(null)
  const ability = useAbility()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // No employee validation needed (no employee field in filter)

  const isRevenuesQueryReady = isUrlReady

  // Initialize URL with defaults on mount (only once)
  useEffect(() => {
    if (!isUrlReady) {
      const hasParams = searchParams.toString().length > 0
      if (!hasParams) {
        const defaultParams = new URLSearchParams()
        defaultParams.set('page', '1')
        defaultParams.set('page_size', String(PAGE_SIZE))
        // Set default month = current month
        defaultParams.set('month', format(new Date(), MONTH_FORMAT))
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
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  // Build API params from URL
  const apiParams = useMemo(() => {
    if (!isRevenuesQueryReady) return undefined

    const baseParams = buildApiParamsFromUrl(searchParams)

    // Add filter params from URL
    const branchId = parsePositiveInt(searchParams.get('branch'))
    if (branchId) baseParams.branch = branchId

    const blockId = parsePositiveInt(searchParams.get('block'))
    if (blockId) baseParams.block = blockId

    const departmentId = parsePositiveInt(searchParams.get('department'))
    if (departmentId) baseParams.department = departmentId

    const positionId = parsePositiveInt(searchParams.get('position'))
    if (positionId) baseParams.position = positionId

    const status = searchParams.get('status')
    if (status) {
      baseParams.status = status as any
    }

    return baseParams
  }, [searchParams, isRevenuesQueryReady])

  // Call API with params derived from URL
  const {
    data: revenuesData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useSalesRevenues(apiParams, {
    enabled: isRevenuesQueryReady && !!apiParams,
  })

  // Parse current filter params from URL for dialog
  const currentFilterParams = useMemo(() => {
    return parseFilterParamsFromUrl(searchParams)
  }, [searchParams])

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
      newParams.set('month', format(formData.month, MONTH_FORMAT))
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

    if (formData.status) {
      newParams.set('status', formData.status)
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, pageSize])

  // Handle clear all (search + filters) - reset to defaults (with default month)
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    // Reset to default month = current month
    newParams.set('month', format(new Date(), MONTH_FORMAT))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const { openExportDialog } = useSalesRevenueExport()
  const { openImportDialog } = useSalesRevenueImport()

  const handleDeleteSalesRevenue = useCallback((revenue: SalesRevenue) => {
    // TODO: Implement delete dialog hook
    console.log('Delete sales revenue:', revenue)
  }, [])

  const handleExport = useCallback(() => {
    openExportDialog(searchInput, currentFilterParams as FilterFormType)
  }, [openExportDialog, searchInput, currentFilterParams])

  const handleImport = useCallback(() => {
    // Pass current month from filter to import dialog
    const monthFromFilter = currentFilterParams.month
    openImportDialog(monthFromFilter)
  }, [openImportDialog, currentFilterParams.month])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0

    if (currentFilterParams.month) count++
    if (currentFilterParams.branch_id) count++
    if (currentFilterParams.block_id) count++
    if (currentFilterParams.department_id) count++
    if (currentFilterParams.position_id) count++
    if (currentFilterParams.status) count++
    return count
  }, [currentFilterParams, searchParams])

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = revenuesData?.results ?? []
    const count = revenuesData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [revenuesData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching

  // Convert currentFilterParams to form initialValues format
  const formInitialValues = useMemo(() => {
    return {
      month: currentFilterParams.month || undefined,
      branch_id: currentFilterParams.branch_id || undefined,
      block_id: currentFilterParams.block_id || undefined,
      department_id: currentFilterParams.department_id || undefined,
      position_id: currentFilterParams.position_id || undefined,
      status: currentFilterParams.status as any,
    }
  }, [currentFilterParams])

  return (
    <>
      <PageTitle
        searchPlaceholder="Tìm kiếm theo tên, mã doanh thu"
        searchClassName="!w-[350px]"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleImportBtnFull={
          ability.can('start_import', 'sales_revenue') ? handleImport : undefined
        }
        handleExportBtnFull={ability.can('export', 'sales_revenue') ? handleExport : undefined}
      />
      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <SalesRevenueTable
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
            onDeleteSalesRevenue={handleDeleteSalesRevenue}
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
        content={<SalesRevenueFilterForm ref={formRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default SalesRevenuePage
