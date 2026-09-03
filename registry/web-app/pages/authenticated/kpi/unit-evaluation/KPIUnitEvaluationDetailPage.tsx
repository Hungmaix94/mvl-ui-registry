import { PageTitle } from '@/components/ui'
import {
  type GetPayrollKPIAssessmentsDepartmentsParams,
  usePayrollKPIAssessmentsDepartments,
  usePayrollKPIPeriod,
} from '@/features/kpi/services/kpi-assessment-service'
import { KPIUnitEvaluationDetailTable } from '@/features/kpi/unit-evaluation/view-details/KPIUnitEvaluationDetailTable'
import { parsePositiveInt } from '@/utils'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { useSearchParams } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import AppDialog from '@/components/dialog/AppDialog'
import KPIUnitEvaluationFilterForm, {
  KPIUnitEvaluationFilterFormData,
  KPIUnitEvaluationFilterFormRef,
} from '@/features/kpi/unit-evaluation/components/KPIUnitEvaluationFilterForm'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import { useKPIUnitEvaluationExport } from '@/features/kpi/unit-evaluation/_shares/hooks/useKPIUnitEvaluationExport'

function buildApiParamsFromUrl(
  searchParams: URLSearchParams,
  period?: number
): NonNullable<GetPayrollKPIAssessmentsDepartmentsParams> {
  const params: NonNullable<GetPayrollKPIAssessmentsDepartmentsParams> = {}

  // Period
  if (period) {
    params.period = period
  }

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  // Search
  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }

  // Filters
  const branch = parsePositiveInt(searchParams.get('branch'))
  if (branch) params.branch = branch

  const block = parsePositiveInt(searchParams.get('block'))
  if (block) params.block = block

  const department = parsePositiveInt(searchParams.get('department'))
  if (department) params.department = department

  // Ordering
  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering

  return params
}

function serializeKPIUnitEvaluationFiltersToUrl(
  values: KPIUnitEvaluationFilterFormData,
  baseParams: URLSearchParams,
  period?: number
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

  // Keep period param
  if (period) newParams.set('period', String(period))

  // Serialize filter values
  if (values.branch_id) newParams.set('branch', String(values.branch_id))
  if (values.block_id) newParams.set('block', String(values.block_id))
  if (values.department_id) newParams.set('department', String(values.department_id))

  return newParams
}

const KPIUnitEvaluationDetailPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<KPIUnitEvaluationFilterFormRef>(null)
  const { openExportDialog } = useKPIUnitEvaluationExport()

  // Derive period from query first (shareable), then from navigation state
  const periodFromQuery = parsePositiveInt(searchParams.get('period'))
  const period = periodFromQuery ?? undefined

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // ===== Validate cascade selects (top-down): Branch -> Block -> Department, Position independent =====
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
    KPIUnitEvaluationFilterFormData,
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

  useEffect(() => {
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
      if (period) newParams.set('period', String(period))

      setSearchParams(newParams, { replace: true })
    } else if (isUrlEmpty && isNavigateBack) {
      // URL is empty but this is navigate back - don't apply defaults, just mark as ready
      // The URL will be preserved as-is (empty) or restored by browser history
    } else {
      // URL has some params - only ensure page and page_size exist
      const needsUpdate = !hasPage || !hasPageSize
      if (needsUpdate) {
        const newParams = new URLSearchParams(searchParams)
        if (!hasPage) {
          newParams.set('page', '1')
        }
        if (!hasPageSize) {
          newParams.set('page_size', String(PAGE_SIZE))
        }
        if (period && !newParams.get('period')) {
          newParams.set('period', String(period))
        }

        setSearchParams(newParams, { replace: true })
      }
    }

    setIsUrlReady(true)
  }, [setSearchParams])

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
      if (period) newParams.set('period', String(period))
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  // Build API params from URL
  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams, period)
  }, [searchParams, isUrlReady, period])

  const {
    data: dataDepartments,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = usePayrollKPIAssessmentsDepartments(apiParams)

  // Fetch period data to get month
  const { data: periodData } = usePayrollKPIPeriod(period ?? 0, { enabled: !!period })

  const currentFilterParams = useMemo(() => {
    return {
      ...buildApiParamsFromUrl(searchParams),
      ...validatedOrgFilterParams,
    }
  }, [searchParams, validatedOrgFilterParams])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = dataDepartments?.results ?? []
    const count = dataDepartments?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [dataDepartments, pageSize])

  const activeFilterCount = useMemo(() => {
    let count = 0

    if (currentFilterParams.branch_id) count++
    if (currentFilterParams.block_id) count++
    if (currentFilterParams.department_id) count++

    return count
  }, [currentFilterParams])

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      if (period) newParams.set('period', String(period))
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
      if (period) newParams.set('period', String(period))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

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

    const newParams = serializeKPIUnitEvaluationFiltersToUrl(formData, searchParams, period)
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, period])

  // Handle clear all (search + filters) - reset to defaults
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleExportBtnFull = useCallback(() => {
    openExportDialog({
      period: period,
      branch: validatedOrgFilterParams.branch_id,
      block: validatedOrgFilterParams.block_id,
      department: validatedOrgFilterParams.department_id,
      search: debouncedSearch || undefined,
    })
  }, [openExportDialog, period, validatedOrgFilterParams, debouncedSearch])

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = !!searchInput && searchInput.trim() !== ''

  if (error) {
    console.log('API error, using mock data:', error)
  }

  const pageTitle = `Tháng ${periodData?.month || ''}`

  return (
    <>
      <PageTitle
        title={pageTitle}
        handleSearch={handleSearch}
        searchPlaceholder="Tìm kiếm phòng ban"
        searchClassName="!w-[350px]"
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={handleExportBtnFull}
        enableBackButton
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className="pb-6">
        <KPIUnitEvaluationDetailTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          totalRecords={totalRecords}
          currentPage={currentPage}
          pageSize={pageSize}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onClearFilter={handleClearAll}
          hasFilter={hasFilter}
        />
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<KPIUnitEvaluationFilterForm ref={formRef} initialValues={currentFilterParams} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default KPIUnitEvaluationDetailPage
