import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'

import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'

import {
  useReceiptVouchers,
  type GetReceiptVouchersParams,
  type ReceiptVoucherList,
  useReceiptVoucherSummary,
} from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'
import ReceiptVoucherTable from '@/features/accounting/receipt-vouchers/components/ReceiptVoucherTable'
import { PostReceiptVoucherDialog } from '@/features/accounting/receipt-vouchers/_shares/components/PostReceiptVoucherDialog'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import ReceiptVoucherFilter, {
  type ReceiptVoucherFilterFormData,
  type ReceiptVoucherFilterRef,
} from '@/features/accounting/receipt-vouchers/components/ReceiptVoucherFilter'

function buildApiParams(
  searchParams: URLSearchParams,
  activePeriodId: number | null
): GetReceiptVouchersParams {
  const params: GetReceiptVouchersParams = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  params.page_size =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering

  const status = searchParams.get('status') ?? undefined
  if (status) (params as any).status = status

  const paymentMethod = searchParams.get('payment_method') ?? undefined
  if (paymentMethod) (params as any).payment_method = paymentMethod

  const search = searchParams.get('search') ?? undefined
  if (search) (params as any).search = search.trim()

  const payerType = searchParams.get('payer_type') ?? undefined
  if (payerType) (params as any).payer_type = payerType

  const payerInvestor = parsePositiveInt(searchParams.get('payer_investor'))
  if (payerInvestor) params.payer_investor = payerInvestor

  const receiptDateAfter = searchParams.get('receipt_date_after') ?? undefined
  if (receiptDateAfter) (params as any).receipt_date_after = receiptDateAfter

  const receiptDateBefore = searchParams.get('receipt_date_before') ?? undefined
  if (receiptDateBefore) (params as any).receipt_date_before = receiptDateBefore

  const payerTaxCode = searchParams.get('payer_tax_code') ?? undefined
  if (payerTaxCode) params.payer_tax_code = payerTaxCode

  if (activePeriodId) (params as any).accounting_period = activePeriodId

  return params
}

function getFilterValues(searchParams: URLSearchParams): ReceiptVoucherFilterFormData {
  const data: ReceiptVoucherFilterFormData = {}
  if (searchParams.has('status')) data.status = searchParams.get('status') ?? undefined
  if (searchParams.has('payment_method'))
    data.payment_method = searchParams.get('payment_method') ?? undefined
  if (searchParams.has('payer_type')) data.payer_type = searchParams.get('payer_type') ?? undefined
  if (searchParams.has('payer_investor'))
    data.payer_investor = searchParams.get('payer_investor') ?? undefined
  if (searchParams.has('receipt_date_after')) {
    data.receipt_date_after = parseDateFromApi(searchParams.get('receipt_date_after')) ?? null
  }
  if (searchParams.has('receipt_date_before')) {
    data.receipt_date_before = parseDateFromApi(searchParams.get('receipt_date_before')) ?? null
  }
  if (searchParams.has('payer_tax_code'))
    data.payer_tax_code = searchParams.get('payer_tax_code') ?? undefined
  return data
}

const ReceiptVoucherListPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)
  const [shouldShowConfig, setShouldShowConfig] = useState(false)
  // Dòng ở màn danh sách là serializer `ReceiptVoucherList` (không có `collection_variance` /
  // `invoices`) — dialog ghi sổ chỉ cần đúng phần `PostableReceiptVoucher`.
  const [voucherToPost, setVoucherToPost] = useState<ReceiptVoucherList | null>(null)
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const formRef = useRef<ReceiptVoucherFilterRef>(null)

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

  // CR STT47: danh sách luôn gửi kèm `accounting_period`, nên khoảng ngày chỉ được phép thu hẹp
  // BÊN TRONG kỳ đang chọn. Chặn ngay ở picker để hai bộ lọc không bao giờ mâu thuẫn nhau.
  const periodBounds = useMemo(() => {
    if (!year || !month) return { minDate: undefined, maxDate: undefined }
    return {
      minDate: new Date(year, month - 1, 1),
      maxDate: new Date(year, month, 0), // ngày 0 của tháng kế = ngày cuối tháng này
    }
  }, [year, month])

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

  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

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
    if (!isUrlReady || !activePeriodId) return undefined
    return buildApiParams(new URLSearchParams(searchQueryKey), activePeriodId)
  }, [isUrlReady, searchQueryKey, activePeriodId])

  const {
    data: listResponse,
    isLoading,
    error,
  } = useReceiptVouchers(apiParams, {
    enabled: isUrlReady && !!apiParams && !!activePeriodId,
  })

  // Totals for the sticky footer. Separate endpoint, fetched in parallel — the table paints
  // as soon as the page arrives and the footer fills in after. Keyed on filters only, so
  // changing page never refetches it.
  // Guard must stay identical to the list query above: if the two ever diverge, the summary
  // can fire without a period filter and briefly show a total across ALL periods.
  const { data: summaryResponse } = useReceiptVoucherSummary(apiParams, {
    enabled: isUrlReady && !!apiParams && !!activePeriodId,
  })

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const currentFilters = useMemo(
    () => getFilterValues(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/receipt-vouchers/export/',
    'phieu-thu.xlsx'
  )
  const handleExport = useCallback(() => {
    if (!apiParams) return
    const { page: _page, page_size: _pageSize, ...filters } = apiParams as Record<string, unknown>
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const activeFilterCount = useMemo(() => {
    const params = new URLSearchParams(searchQueryKey)
    let count = 0
    if (params.has('search')) count++
    if (params.has('status')) count++
    if (params.has('payment_method')) count++
    if (params.has('payer_type')) count++
    if (params.has('payer_investor')) count++
    // Khoảng ngày là MỘT tiêu chí lọc, dù có mặt cả hai đầu mút.
    if (params.has('receipt_date_after') || params.has('receipt_date_before')) count++
    if (params.has('payer_tax_code')) count++
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

    if (formData.status) newParams.set('status', formData.status)
    if (formData.payment_method) newParams.set('payment_method', formData.payment_method)
    if (formData.payer_type) newParams.set('payer_type', formData.payer_type)
    if (formData.payer_investor) newParams.set('payer_investor', formData.payer_investor)
    if (formData.receipt_date_after) {
      newParams.set('receipt_date_after', formatDateToApi(formData.receipt_date_after))
    }
    if (formData.receipt_date_before) {
      newParams.set('receipt_date_before', formatDateToApi(formData.receipt_date_before))
    }
    if (formData.payer_tax_code) newParams.set('payer_tax_code', formData.payer_tax_code)

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

      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams]
  )

  const handleOpenPostDialog = useCallback((record: ReceiptVoucherList) => {
    setVoucherToPost(record)
    setIsPostDialogOpen(true)
  }, [])

  const totalRecords = listResponse?.count ?? 0
  const pageCount = pageSize ? Math.ceil(totalRecords / pageSize) : 0

  return (
    <>
      <PageTitle
        title="Phiếu thu"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm phiếu thu..."
        searchClassName="!w-[350px]"
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
                // Khoảng ngày cũ thuộc kỳ cũ — giữ lại sẽ nằm ngoài kỳ mới và cho ra 0 dòng.
                newParams.delete('receipt_date_after')
                newParams.delete('receipt_date_before')
                newParams.set('page', '1')
                setSearchParams(newParams, { replace: true })
              }
            }}
          />
        }
        handleCreateNew={
          ability.can('create', 'receiptvoucher')
            ? () => navigate(APP_PATH.RECEIPT_VOUCHER_CREATE)
            : undefined
        }
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <ReceiptVoucherTable
            data={listResponse?.results ?? []}
            isLoading={isLoading}
            error={error}
            totalRecords={totalRecords}
            pageSize={pageSize}
            pageCount={pageCount}
            currentPageIndex={currentPage - 1}
            onPaginationChange={handlePaginationChange}
            onPost={handleOpenPostDialog}
            isShowTableColumnConfig={shouldShowConfig}
            summary={summaryResponse}
            summaryRowCount={summaryResponse?.row_count}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <ReceiptVoucherFilter
            key={`${filterDialogOpenKey}`}
            ref={formRef}
            initialValues={currentFilters}
            minDate={periodBounds.minDate}
            maxDate={periodBounds.maxDate}
          />
        }
        onClearFilter={handleClearFilter}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />

      <PostReceiptVoucherDialog
        voucher={voucherToPost}
        open={isPostDialogOpen}
        onOpenChange={setIsPostDialogOpen}
      />
    </>
  )
}

export default ReceiptVoucherListPage
