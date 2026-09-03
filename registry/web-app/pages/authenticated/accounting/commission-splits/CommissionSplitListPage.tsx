import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'

import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'

import {
  useCommissionSplits,
  type GetCommissionSplitsParams,
} from '@/features/accounting/commission-splits/services/commission-splits-service'
import { CommissionSplitTable } from '@/features/accounting/commission-splits/components/CommissionSplitTable'
import DealPeriodAllocationFilter, {
  type DealPeriodAllocationFilterFormData,
  type DealPeriodAllocationFilterRef,
} from '@/features/accounting/deal-period-allocations/components/DealPeriodAllocationFilter'
import {
  sanitizeDialDeviates,
  sanitizeWorksheetStatus,
} from '@/features/accounting/deal-period-allocations/constants/approval-filters'

import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'

function buildApiParams(
  searchParams: URLSearchParams,
  year: number | null,
  month: number | null
): GetCommissionSplitsParams {
  const params: GetCommissionSplitsParams = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  params.page_size =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const deal = parsePositiveInt(searchParams.get('deal'))
  if (deal) params.deal = deal

  const search = searchParams.get('search')
  if (search) (params as any).search = search.trim()

  // Bộ lọc "Trạng thái duyệt" (bug 86ey45799: dùng `worksheet_status`, KHÔNG phải `status`
  // — `status` lọc trạng thái từng dòng phân bổ, một chiều khác).
  const worksheetStatus = sanitizeWorksheetStatus(searchParams.get('worksheet_status'))
  if (worksheetStatus) (params as any).worksheet_status = worksheetStatus

  const project = parsePositiveInt(searchParams.get('project'))
  if (project) (params as any).project = project

  const receiptVoucher = parsePositiveInt(searchParams.get('receipt_voucher'))
  if (receiptVoucher) (params as any).receipt_voucher = receiptVoucher

  const receiptVoucherLine = parsePositiveInt(searchParams.get('receipt_voucher_line'))
  if (receiptVoucherLine) (params as any).receipt_voucher_line = receiptVoucherLine

  const hasCommissionPayable = searchParams.get('has_commission_payable')
  if (hasCommissionPayable) (params as any).has_commission_payable = hasCommissionPayable

  // Bộ lọc "Duyệt lệch tiền về" — điều kiện RỜI, độc lập với trạng thái duyệt (CR STT20
  // 86eydc3ec). BE so dial vs default-snapshot ở 2dp, y như chip trên cột cùng tên.
  const dialDeviates = sanitizeDialDeviates(searchParams.get('dial_deviates'))
  if (dialDeviates) (params as any).dial_deviates = dialDeviates

  const productInventory = parsePositiveInt(searchParams.get('product_inventory'))
  if (productInventory) (params as any).product_inventory = productInventory

  if (year) params.year = year
  if (month) params.month = month

  return params
}

function getFilterValues(searchParams: URLSearchParams): DealPeriodAllocationFilterFormData {
  const data: DealPeriodAllocationFilterFormData = {}
  // Chỉ đổ về form giá trị hợp lệ: popup luôn hiện đúng thứ API đang lọc, kể cả khi URL bị
  // gõ tay.
  data.worksheet_status = sanitizeWorksheetStatus(searchParams.get('worksheet_status'))
  data.dial_deviates = sanitizeDialDeviates(searchParams.get('dial_deviates'))
  if (searchParams.has('deal')) data.deal = searchParams.get('deal')
  if (searchParams.has('receipt_voucher'))
    data.receipt_voucher = searchParams.get('receipt_voucher')
  if (searchParams.has('receipt_voucher_line'))
    data.receipt_voucher_line = searchParams.get('receipt_voucher_line')
  if (searchParams.has('has_commission_payable'))
    data.has_commission_payable = searchParams.get('has_commission_payable')
  if (searchParams.has('project')) data.project = searchParams.get('project')
  if (searchParams.has('product_inventory'))
    data.product_inventory = searchParams.get('product_inventory')
  return data
}

const CommissionSplitListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)
  const [shouldShowConfig, setShouldShowConfig] = useState(false)

  const formRef = useRef<DealPeriodAllocationFilterRef>(null)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const { data: allPeriods } = useAllAccountingPeriods()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))

  const activePeriodId = useMemo(() => {
    if (year && month) {
      return periods.find((p) => p.year === year && p.month === month)?.id || null
    }
    return null
  }, [periods, year, month])

  useEffect(() => {
    if (periods.length === 0 || isLoadingCurrent) return

    const actualUrlParams = new URLSearchParams(window.location.search)
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')
    const hasYear = searchParams.has('year') || actualUrlParams.has('year')
    const hasMonth = searchParams.has('month') || actualUrlParams.has('month')

    if (!hasPage || !hasPageSize || !hasYear || !hasMonth) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      if (!hasYear || !hasMonth) {
        const defaultPeriod = currentPeriod ?? periods[0]
        if (defaultPeriod) {
          newParams.set('year', String(defaultPeriod.year))
          newParams.set('month', String(defaultPeriod.month))
        }
      }
      setSearchParams(newParams, { replace: true })
    } else {
      setIsUrlReady(true)
    }
  }, [periods, currentPeriod, isLoadingCurrent, searchParams, setSearchParams])

  // Sync search input with URL
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isUrlReady) return
    const currentSearchTerm = (searchParams.get('search') || '').trim()
    const trimmedSearch = debouncedSearch.trim()
    if (trimmedSearch === currentSearchTerm) return
    const newParams = new URLSearchParams(searchParams)
    if (trimmedSearch) newParams.set('search', trimmedSearch)
    else newParams.delete('search')
    newParams.set('page', '1')
    setSearchParams(newParams, { replace: true })
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  // Reset trigger after a short delay to allow dialog to open
  useEffect(() => {
    if (shouldShowConfig) {
      const timer = setTimeout(() => {
        setShouldShowConfig(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldShowConfig])

  const searchQueryKey = searchParams.toString()

  const apiParams = useMemo(() => {
    if (!isUrlReady || !year || !month) return undefined
    return buildApiParams(new URLSearchParams(searchQueryKey), year, month)
  }, [isUrlReady, searchQueryKey, year, month])

  const {
    data: listResponse,
    isLoading,
    error,
  } = useCommissionSplits(apiParams!, {
    enabled: isUrlReady && !!apiParams && !!year && !!month,
  })

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/deal-period-worksheets/export/',
    'chia-hoa-hong-deal.xlsx'
  )
  const handleExport = useCallback(() => {
    if (!apiParams) return
    const { page: _page, page_size: _pageSize, ...filters } = apiParams as Record<string, unknown>
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const currentFilters = useMemo(
    () => getFilterValues(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const activeFilterCount = useMemo(() => {
    const params = new URLSearchParams(searchQueryKey)
    let count = 0
    if (params.has('worksheet_status')) count++
    if (params.has('deal')) count++
    if (params.has('receipt_voucher')) count++
    if (params.has('receipt_voucher_line')) count++
    if (params.has('has_commission_payable')) count++
    if (params.has('project')) count++
    if (params.has('product_inventory')) count++
    // `dial_deviates` là bộ lọc rời nên đếm riêng (CR STT20 86eydc3ec).
    if (params.has('dial_deviates')) count++
    return count
  }, [searchQueryKey])

  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpenKey((k) => k + 1)
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => setIsFilterDialogOpen(false), [])

  const handleClearFilter = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search')
    if (search) newParams.set('search', search)
    const ordering = searchParams.get('ordering')
    if (ordering) newParams.set('ordering', ordering)
    const yearParam = searchParams.get('year')
    if (yearParam) newParams.set('year', yearParam)
    const monthParam = searchParams.get('month')
    if (monthParam) newParams.set('month', monthParam)

    // 2 điều kiện lọc rời, ghép tự do (CR STT20 86eydc3ec).
    if (formData.worksheet_status) newParams.set('worksheet_status', formData.worksheet_status)
    if (formData.dial_deviates) newParams.set('dial_deviates', formData.dial_deviates)
    if (formData.deal) newParams.set('deal', formData.deal)
    if (formData.receipt_voucher) newParams.set('receipt_voucher', formData.receipt_voucher)
    if (formData.receipt_voucher_line)
      newParams.set('receipt_voucher_line', formData.receipt_voucher_line)
    if (formData.has_commission_payable)
      newParams.set('has_commission_payable', formData.has_commission_payable)
    if (formData.project) newParams.set('project', formData.project)
    if (formData.product_inventory) newParams.set('product_inventory', formData.product_inventory)

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const nextPage = pageIndex + 1
      const urlPage = parsePositiveInt(searchParams.get('page')) ?? 1
      const urlPageSizeRaw = parsePositiveInt(searchParams.get('page_size'))
      const effectiveUrlPageSize =
        urlPageSizeRaw && PAGE_SIZES.includes(urlPageSizeRaw) ? urlPageSizeRaw : PAGE_SIZE
      if (nextPage === urlPage && newPageSize === effectiveUrlPageSize) return

      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(nextPage))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })

      const mainEl = document.querySelector('main')
      if (mainEl) mainEl.scrollTop = 0
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams]
  )

  const totalRecords = listResponse?.count ?? 0

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm theo Mã phân bổ, Mã deal, Mã căn..."
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleConfigTableColumn={() => setShouldShowConfig(true)}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        toolbarLeftContent={
          <AccountingPeriodSelect
            periods={periods}
            selectedPeriodId={activePeriodId}
            onSelect={(periodId) => {
              const period = periods.find((p) => p.id === periodId)
              if (period) {
                const newParams = new URLSearchParams(searchParams)
                newParams.set('year', String(period.year))
                newParams.set('month', String(period.month))
                newParams.set('page', '1')
                setSearchParams(newParams, { replace: true })
              }
            }}
          />
        }
      />

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto pt-0 pb-0">
          <CommissionSplitTable
            data={listResponse?.results ?? []}
            isLoading={isLoading}
            error={error}
            totalRecords={totalRecords}
            pageSize={pageSize}
            currentPageIndex={currentPage - 1}
            onPaginationChange={handlePaginationChange}
            isShowTableColumnConfig={shouldShowConfig}
            totals={listResponse?.totals}
            totalsRowCount={listResponse?.row_count}
          />
        </div>
      </div>

      <AppDialog
        variant="filter"
        size="xl"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <DealPeriodAllocationFilter
            key={`${filterDialogOpenKey}`}
            ref={formRef}
            initialValues={currentFilters}
          />
        }
        onClearFilter={handleClearFilter}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </div>
  )
}

export default CommissionSplitListPage
