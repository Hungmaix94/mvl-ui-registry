import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import ProjectReceivableReportTable from '@/features/report/accounting/project-receivable/ProjectReceivableReportTable'
import ProjectReceivableFilter, {
  type ProjectReceivableFilterRef,
} from '@/features/report/accounting/project-receivable/ProjectReceivableFilter'
import {
  buildProjectReceivableFilterParams,
  countActiveProjectReceivableFilters,
  parseProjectReceivableFilters,
} from '@/features/report/accounting/project-receivable/project-receivable-filters'
import {
  useProjectReceivableReport,
  useImportProjectReceivableProjections,
} from '@/features/accounting/reports/services/report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { parsePositiveInt } from '@/utils/common'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { QUERY_KEYS } from '@/constants'
import toastService from '@/services/toast-service'

export default function ReportProjectReceivablePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const filterFormRef = useRef<ProjectReceivableFilterRef>(null)

  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const { data: allPeriods } = useAllAccountingPeriods()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))

  // Khoá theo chuỗi query: `searchParams` là instance mới mỗi render nên memo theo chính nó
  // không bao giờ hit.
  const searchQueryKey = searchParams.toString()

  // Một nguồn duy nhất, đã lọc sạch giá trị lạ, cho cả ba nơi: params gửi API, giá trị seed lại
  // vào dialog, và badge đếm.
  const filterValues = useMemo(
    () => parseProjectReceivableFilters(new URLSearchParams(searchQueryKey)),
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

  // Sync year, month, page, page_size query parameters with default values
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

  // Parse filters from URL
  const filters = useMemo(() => {
    const today = new Date()
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')

    const monthVal = monthParam ? Number(monthParam) : today.getMonth() + 1
    const yearVal = yearParam ? Number(yearParam) : today.getFullYear()

    return {
      month: monthVal,
      year: yearVal,
      // Bỏ hẳn khỏi query string khi không chọn dự án, để báo cáo vẫn trả toàn bộ
      // (openapi-fetch tự loại `undefined`).
      project: filterValues.project ?? undefined,
      // Gửi cả `false` dù BE bỏ qua khi lọc: header file Excel nhờ đó ghi "Chỉ hiện công nợ
      // > 0: Không", người nhận file biết đang xem cả dự án đã tất toán.
      has_debt: filterValues.hasDebt,
    }
  }, [searchParams, filterValues])

  // Fetch report data
  const { data, isLoading } = useProjectReceivableReport(filters, {
    enabled: isUrlReady && !!filters.year && !!filters.month,
  })

  // Export report
  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/reports/project-receivable/',
    'cong-no-du-an.xlsx'
  )

  const handleExport = useCallback(() => {
    openExportDialog(filters)
  }, [filters, openExportDialog])

  // Import projected collection amounts (report 2b, column "Dự kiến")
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importMutation = useImportProjectReceivableProjections()

  const handleImportExcel = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleImportFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      importMutation.mutate(
        { year: filters.year, month: filters.month, file },
        {
          onSuccess: (result) => {
            const errorCount = result?.error_rows?.length ?? 0
            toastService.success(
              `Đã nhập ${result?.imported_count ?? 0} dòng dự kiến` +
                (errorCount ? `, ${errorCount} dòng lỗi` : '')
            )
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.ACCOUNTING.REPORTS.PROJECT_RECEIVABLE(),
            })
          },
        }
      )
    },
    [filters, importMutation, queryClient]
  )

  // ── Bộ lọc dự án (dialog) ──────────────────────────────────────────────────
  const activeFilterCount = useMemo(
    () => countActiveProjectReceivableFilters(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const handleOpenFilterDialog = useCallback(() => setIsFilterDialogOpen(true), [])

  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    setSearchParams(
      buildProjectReceivableFilterParams(searchParams, {
        project: formData.project ?? null,
        // Chỉ một cái bỏ tick tường minh mới tắt lọc; thiếu giá trị thì giữ mặc định của SRS.
        hasDebt: formData.hasDebt !== false,
      }),
      { replace: true }
    )
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

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

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleImportFileChange}
      />
      <PageTitle
        title="20.16 Báo cáo công nợ của CĐT (theo dự án)"
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
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnIcon={handleExport}
        handleImportBtnFull={handleImportExcel}
        handleImportExcel={handleImportExcel}
      />
      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-0">
          <ProjectReceivableReportTable
            data={data}
            isLoading={isLoading}
            pageSize={pageSize}
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
          <ProjectReceivableFilter
            ref={filterFormRef}
            initialValues={filterValues}
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
