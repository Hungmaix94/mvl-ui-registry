import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageTitle from '@/components/ui/page-title/PageTitle'
import { Button } from '@/components/ui/button'
import AppDialog from '@/components/dialog/AppDialog'
import IncomeByRecipientTable from '@/features/report/accounting/income-by-recipient/IncomeByRecipientTable'
import IncomeByRecipientSummaryCards from '@/features/report/accounting/income-by-recipient/IncomeByRecipientSummaryCards'
import IncomeByRecipientFilter, {
  type IncomeByRecipientFilterRef,
} from '@/features/report/accounting/income-by-recipient/IncomeByRecipientFilter'
import {
  buildFilterSearchParams,
  countActiveOrgFilters,
  parseOrgFilters,
  type ReportFilterPatch,
} from '@/features/report/accounting/income-by-recipient/income-by-recipient-filters'

import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { useIncomeByRecipientReport } from '@/features/accounting/reports/services/report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { parsePositiveInt } from '@/utils/common'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { IconDownload } from '@/assets/icons'

export default function ReportCommissionByRecipientPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const filterFormRef = useRef<IncomeByRecipientFilterRef>(null)

  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const { data: allPeriods } = useAllAccountingPeriods()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))

  const q = searchParams.get('q') || ''

  // Khoá theo chuỗi query: `searchParams` là instance mới mỗi render nên memo theo chính nó
  // không bao giờ hit.
  const searchQueryKey = searchParams.toString()

  // Một nguồn duy nhất, đã lọc sạch giá trị lạ, cho cả ba nơi: params gửi API, giá trị seed lại
  // vào dialog, và badge đếm.
  const orgFilters = useMemo(
    () => parseOrgFilters(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const activePeriodId = useMemo(() => {
    if (year && month) {
      return periods.find((p) => p.year === year && p.month === month)?.id || null
    }
    return null
  }, [periods, year, month])

  // Sync year and month query parameters on mount
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

  const filters = useMemo(() => {
    return {
      year: year || undefined,
      month: month || undefined,
      branch: orgFilters.branch ?? undefined,
      block: orgFilters.block ?? undefined,
      department: orgFilters.department ?? undefined,
      q: q || undefined,
    }
  }, [year, month, orgFilters, q])

  const { data, isLoading } = useIncomeByRecipientReport(filters, {
    enabled: isUrlReady && !!filters.year && !!filters.month,
  })

  const { openExportDialog, isExporting } = useAccountingListExport(
    '/api/accounting/reports/income-by-recipient/',
    'thu-nhap-theo-nguoi-nhan.xlsx'
  )

  const handleExport = useCallback(() => {
    openExportDialog(filters)
  }, [filters, openExportDialog])

  const rows = useMemo(() => data?.results || [], [data])

  // Endpoint không phân trang: nó trả CẢ bộ lọc trong một lượt, trang tự cắt lát để hiển thị.
  // Vì vậy `rows.length` mới là tổng thật, còn `paginatedRows.length` chỉ là số dòng của trang.
  const totalRecords = rows.length
  const pageCount = pageSize ? Math.ceil(totalRecords / pageSize) : 0

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return rows.slice(start, end)
  }, [rows, currentPage, pageSize])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.gross += Number(row.gross || 0)
        acc.bhxh += Number(row.bhxh || 0)
        acc.pit += Number(row.pit || 0)
        acc.net += Number(row.net || 0)
        acc.commission_actual_paid += Number(row.commission_actual_paid || 0)
        acc.ytd_gross += Number(row.ytd_gross || 0)
        acc.ytd_bhxh += Number(row.ytd_bhxh || 0)
        acc.ytd_pit += Number(row.ytd_pit || 0)
        acc.ytd_net += Number(row.ytd_net || 0)
        acc.ytd_commission_actual_paid += Number(row.ytd_commission_actual_paid || 0)
        return acc
      },
      {
        gross: 0,
        bhxh: 0,
        pit: 0,
        net: 0,
        commission_actual_paid: 0,
        ytd_gross: 0,
        ytd_bhxh: 0,
        ytd_pit: 0,
        ytd_net: 0,
        ytd_commission_actual_paid: 0,
      }
    )
  }, [rows])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const nextPage = pageIndex + 1
      if (nextPage === currentPage && newPageSize === pageSize) return

      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(nextPage))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [currentPage, pageSize, searchParams, setSearchParams]
  )

  const patchFilterParams = useCallback(
    (changes: ReportFilterPatch) => {
      setSearchParams(buildFilterSearchParams(searchParams, changes), { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // ── Bộ lọc đơn vị (dialog) ─────────────────────────────────────────────────
  const activeFilterCount = useMemo(
    () => countActiveOrgFilters(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const handleOpenFilterDialog = useCallback(() => setIsFilterDialogOpen(true), [])

  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    // Patch cả ba cấp một lượt: set lẻ từng key sẽ có nhịp URL trung gian giữ cặp lệch
    // (vd chi nhánh A + phòng ban của chi nhánh B) và bắn một query rác.
    patchFilterParams({
      branch: formData.branch ?? null,
      block: formData.block ?? null,
      department: formData.department ?? null,
    })
    setIsFilterDialogOpen(false)
  }, [patchFilterParams])

  // ── Tìm người nhận (ngoài dialog) ──────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(q)
  useEffect(() => {
    setSearchInput(q)
  }, [q])
  useEffect(() => {
    const handler = setTimeout(() => {
      const next = searchInput.trim()
      if (next !== q) patchFilterParams({ q: next || null })
    }, 400)
    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="21.10 Tổng thu nhập theo người thực nhận"
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
        handleSearch={(value: string) => setSearchInput(value)}
        searchPlaceholder="Tìm theo tên hoặc mã người nhận"
        searchClassName="!w-[280px]"
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        customActions={
          <Button
            variant="secondary"
            size="small"
            leftIcon={<IconDownload />}
            onClick={handleExport}
            disabled={isLoading || isExporting || !rows.length}
            loading={isExporting}
          >
            Xuất Excel
          </Button>
        }
      />

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        {/* Summaries */}
        <div className="px-7">
          <IncomeByRecipientSummaryCards
            gross={totals.gross}
            net={totals.net}
            commissionActualPaid={totals.commission_actual_paid}
            isLoading={isLoading}
          />
        </div>

        {/* Data Table — wrapper này là scroll container thật (header sticky và thanh kéo ngang
            đều bám theo nó); `Table` tự tắt overflow bên trong bằng `disableInnerOverflow`. */}
        <div className="flex-1 overflow-x-auto overflow-y-auto pt-0 pb-0">
          <IncomeByRecipientTable
            rows={paginatedRows}
            totals={totals}
            isLoading={isLoading}
            pageSize={pageSize}
            totalRecords={totalRecords}
            pageCount={pageCount}
            currentPageIndex={currentPage - 1}
            onPaginationChange={handlePaginationChange}
          />
        </div>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <IncomeByRecipientFilter
            ref={filterFormRef}
            initialValues={orgFilters}
            isOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={handleClearFilter}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}
