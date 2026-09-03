import { PageTitle } from '@/components/ui'
import {
  type GetPayrollKPIAssessmentsDepartmentsParams,
  usePayrollKPIAssessmentsDepartments,
  usePayrollKPIPeriodSummary,
} from '@/features/kpi/services/kpi-assessment-service'
import { parsePositiveInt } from '@/utils'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { useParams, useSearchParams } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Flex, Grid } from '@radix-ui/themes'
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
import { KPIPeriodSummaryDetailWrapper } from '@/features/kpi/kpi-period-summary/view-details/KPIPeriodSummaryDetailWrapper'
import { IconCheckcircle, IconSpinnergap, IconWarningoctagon } from '@/assets/icons'
import { useKPIPeriodSummaryExport } from '@/features/kpi/kpi-period-summary/_shares/hooks/useKPIPeriodSummaryExport'
import { useAbility } from '@/lib/ability'

type SummaryCardVariant = 'blue' | 'orange' | 'red'

type SummaryCardProps = {
  title: string
  value: number | string
  unitLabel?: string
  Icon: React.ElementType
  isLoading?: boolean
  variant: SummaryCardVariant
}

function SummaryCard({ title, value, Icon, isLoading, variant }: SummaryCardProps) {
  const variants: Record<SummaryCardVariant, { card: string; icon: string; value: string }> = {
    blue: {
      card: 'bg-blue-50',
      icon: 'h-10 w-10 text-data-blue-default',
      value: 'typo-h2 text-data-blue-default',
    },
    orange: {
      card: 'bg-orange-10',
      icon: 'h-10 w-10 text-data-orange-default',
      value: 'typo-h2 text-data-orange-default',
    },
    red: {
      card: 'bg-red-10',
      icon: 'h-10 w-10 text-action-primary-red-default',
      value: 'typo-h2 text-data-red-default',
    },
  }

  const colors = variants[variant]

  return (
    <div className={`${colors.card} h-[170px] w-full rounded-sm p-5`}>
      <Flex direction="column" justify="between" className="h-full">
        <Flex justify="between" align="center">
          <span className="typo-body-lg-semibold text-content-dark-1">{title}</span>
          <Icon className={colors.icon} />
        </Flex>
        <Flex direction="column">
          <span className={colors.value}>{isLoading ? '...' : value}</span>
          <span className="typo-body-xl-semibold text-content-dark-3">phòng</span>
        </Flex>
      </Flex>
    </div>
  )
}

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

  return newParams
}

const KPIUnitEvaluationDetailPage = () => {
  const ability = useAbility()
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<KPIUnitEvaluationFilterFormRef>(null)

  // Get period from URL path parameter
  const period = parsePositiveInt(id ?? null) ?? undefined

  // Export hook
  const { openExportDialog, isExporting } = useKPIPeriodSummaryExport()

  const hasInitialized = useRef(false)
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
    // Chỉ chạy logic khởi tạo một lần
    if (hasInitialized.current) {
      setIsUrlReady(true)
      return
    }

    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    // Nếu đã có params trong URL (từ navigate back hoặc bookmark), chỉ cần ensure page/page_size
    if (hasPage || hasPageSize || actualUrlParams.toString() !== '') {
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
    } else {
      // URL hoàn toàn rỗng - áp dụng defaults
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }

    hasInitialized.current = true
    setIsUrlReady(true)
  }, [searchParams, setSearchParams])

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

  // Fetch summary data for 3 cards
  const { data: summaryData, isLoading: isSummaryLoading } = usePayrollKPIPeriodSummary(
    period ?? 0,
    { enabled: !!period }
  )

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

    const mappedTableData = results.map((item: any) => ({
      id: item.id,
      department_id: item.department?.id ?? 0,
      branch_name: item.branch?.name ?? '',
      block_name: item.block?.name ?? '',
      department_name: item.department?.name ?? '',
      employee_count: item.employee_count ?? 0,
      is_valid_unit_control: item.is_valid_unit_control ?? null,
      grade: item.grade ?? '',
      manager_grade_distribution: item.manager_grade_distribution ?? { A: 0, B: 0, C: 0, D: 0 },
    }))

    return {
      tableData: mappedTableData,
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

    const newParams = serializeKPIUnitEvaluationFiltersToUrl(formData, searchParams)
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
    if (isExporting) return

    const ordering = searchParams.get('ordering') || undefined
    openExportDialog(period, searchInput, currentFilterParams, ordering)
  }, [isExporting, openExportDialog, period, searchInput, currentFilterParams, searchParams])

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = !!searchInput && searchInput.trim() !== ''

  if (error) {
    console.log('API error, using mock data:', error)
  }

  const summaryCards = [
    {
      title: 'Số phòng đã đánh giá',
      value: summaryData?.departments_finished ?? 0,
      Icon: IconCheckcircle,
      variant: 'blue' as SummaryCardVariant,
    },
    {
      title: 'Số phòng chưa đánh giá',
      value: summaryData?.departments_not_finished ?? 0,
      Icon: IconSpinnergap,
      variant: 'orange' as SummaryCardVariant,
    },
    {
      title: 'Số phòng vi phạm tỉ lệ khống chế',
      value: summaryData?.departments_not_valid_control ?? 0,
      Icon: IconWarningoctagon,
      variant: 'red' as SummaryCardVariant,
    },
  ]

  const firstResult = dataDepartments?.results?.[0]
  const pageTitle = firstResult?.period?.month
    ? `Tháng ${firstResult.period.month}`
    : 'Chi tiết tổng hợp'

  return (
    <>
      <PageTitle
        title={pageTitle}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={
          ability.can('summary_report_export', 'department_kpi_assessment')
            ? handleExport
            : undefined
        }
        enableBackButton
      />
      <Flex flexGrow="1" direction="column" gap="6" className="pb-6">
        {/* Summary Cards */}
        <Grid columns="3" className="gap-5 px-10 pt-3">
          {summaryCards.map((c, idx) => (
            <SummaryCard key={idx} {...c} isLoading={isSummaryLoading} />
          ))}
        </Grid>

        {/* Table */}
        <KPIPeriodSummaryDetailWrapper
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
