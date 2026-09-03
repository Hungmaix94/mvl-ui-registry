import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'

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
  useInputInvoices,
  type InputInvoice,
  useInputInvoiceSummary,
} from '@/features/accounting/input-invoices/services/input-invoice-service'
import InputInvoiceTable from '@/features/accounting/input-invoices/components/InputInvoiceTable'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { MarkReceiveInputInvoiceDialog } from '@/features/accounting/input-invoices/components/MarkReceiveInputInvoiceDialog'
import { VerifyInputInvoiceDialog } from '@/features/accounting/input-invoices/components/VerifyInputInvoiceDialog'
import InputInvoiceFilter, {
  type InputInvoiceFilterFormData,
  type InputInvoiceFilterRef,
} from '@/features/accounting/input-invoices/components/InputInvoiceFilter'
import { INPUT_INVOICE_DEFAULT_STATUSES } from '@/features/accounting/_shares/utils/invoice-list-status'

// ── Helpers ──────────────────────────────────────────────────────────────────

// Exported for tests — cùng cách `ExchangeManagementPage` / `InvestorManagementPage` mở
// `buildApiParamsFromUrl` ra để ghim luật lọc mà không phải render cả trang.
export function buildApiParams(searchParams: URLSearchParams, activePeriodId: number | null) {
  const params: Record<string, unknown> = {
    page: parsePositiveInt(searchParams.get('page')) ?? 1,
    page_size: parsePositiveInt(searchParams.get('page_size')) ?? PAGE_SIZE,
  }

  // Ô Tìm kiếm tra `code · supplier_name · external_invoice_no · seller_name · seller_tax_code`
  // và — từ CR 86eyqrn7k vòng 2 — cả `f2_reconciliation_sheet__code`. Đó là lý do dialog lọc
  // không còn ô "Số hóa đơn thực tế" / "Mã số thuế": xem ghi chú ở `InputInvoiceFilter`.
  const search = searchParams.get('search') ?? undefined
  if (search) (params as any).search = search.trim()

  // CR STT58 + CR 86eyqrn7k vòng 2: trạng thái là nhóm ô tick và URL LUÔN mang `status__in`,
  // khởi tạo bằng tập "mọi trạng thái trừ Đã huỷ" (`ensureDefaultStatuses`). Luật "mặc định ẩn
  // hoá đơn đã huỷ" nhờ đó hiện ra thành ô tick người dùng nhìn thấy, thay vì chạy ngầm trong FE.
  //
  // Nhóm ô tick là nguồn sự thật DUY NHẤT — không còn ngoại lệ cho ô Tìm kiếm như bản đầu. Xem
  // ghi chú đầy đủ ở `SalesInvoiceListPage`, hai màn cố ý giống hệt nhau ở luật này.
  //
  // Chuỗi RỖNG ≠ KHÔNG CÓ param: rỗng = đã bỏ hết ô tick = xem tất cả; vắng mặt = URL chưa khởi
  // tạo. Trộn hai ca là bấm "Xoá bộ lọc" xong reload lại thấy bộ lọc tự bật lại.
  const statusIn = searchParams.get('status__in')
  const legacyStatus = searchParams.get('status') ?? undefined
  if (statusIn) {
    ;(params as any).status__in = statusIn.split(',')
  } else if (statusIn === null && legacyStatus) {
    // Link chia sẻ kiểu cũ dùng `status` đơn — vẫn tôn trọng.
    ;(params as any).status = legacyStatus
  }

  if (activePeriodId) (params as any).accounting_period = activePeriodId

  const investorId = searchParams.get('investor') ?? undefined
  if (investorId) (params as any).investor = investorId

  const collaborator = searchParams.get('collaborator') ?? undefined
  if (collaborator) (params as any).collaborator = Number(collaborator)

  const counterpartyType = searchParams.get('counterparty_type') ?? undefined
  if (counterpartyType) (params as any).counterparty_type = counterpartyType

  const exchange = searchParams.get('exchange') ?? undefined
  if (exchange) (params as any).exchange = Number(exchange)

  const invoiceDateAfter = searchParams.get('invoice_date_after') ?? undefined
  if (invoiceDateAfter) (params as any).invoice_date_after = invoiceDateAfter

  const invoiceDateBefore = searchParams.get('invoice_date_before') ?? undefined
  if (invoiceDateBefore) (params as any).invoice_date_before = invoiceDateBefore

  return params
}

/**
 * Điền `status__in` mặc định vào URL nếu nó CHƯA hề có mặt — xem ghi chú cùng tên ở
 * `SalesInvoiceListPage`. Chỉ điền khi param vắng mặt; chuỗi rỗng là lựa chọn cố ý của người dùng.
 */
export function ensureDefaultStatuses(params: URLSearchParams): boolean {
  if (params.has('status__in') || params.has('status')) return false
  params.set('status__in', INPUT_INVOICE_DEFAULT_STATUSES.join(','))
  return true
}

/** Exported for tests: hàm này quyết định nhóm ô tick trong dialog hiện tick những gì. */
export function getFilterValues(searchParams: URLSearchParams): InputInvoiceFilterFormData {
  const data: InputInvoiceFilterFormData = {}

  const statusIn = searchParams.get('status__in')
  const legacyStatus = searchParams.get('status') ?? undefined
  if (statusIn !== null) {
    // Rỗng -> mảng rỗng -> không ô nào được tick. `if (statusIn)` sẽ sai: chuỗi rỗng là falsy.
    data.status__in = statusIn ? statusIn.split(',') : []
  } else if (legacyStatus) {
    data.status__in = [legacyStatus]
  }
  // accounting_period is handled globally via year/month URL parameters

  if (searchParams.has('investor')) data.investor = searchParams.get('investor') ?? undefined
  if (searchParams.has('collaborator'))
    data.collaborator = searchParams.get('collaborator') ?? undefined
  if (searchParams.has('counterparty_type'))
    data.counterparty_type = searchParams.get('counterparty_type') ?? undefined
  if (searchParams.has('exchange')) data.exchange = searchParams.get('exchange') ?? undefined
  if (searchParams.has('invoice_date_after')) {
    data.invoice_date_after = parseDateFromApi(searchParams.get('invoice_date_after')) ?? null
  }
  if (searchParams.has('invoice_date_before')) {
    data.invoice_date_before = parseDateFromApi(searchParams.get('invoice_date_before')) ?? null
  }

  return data
}

// ── Component ─────────────────────────────────────────────────────────────────

export const InputInvoiceListPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()

  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)
  const [shouldShowConfig, setShouldShowConfig] = useState(false)

  // Dialog Nhận/Xác nhận hóa đơn — mở tại chỗ trên DS (bug 86exuvbwu)
  const [selectedRecord, setSelectedRecord] = useState<InputInvoice | null>(null)
  const [isMarkReceiveOpen, setIsMarkReceiveOpen] = useState(false)
  const [isVerifyOpen, setIsVerifyOpen] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const formRef = useRef<InputInvoiceFilterRef>(null)

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

  // ── Init URL params ────────────────────────────────────────────────────────
  useEffect(() => {
    if (periods.length === 0 || isLoadingCurrent) return

    const actualUrlParams = new URLSearchParams(window.location.search)
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')
    const hasYear = searchParams.has('year') || actualUrlParams.has('year')
    const hasMonth = searchParams.has('month') || actualUrlParams.has('month')

    const hasStatus =
      searchParams.has('status__in') ||
      searchParams.has('status') ||
      actualUrlParams.has('status__in') ||
      actualUrlParams.has('status')

    if (!hasPage || !hasPageSize || !hasYear || !hasMonth || !hasStatus) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      ensureDefaultStatuses(newParams)
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

  // ── Sync search input with URL ─────────────────────────────────────────────
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
  }, [debouncedSearch, isUrlReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset trigger after a short delay to allow dialog to open
  useEffect(() => {
    if (shouldShowConfig) {
      const timer = setTimeout(() => {
        setShouldShowConfig(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldShowConfig])

  // ── API ───────────────────────────────────────────────────────────────────
  const searchQueryKey = searchParams.toString()

  const apiParams = useMemo(() => {
    if (!isUrlReady || !activePeriodId) return undefined
    return buildApiParams(new URLSearchParams(searchQueryKey), activePeriodId)
  }, [isUrlReady, searchQueryKey, activePeriodId])

  const {
    data: listResponse,
    isLoading,
    error,
  } = useInputInvoices(apiParams, {
    enabled: isUrlReady && !!apiParams && !!activePeriodId,
  })

  // Totals for the sticky footer. Separate endpoint, fetched in parallel — the table paints
  // as soon as the page arrives and the footer fills in after. Keyed on filters only, so
  // changing page never refetches it.
  // Guard must stay identical to the list query above: if the two ever diverge, the summary
  // can fire without a period filter and briefly show a total across ALL periods.
  const { data: summaryResponse } = useInputInvoiceSummary(apiParams, {
    enabled: isUrlReady && !!apiParams && !!activePeriodId,
  })

  // ── Pagination ────────────────────────────────────────────────────────────
  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const totalRecords = listResponse?.count ?? 0
  const pageCount = pageSize ? Math.ceil(totalRecords / pageSize) : 0

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/input-invoices/export/',
    'hoa-don-dau-vao.xlsx'
  )
  const handleExport = useCallback(() => {
    if (!apiParams) return
    const { page: _page, page_size: _pageSize, ...filters } = apiParams as Record<string, unknown>
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  // ── Filter state ──────────────────────────────────────────────────────────
  const currentFilters = useMemo(
    () => getFilterValues(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const activeFilterCount = useMemo(() => {
    const params = new URLSearchParams(searchQueryKey)
    let count = 0
    // Đếm khi thực sự có ô tick nào bật. `status__in` rỗng = đã bỏ hết tick = không lọc.
    if (params.get('status__in') || params.get('status')) count++
    if (params.has('investor')) count++
    if (params.has('collaborator')) count++
    if (params.has('counterparty_type')) count++
    if (params.has('exchange')) count++
    // Khoảng ngày là MỘT tiêu chí lọc, dù có mặt cả hai đầu mút.
    if (params.has('invoice_date_after') || params.has('invoice_date_before')) count++
    return count
  }, [searchQueryKey])

  // ── Handlers ──────────────────────────────────────────────────────────────

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

    // LUÔN ghi `status__in`, kể cả rỗng — xem ghi chú cùng nội dung ở `SalesInvoiceListPage`.
    newParams.set('status__in', (formData.status__in ?? []).join(','))
    if (formData.investor) newParams.set('investor', formData.investor)
    if (formData.collaborator) newParams.set('collaborator', formData.collaborator)
    if (formData.counterparty_type) newParams.set('counterparty_type', formData.counterparty_type)
    if (formData.exchange) newParams.set('exchange', formData.exchange)
    if (formData.invoice_date_after) {
      newParams.set('invoice_date_after', formatDateToApi(formData.invoice_date_after))
    }
    if (formData.invoice_date_before) {
      newParams.set('invoice_date_before', formatDateToApi(formData.invoice_date_before))
    }

    const yearParam = searchParams.get('year')
    if (yearParam) newParams.set('year', yearParam)
    const monthParam = searchParams.get('month')
    if (monthParam) newParams.set('month', monthParam)

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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Hóa đơn đầu vào"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Mã HĐ, số HĐ thực tế, MST, mã phiếu đối chiếu..."
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
                newParams.delete('invoice_date_after')
                newParams.delete('invoice_date_before')
                newParams.set('page', '1')
                setSearchParams(newParams, { replace: true })
              }
            }}
          />
        }
        handleCreateNew={
          ability.can('create', 'inputinvoice')
            ? () => navigate(APP_PATH.INPUT_INVOICE_CREATE)
            : undefined
        }
        titleCreateNew="Thêm mới"
      />

      {/* ── Table ── */}
      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto pb-10">
          <InputInvoiceTable
            data={listResponse?.results ?? []}
            isLoading={isLoading}
            error={error}
            totalRecords={totalRecords}
            pageSize={pageSize}
            pageCount={pageCount}
            currentPageIndex={currentPage - 1}
            onPaginationChange={handlePaginationChange}
            onMarkReceived={(record) => {
              setSelectedRecord(record)
              setIsMarkReceiveOpen(true)
            }}
            onVerify={(record) => {
              setSelectedRecord(record)
              setIsVerifyOpen(true)
            }}
            isShowTableColumnConfig={shouldShowConfig}
            summary={summaryResponse}
            summaryRowCount={summaryResponse?.row_count}
          />
        </div>
      </div>

      {/* ── Dialog Nhận hóa đơn / Xác nhận hóa đơn (mở tại chỗ) ── */}
      <MarkReceiveInputInvoiceDialog
        record={selectedRecord}
        open={isMarkReceiveOpen}
        onOpenChange={setIsMarkReceiveOpen}
      />
      <VerifyInputInvoiceDialog
        record={selectedRecord}
        open={isVerifyOpen}
        onOpenChange={setIsVerifyOpen}
      />

      {/* ── Filter dialog ── */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <InputInvoiceFilter
            key={`${filterDialogOpenKey}`}
            ref={formRef}
            initialValues={currentFilters}
            isOpen={isFilterDialogOpen}
            minDate={periodBounds.minDate}
            maxDate={periodBounds.maxDate}
          />
        }
        onClearFilter={handleClearFilter}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </div>
  )
}

export default InputInvoiceListPage
