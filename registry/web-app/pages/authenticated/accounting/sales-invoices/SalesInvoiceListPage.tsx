import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import { FormProvider, useForm } from 'react-hook-form'
import AppDialog from '@/components/dialog/AppDialog'
import { PageTitle, TextField } from '@/components/ui'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import toastService from '@/services/toast-service'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'

import {
  useSalesInvoices,
  useVoidSalesInvoice,
  useAdjustSalesInvoice,
  SalesInvoice,
  SalesInvoiceAdjustRequest,
  useSalesInvoiceSummary,
} from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import FormController from '@/components/ui/form/FormController'
import SalesInvoiceTable from '@/features/accounting/sales-invoices/components/SalesInvoiceTable'
import IssueSalesInvoiceDialog from '@/features/accounting/sales-invoices/_shares/components/IssueSalesInvoiceDialog'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import SalesInvoiceFilter, {
  SalesInvoiceFilterFormData,
  SalesInvoiceFilterRef,
} from '@/features/accounting/sales-invoices/components/SalesInvoiceFilter'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { SALES_INVOICE_DEFAULT_STATUSES } from '@/features/accounting/_shares/utils/invoice-list-status'

/**
 * Field `ordering` mà `GET /accounting/sales-invoices/` chấp nhận (xem JSDoc của endpoint trong
 * `schema.ts`). Mặc định của BE là `-invoice_date`.
 */
const SORTABLE_ORDERING_FIELDS = ['invoice_date', 'status', 'total_amount']

// Build filters from URL search params
// Exported for tests — cùng cách `ExchangeManagementPage` / `InvestorManagementPage` mở
// `buildApiParamsFromUrl` ra để ghim luật lọc mà không phải render cả trang.
export function buildApiParams(searchParams: URLSearchParams, activePeriodId: number | null) {
  const params: Record<string, unknown> = {
    page: parsePositiveInt(searchParams.get('page')) ?? 1,
    page_size: parsePositiveInt(searchParams.get('page_size')) ?? PAGE_SIZE,
  }

  // Ô Tìm kiếm tra `code · external_invoice_no · customer_name · customer_tax_code` và — từ CR
  // 86eyqrn7k vòng 2 — cả `investor_reconciliation_sheet__code`. Đó là lý do dialog lọc không còn
  // ô "Số hóa đơn thực tế" / "MST khách hàng" / "Phiếu đối chiếu CĐT": xem ghi chú ở
  // `SalesInvoiceFilter`.
  const search = searchParams.get('search') ?? undefined
  if (search) (params as any).search = search.trim()

  // CR STT58 + CR 86eyqrn7k vòng 2: trạng thái là nhóm ô tick, và URL LUÔN mang `status__in` —
  // khởi tạo bằng tập "mọi trạng thái trừ nhóm huỷ" (xem `ensureDefaultStatuses`). Nhờ vậy luật
  // "mặc định ẩn hoá đơn đã huỷ" hiện ra thành các ô tick người dùng nhìn thấy, thay vì chạy ngầm
  // trong FE như bản đầu.
  //
  // Vì luật đã tường minh trên UI nên ở đây KHÔNG còn ngoại lệ nào cho ô Tìm kiếm: nhóm ô tick là
  // nguồn sự thật duy nhất. Gõ mã một hoá đơn đã huỷ mà chưa tick "Đã hủy" thì không ra — nhưng
  // người dùng thấy ngay ô đó đang trống và tự tick. (Bản trước có cờ `isDirectLookup` bỏ qua bộ
  // lọc khi tìm kiếm; giữ nó cùng lúc với ô tick sẽ thành UI nói một đằng, kết quả một nẻo.)
  //
  // Chuỗi RỖNG khác với KHÔNG CÓ param: rỗng = người dùng đã bỏ hết ô tick = xem tất cả, gồm cả
  // hoá đơn huỷ. Không có param = URL chưa khởi tạo, và `ensureDefaultStatuses` sẽ điền tập mặc
  // định. Trộn hai ca này là bấm "Xoá bộ lọc" xong reload lại thấy bộ lọc tự bật lại.
  const statusIn = searchParams.get('status__in')
  const legacyStatus = searchParams.get('status') ?? undefined
  if (statusIn) {
    ;(params as any).status__in = statusIn.split(',')
  } else if (statusIn === null && legacyStatus) {
    // Link chia sẻ kiểu cũ dùng `status` đơn — vẫn tôn trọng.
    ;(params as any).status__in = [legacyStatus]
  }

  if (activePeriodId) (params as any).accounting_period = activePeriodId

  const investorId = searchParams.get('investor') ?? undefined
  if (investorId) (params as any).investor = investorId

  const invoiceDateAfter = searchParams.get('invoice_date_after') ?? undefined
  if (invoiceDateAfter) (params as any).invoice_date_after = invoiceDateAfter

  const invoiceDateBefore = searchParams.get('invoice_date_before') ?? undefined
  if (invoiceDateBefore) (params as any).invoice_date_before = invoiceDateBefore

  const sourceExchange = searchParams.get('source_exchange') ?? undefined
  if (sourceExchange) (params as any).source_exchange = Number(sourceExchange)

  const sourceType = searchParams.get('source_type') ?? undefined
  if (sourceType) (params as any).source_type = sourceType

  // `ordering` trước đây nằm trên URL nhưng KHÔNG được đọc ở đây, nên sort không bao giờ tới
  // server. Lọc theo whitelist: BE chỉ nhận 3 field này, tham số lạ chỉ tổ đẻ ra 400.
  const ordering = searchParams.get('ordering')?.trim()
  if (ordering && SORTABLE_ORDERING_FIELDS.includes(ordering.replace(/^-/, ''))) {
    ;(params as any).ordering = ordering
  }

  return params
}

/**
 * Điền `status__in` mặc định vào URL nếu nó CHƯA hề có mặt.
 *
 * Đây là thứ làm luật "mặc định ẩn hoá đơn đã huỷ" hiện ra thành các ô tick: URL mang sẵn tập
 * trạng thái, nên dialog lọc mở lên là thấy chúng đã tick và badge "Bộ lọc" hiện số.
 *
 * Chỉ điền khi param VẮNG MẶT. Chuỗi rỗng nghĩa là người dùng đã cố ý bỏ hết ô tick — điền đè
 * lên đó là bấm "Xoá bộ lọc" xong bộ lọc tự bật lại.
 */
export function ensureDefaultStatuses(params: URLSearchParams): boolean {
  if (params.has('status__in') || params.has('status')) return false
  params.set('status__in', SALES_INVOICE_DEFAULT_STATUSES.join(','))
  return true
}

/** Exported for tests: hàm này quyết định nhóm ô tick trong dialog hiện tick những gì. */
export function getFilterValues(searchParams: URLSearchParams): SalesInvoiceFilterFormData {
  const data: SalesInvoiceFilterFormData = {}

  const statusIn = searchParams.get('status__in')
  const legacyStatus = searchParams.get('status') ?? undefined
  if (statusIn !== null) {
    // Rỗng -> mảng rỗng -> không ô nào được tick. Đừng dùng `if (statusIn)`: chuỗi rỗng là falsy
    // nên nhánh đó rơi xuống dưới và checkbox lại hiện tick, ngược hẳn thứ người dùng vừa chọn.
    data.status__in = statusIn ? statusIn.split(',') : []
  } else if (legacyStatus) {
    data.status__in = [legacyStatus]
  }

  if (searchParams.has('investor')) data.investor = searchParams.get('investor') ?? undefined
  if (searchParams.has('invoice_date_after')) {
    data.invoice_date_after = parseDateFromApi(searchParams.get('invoice_date_after')) ?? null
  }
  if (searchParams.has('invoice_date_before')) {
    data.invoice_date_before = parseDateFromApi(searchParams.get('invoice_date_before')) ?? null
  }
  if (searchParams.has('source_exchange'))
    data.source_exchange = searchParams.get('source_exchange') ?? undefined
  if (searchParams.has('source_type'))
    data.source_type = searchParams.get('source_type') ?? undefined

  return data
}

export const SalesInvoiceListPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)
  const [shouldShowConfig, setShouldShowConfig] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const formRef = useRef<SalesInvoiceFilterRef>(null)

  // Dialog states for Actions
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null)
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false)
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false)
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)

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

  // RHF for Action Dialogs
  const voidForm = useForm<{ void_reason: string }>({ defaultValues: { void_reason: '' } })
  const adjustForm = useForm<{ external_invoice_no: string; total_amount: string }>({
    defaultValues: { external_invoice_no: '', total_amount: '' },
  })

  // Mutations
  const voidMutation = useVoidSalesInvoice()
  const adjustMutation = useAdjustSalesInvoice()

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
      if (!hasYear || !hasMonth) {
        const defaultPeriod = currentPeriod ?? periods[0]
        if (defaultPeriod) {
          newParams.set('year', String(defaultPeriod.year))
          newParams.set('month', String(defaultPeriod.month))
        }
      }
      // Điền tập trạng thái mặc định vào URL để luật "ẩn hoá đơn đã huỷ" hiện ra thành ô tick.
      ensureDefaultStatuses(newParams)
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
  }, [debouncedSearch, isUrlReady]) // eslint-disable-line react-hooks/exhaustive-deps

  const searchQueryKey = searchParams.toString()

  const apiParams = useMemo(() => {
    if (!isUrlReady || !activePeriodId) return undefined
    return buildApiParams(new URLSearchParams(searchQueryKey), activePeriodId)
  }, [isUrlReady, searchQueryKey, activePeriodId])

  const {
    data: listResponse,
    isLoading,
    error,
    refetch,
  } = useSalesInvoices(apiParams, {
    enabled: isUrlReady && !!apiParams && !!activePeriodId,
  })

  // Totals for the sticky footer. Separate endpoint, fetched in parallel — the table paints
  // as soon as the page arrives and the footer fills in after. Keyed on filters only, so
  // changing page never refetches it.
  // Guard must stay identical to the list query above: if the two ever diverge, the summary
  // can fire without a period filter and briefly show a total across ALL periods.
  const { data: summaryResponse } = useSalesInvoiceSummary(apiParams, {
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

  const activeFilterCount = useMemo(() => {
    const params = new URLSearchParams(searchQueryKey)
    let count = 0
    if (params.has('search')) count++
    // Đếm khi thực sự có ô tick nào đang bật. `status__in` rỗng = người dùng đã bỏ hết tick =
    // không lọc theo trạng thái, nên không tính — dùng `has()` ở đây sẽ đếm cả ca đó.
    if (params.get('status__in') || params.get('status')) count++
    if (params.has('investor')) count++
    // Khoảng ngày là MỘT tiêu chí lọc, dù có mặt cả hai đầu mút.
    if (params.has('invoice_date_after') || params.has('invoice_date_before')) count++
    if (params.has('source_exchange')) count++
    if (params.has('source_type')) count++
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

    // LUÔN ghi `status__in`, kể cả khi rỗng. Chuỗi rỗng là cách duy nhất nói "người dùng đã cố ý
    // bỏ hết ô tick" — bỏ hẳn key đi thì `ensureDefaultStatuses` coi là URL chưa khởi tạo và điền
    // lại tập mặc định, tức bấm "Xoá bộ lọc" xong bộ lọc tự bật lại.
    newParams.set('status__in', (formData.status__in ?? []).join(','))
    if (formData.investor) newParams.set('investor', formData.investor)
    if (formData.invoice_date_after)
      newParams.set('invoice_date_after', formatDateToApi(formData.invoice_date_after))
    if (formData.invoice_date_before)
      newParams.set('invoice_date_before', formatDateToApi(formData.invoice_date_before))
    if (formData.source_exchange) newParams.set('source_exchange', formData.source_exchange)
    if (formData.source_type) newParams.set('source_type', formData.source_type)

    const yearParam = searchParams.get('year')
    if (yearParam) newParams.set('year', yearParam)
    const monthParam = searchParams.get('month')
    if (monthParam) newParams.set('month', monthParam)

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  const currentOrdering = searchParams.get('ordering') ?? undefined

  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (!field || !direction) {
        // Bỏ sort → về mặc định của BE (`-invoice_date`), không giữ lại param rỗng.
        newParams.delete('ordering')
      } else {
        newParams.set('ordering', direction === 'desc' ? `-${field}` : field)
      }
      // Đổi thứ tự thì trang cũ vô nghĩa — về trang 1.
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

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
  const pageCount = pageSize ? Math.ceil(totalRecords / pageSize) : 0

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/sales-invoices/export/',
    'hoa-don-ban-ra.xlsx'
  )
  const handleExport = useCallback(() => {
    if (!apiParams) return
    const { page: _page, page_size: _pageSize, ...filters } = apiParams as Record<string, unknown>
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  /* const summaryData = useMemo(() => {
    const results = listResponse?.results || []
    const amountBeforeTax = results.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
    const taxAmount = results.reduce((sum, item) => sum + Number(item.vat_amount || 0), 0)
    const totalAmount = results.reduce(
      (sum, item) => sum + Number(item.total_amount_with_vat || 0),
      0
    )
    return { totalAmount, amountBeforeTax, taxAmount }
  }, [listResponse]) */

  // Action callback handlers
  const handleIssueClick = (record: SalesInvoice) => {
    setSelectedInvoice(record)
    setIsIssueDialogOpen(true)
  }

  const handleVoidClick = (record: SalesInvoice) => {
    setSelectedInvoice(record)
    voidForm.reset({ void_reason: '' })
    setIsVoidDialogOpen(true)
  }

  const handleAdjustClick = (record: SalesInvoice) => {
    setSelectedInvoice(record)
    adjustForm.reset({
      external_invoice_no: '',
      total_amount: String(record.total_amount || ''),
    })
    setIsAdjustDialogOpen(true)
  }

  const onConfirmVoid = async () => {
    if (!selectedInvoice) return
    const values = voidForm.getValues()
    if (!values.void_reason) {
      voidForm.setError('void_reason', { message: 'Vui lòng nhập lý do hủy hóa đơn!' })
      return
    }

    try {
      await voidMutation.mutateAsync({
        id: selectedInvoice.id,
        data: {
          reason: values.void_reason,
        },
      })
      toastService.success('Hủy hóa đơn thành công!')
      setIsVoidDialogOpen(false)
      refetch()
    } catch (err: any) {
      toastService.error(err?.message || 'Có lỗi xảy ra khi hủy hóa đơn!')
    }
  }

  const onConfirmAdjust = async () => {
    if (!selectedInvoice) return
    const values = adjustForm.getValues()
    if (!values.external_invoice_no) {
      adjustForm.setError('external_invoice_no', { message: 'Vui lòng nhập số hóa đơn!' })
      return
    }
    if (!values.total_amount) {
      adjustForm.setError('total_amount', { message: 'Vui lòng nhập số tiền điều chỉnh!' })
      return
    }

    try {
      await adjustMutation.mutateAsync({
        id: selectedInvoice.id,
        data: {
          invoice_date: selectedInvoice.invoice_date,
          total_amount: values.total_amount,
        } as SalesInvoiceAdjustRequest,
      })
      toastService.success('Điều chỉnh hóa đơn thành công!')
      setIsAdjustDialogOpen(false)
      refetch()
    } catch (err: any) {
      toastService.error(err?.message || 'Có lỗi xảy ra khi điều chỉnh hóa đơn!')
    }
  }

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
        title="Hóa đơn bán ra"
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
          ability.can('create', 'salesinvoice')
            ? () => {
                const createParams = new URLSearchParams()
                if (year) createParams.set('year', String(year))
                if (month) createParams.set('month', String(month))
                const query = createParams.toString()
                navigate(
                  query
                    ? `${APP_PATH.SALES_INVOICE_CREATE}?${query}`
                    : APP_PATH.SALES_INVOICE_CREATE
                )
              }
            : undefined
        }
        titleCreateNew="Thêm mới"
      />

      <div className="border-b border-gray-200 bg-white px-7 pb-4">
        <span className="text-sm text-gray-500">
          Mỗi đối chiếu CĐT sinh ra 1 hóa đơn bán ra (quan hệ 1-1)
        </span>
      </div>

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        {/* <div className="px-7">
          <div className="flex flex-wrap justify-start overflow-hidden rounded-lg border border-gray-200 bg-white">
            <SummaryCard label="Số HĐ" value={totalRecords} />
            <SummaryCard
              label="Tổng tiền hàng"
              value={formatCurrencyVND(Math.round(summaryData.amountBeforeTax))}
            />
            <SummaryCard
              label="Tổng VAT"
              value={formatCurrencyVND(Math.round(summaryData.taxAmount))}
            />
            <SummaryCard
              label="Tổng cộng"
              value={formatCurrencyVND(Math.round(summaryData.totalAmount))}
              color="text-blue-600"
            />
          </div>
        </div> */}

        <div className="flex-1 overflow-x-auto overflow-y-auto pb-10">
          <SalesInvoiceTable
            data={listResponse?.results ?? []}
            isLoading={isLoading}
            error={error}
            totalRecords={totalRecords}
            pageSize={pageSize}
            pageCount={pageCount}
            currentPageIndex={currentPage - 1}
            onPaginationChange={handlePaginationChange}
            ordering={currentOrdering}
            onSortingChange={handleSortingChange}
            onIssue={handleIssueClick}
            onVoid={handleVoidClick}
            onAdjust={handleAdjustClick}
            isShowTableColumnConfig={shouldShowConfig}
            summary={summaryResponse}
            summaryRowCount={summaryResponse?.row_count}
          />
        </div>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <SalesInvoiceFilter
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

      {/* ── Issue Sales Invoice Dialog ── */}
      <IssueSalesInvoiceDialog
        open={isIssueDialogOpen}
        onOpenChange={setIsIssueDialogOpen}
        invoice={selectedInvoice}
        onIssued={refetch}
      />

      {/* ── Void Sales Invoice Dialog ── */}
      <AppDialog
        variant="custom"
        isHideCancelButton={false}
        onCancel={() => setIsVoidDialogOpen(false)}
        open={isVoidDialogOpen}
        onOpenChange={setIsVoidDialogOpen}
        title="Hủy hóa đơn bán ra"
        content={
          <div className="flex min-w-[400px] flex-col gap-4 py-4">
            <p className="text-sm text-gray-500">
              Vui lòng nhập lý do hủy hóa đơn đỏ{' '}
              <span className="font-semibold text-gray-800">{selectedInvoice?.code}</span>.
            </p>
            <FormProvider {...voidForm}>
              <FormController
                control={voidForm.control}
                register={voidForm.register}
                name="void_reason"
                Field={TextField}
                fieldProps={{
                  label: 'Lý do hủy',
                  placeholder: 'Nhập lý do hủy hóa đơn...',
                  required: true,
                }}
              />
            </FormProvider>
          </div>
        }
        onConfirm={onConfirmVoid}
        confirmText="Hủy hóa đơn"
      />

      {/* ── Adjust Sales Invoice Dialog ── */}
      <AppDialog
        variant="custom"
        isHideCancelButton={false}
        onCancel={() => setIsAdjustDialogOpen(false)}
        open={isAdjustDialogOpen}
        onOpenChange={setIsAdjustDialogOpen}
        title="Điều chỉnh hóa đơn"
        content={
          <div className="flex min-w-[400px] flex-col gap-4 py-4">
            <p className="text-sm text-gray-500">
              Tạo hóa đơn điều chỉnh thay thế cho hóa đơn{' '}
              <span className="font-semibold text-gray-800">{selectedInvoice?.code}</span>.
            </p>
            <FormProvider {...adjustForm}>
              <div className="flex flex-col gap-4">
                <FormController
                  control={adjustForm.control}
                  register={adjustForm.register}
                  name="external_invoice_no"
                  Field={TextField}
                  fieldProps={{
                    label: 'Số hóa đơn mới',
                    placeholder: 'Nhập số hóa đơn đỏ...',
                    required: true,
                  }}
                />
                <FormController
                  control={adjustForm.control}
                  register={adjustForm.register}
                  name="total_amount"
                  Field={TextField}
                  fieldProps={{
                    label: 'Giá trị điều chỉnh (VND)',
                    type: 'number',
                    placeholder: 'Nhập tổng số tiền điều chỉnh...',
                    required: true,
                  }}
                />
              </div>
            </FormProvider>
          </div>
        }
        onConfirm={onConfirmAdjust}
        confirmText="Xác nhận điều chỉnh"
      />
    </div>
  )
}

export default SalesInvoiceListPage
