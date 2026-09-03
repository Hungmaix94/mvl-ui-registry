import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import AppDialog from '@/components/dialog/AppDialog.tsx'
import { PageTitle } from '@/components/ui'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import AccountingPeriodFilterForm, {
  type AccountingPeriodFilterFormRef,
} from '@/features/accounting/accounting-periods/_shares/components/AccountingPeriodFilterForm.tsx'
import {
  type GetAccountingPeriodsParams,
  useAccountingPeriods,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import {
  type AccountingPeriodFilterValues,
  DEFAULT_ACCOUNTING_PERIOD_FILTER_VALUES,
} from '@/features/accounting/accounting-periods/types/accounting-period-types'
import AccountingPeriodTable from '@/features/accounting/accounting-periods/view/AccountingPeriodTable.tsx'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'
import { parsePositiveInt } from '@/utils/common.ts'

function buildApiParamsFromUrl(searchParams: URLSearchParams): GetAccountingPeriodsParams {
  const params: GetAccountingPeriodsParams = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  const year = parsePositiveInt(searchParams.get('year'))
  if (year) params.year = year

  const month = parsePositiveInt(searchParams.get('month'))
  if (month) params.month = month

  const status = searchParams.get('status')
  if (status) params.status = status as GetAccountingPeriodsParams['status']

  params.ordering = searchParams.get('ordering') || '-year,-month'

  return params
}

function parseFilterParamsFromUrl(
  searchParams: URLSearchParams
): Partial<AccountingPeriodFilterValues> {
  const params: Partial<AccountingPeriodFilterValues> = {}
  const year = searchParams.get('year')
  if (year) params.year = Number(year)
  const month = searchParams.get('month')
  if (month) params.month = Number(month)
  const status = searchParams.get('status')
  if (status) params.status = status
  return params
}

export default function AccountingPeriodPage() {
  const navigate = useNavigate()
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterFormRef = useRef<AccountingPeriodFilterFormRef>(null)

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [shouldShowConfig, setShouldShowConfig] = useState(false)

  // Initialize URL defaults
  useEffect(() => {
    const actualUrlParams = new URLSearchParams(window.location.search)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  const { data, isLoading, error, isFetching, isRefetching } = useAccountingPeriods(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/accounting-periods/export/',
    'ky-ke-toan.xlsx'
  )
  const handleExport = useCallback(() => {
    const { page: _page, page_size: _pageSize, ...filters } = apiParams ?? {}
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = data?.results ?? []
    const count = data?.count ?? 0
    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [data, pageSize])

  const currentFilterParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  const filterBadgeCount = useMemo(
    () =>
      Object.values(currentFilterParams).filter((v) => v !== null && v !== undefined && v !== '')
        .length,
    [currentFilterParams]
  )

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.ACCOUNTING_PERIOD_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
      // Scroll to top on page change
      const mainEl = document.querySelector('main')
      if (mainEl) mainEl.scrollTop = 0
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams]
  )

  const handleClearAll = useCallback(() => {
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClearFilterInDialog = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    if (formData.year) newParams.set('year', String(formData.year))
    if (formData.month) newParams.set('month', String(formData.month))
    if (formData.status) newParams.set('status', String(formData.status))

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, setSearchParams])

  const formInitialValues: Partial<AccountingPeriodFilterValues> = useMemo(
    () => ({
      ...DEFAULT_ACCOUNTING_PERIOD_FILTER_VALUES,
      year: currentFilterParams.year ? Number(currentFilterParams.year) : null,
      month: currentFilterParams.month ? Number(currentFilterParams.month) : null,
      status: currentFilterParams.status || null,
    }),
    [currentFilterParams]
  )

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = filterBadgeCount > 0

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
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Kỳ kế toán"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={filterBadgeCount}
        handleConfigTableColumn={() => setShouldShowConfig(true)}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        handleCreateNew={ability.can('create', 'accountingperiod') ? handleCreateNew : undefined}
        titleCreateNew="Tạo kỳ kế toán"
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto pt-4 pb-6">
        <AccountingPeriodTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPageIndex={currentPage - 1}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onClearFilter={handleClearAll}
          hasFilter={hasFilter}
          onDeleteSuccess={handleClearAll}
          isShowTableColumnConfig={shouldShowConfig}
        />
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <AccountingPeriodFilterForm ref={filterFormRef} initialValues={formInitialValues} />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </div>
  )
}
