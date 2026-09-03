import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import InvestorInvoiceReconciliationReportTable from '@/features/report/accounting/investor-invoice-reconciliation/InvestorInvoiceReconciliationReportTable'
import {
  useInvestorInvoiceReconciliationReport,
  useInvestorInvoiceReconciliationSummary,
} from '@/features/accounting/reports/services/report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import InvestorInvoiceReconciliationFilter, {
  type InvestorInvoiceReconciliationFilterFormData,
  type InvestorInvoiceReconciliationFilterRef,
} from '@/features/report/accounting/investor-invoice-reconciliation/InvestorInvoiceReconciliationFilter'
import {
  HAS_REMAINING_ON,
  HAS_REMAINING_PARAM,
  parseHasRemaining,
} from '@/features/report/accounting/investor-invoice-reconciliation/investor-invoice-reconciliation-filters'
import { parsePositiveInt } from '@/utils/common'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'

export default function ReportInvestorInvoiceReconciliationPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)

  const formRef = useRef<InvestorInvoiceReconciliationFilterRef>(null)

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Sync only page/page_size defaults — the report no longer filters by accounting period.
  useEffect(() => {
    const actualUrlParams = new URLSearchParams(window.location.search)
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else {
      setIsUrlReady(true)
    }
  }, [searchParams, setSearchParams])

  // Parse filters from URL. Deposit-contract sign-date window is optional (default = no filter).
  const filters = useMemo(() => {
    const project = searchParams.get('project')
    const investor = searchParams.get('investor')
    const deal = searchParams.get('deal')
    const contractDateFrom = searchParams.get('contract_date_from')
    const contractDateTo = searchParams.get('contract_date_to')
    const transactionSheetDateFrom = searchParams.get('transaction_sheet_date_from')
    const transactionSheetDateTo = searchParams.get('transaction_sheet_date_to')
    const hasRemaining = parseHasRemaining(searchParams)

    return {
      project: project ? Number(project) : undefined,
      investor: investor ? Number(investor) : undefined,
      deal: deal ? Number(deal) : undefined,
      contract_date_from: contractDateFrom || undefined,
      contract_date_to: contractDateTo || undefined,
      transaction_sheet_date_from: transactionSheetDateFrom || undefined,
      transaction_sheet_date_to: transactionSheetDateTo || undefined,
      // `undefined` chứ không phải `false` khi tắt: openapi-fetch bỏ hẳn key undefined, nên
      // URL request giữ nguyên hình dạng cũ và cache React Query của mọi màn đang mở không
      // bị đổi key chỉ vì thêm một cờ luôn tắt.
      has_remaining: hasRemaining || undefined,
    }
  }, [searchParams])

  // The endpoint paginates units server-side, so page/page_size must travel with the
  // request — without them every page refetched page 1 and units past the first page
  // were unreachable. Kept out of `filters` so the export (all units, unpaginated)
  // never inherits a page window.
  const queryParams = useMemo(
    () => ({ ...filters, page: currentPage, page_size: pageSize }),
    [filters, currentPage, pageSize]
  )

  // Fetch report data
  const { data, isLoading } = useInvestorInvoiceReconciliationReport(queryParams, {
    enabled: isUrlReady,
  })

  // Totals for the sticky footer. Deliberately a separate, heavier endpoint — it builds every
  // row of the filtered set — so it runs in parallel and the table paints without waiting.
  // Keyed on `filters` (no page window), so paging never re-runs it.
  const { data: summaryResponse } = useInvestorInvoiceReconciliationSummary(filters, {
    enabled: isUrlReady,
  })

  // Export report
  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/reports/investor-invoice-reconciliation/',
    'doi-soat-hoa-don-cdt.xlsx'
  )

  const handleExport = useCallback(() => {
    openExportDialog(filters)
  }, [filters, openExportDialog])

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

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchParams.has('project')) count++
    if (searchParams.has('investor')) count++
    if (searchParams.has('deal')) count++
    if (searchParams.has('contract_date_from')) count++
    if (searchParams.has('contract_date_to')) count++
    if (searchParams.has('transaction_sheet_date_from')) count++
    if (searchParams.has('transaction_sheet_date_to')) count++
    // Đếm khi BẬT chứ không phải khi param có mặt: `?has_remaining=false` không cắt dòng nào
    // nên badge cộng thêm 1 sẽ nói dối người dùng về số tiêu chí đang lọc.
    if (parseHasRemaining(searchParams)) count++
    return count
  }, [searchParams])

  const currentFilters: InvestorInvoiceReconciliationFilterFormData = useMemo(
    () => ({
      project: searchParams.get('project') ?? undefined,
      investor: searchParams.get('investor') ?? undefined,
      deal: searchParams.get('deal') ?? undefined,
      contract_date_from: searchParams.get('contract_date_from') ?? undefined,
      contract_date_to: searchParams.get('contract_date_to') ?? undefined,
      transaction_sheet_date_from: searchParams.get('transaction_sheet_date_from') ?? undefined,
      transaction_sheet_date_to: searchParams.get('transaction_sheet_date_to') ?? undefined,
      has_remaining: parseHasRemaining(searchParams),
    }),
    [searchParams]
  )

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

    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', '1')

    if (formData.project) newParams.set('project', formData.project)
    else newParams.delete('project')

    if (formData.investor) newParams.set('investor', formData.investor)
    else newParams.delete('investor')

    if (formData.deal) newParams.set('deal', formData.deal)
    else newParams.delete('deal')

    if (formData.contract_date_from)
      newParams.set('contract_date_from', formData.contract_date_from)
    else newParams.delete('contract_date_from')

    if (formData.contract_date_to) newParams.set('contract_date_to', formData.contract_date_to)
    else newParams.delete('contract_date_to')

    if (formData.transaction_sheet_date_from)
      newParams.set('transaction_sheet_date_from', formData.transaction_sheet_date_from)
    else newParams.delete('transaction_sheet_date_from')

    if (formData.transaction_sheet_date_to)
      newParams.set('transaction_sheet_date_to', formData.transaction_sheet_date_to)
    else newParams.delete('transaction_sheet_date_to')

    // Chỉ ghi khi BẬT: tắt = xoá param, nên URL mặc định không dài thêm và không cần effect
    // nào seed giá trị mặc định.
    if (formData.has_remaining) newParams.set(HAS_REMAINING_PARAM, HAS_REMAINING_ON)
    else newParams.delete(HAS_REMAINING_PARAM)

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="20.16 Đối chiếu chi tiết căn"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnIcon={handleExport}
      />
      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-0">
          <InvestorInvoiceReconciliationReportTable
            data={data}
            isLoading={isLoading}
            pageSize={pageSize}
            currentPageIndex={currentPage - 1}
            onPaginationChange={handlePaginationChange}
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
          <InvestorInvoiceReconciliationFilter
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
