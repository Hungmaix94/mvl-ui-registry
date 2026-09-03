import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageTitle from '@/components/ui/page-title/PageTitle'
import AppDialog from '@/components/dialog/AppDialog'
import { Button } from '@/components/ui/button'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { useUnitsNotFullyPaidReport } from '@/features/accounting/reports/services/report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import UnitsNotFullyPaidFilter, {
  type UnitsNotFullyPaidFilterFormData,
  type UnitsNotFullyPaidFilterRef,
} from '@/features/report/accounting/units-not-fully-paid/UnitsNotFullyPaidFilter'
import UnitsNotFullyPaidReportTable from '@/features/report/accounting/units-not-fully-paid/UnitsNotFullyPaidReportTable'
import { parsePositiveInt } from '@/utils/common'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { IconDownload } from '@/assets/icons'

export default function UnitsNotFullyPaidReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)

  const formRef = useRef<UnitsNotFullyPaidFilterRef>(null)

  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const { data: allPeriods } = useAllAccountingPeriods()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))
  const project = parsePositiveInt(searchParams.get('project')) || undefined
  const unitCode = searchParams.get('unit_code') || undefined

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

  // Sync parameters on mount
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
      project,
      unit_code: unitCode,
    }
  }, [year, month, project, unitCode])

  const { data, isLoading } = useUnitsNotFullyPaidReport(filters, {
    enabled: isUrlReady,
  })

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/reports/units-not-fully-paid/',
    'can-chua-thu-du.xlsx'
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
    if (searchParams.has('unit_code')) count++
    return count
  }, [searchParams])

  const currentFilters: UnitsNotFullyPaidFilterFormData = useMemo(
    () => ({
      project: searchParams.get('project') ?? undefined,
      unit_code: searchParams.get('unit_code') ?? undefined,
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

    if (formData.unit_code) newParams.set('unit_code', formData.unit_code)
    else newParams.delete('unit_code')

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  const hasData = (data?.results?.length ?? 0) > 0

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="21.9 Các căn đã về tiền chưa chi hết"
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
        customActions={
          <Button
            variant="secondary"
            size="small"
            leftIcon={<IconDownload />}
            onClick={handleExport}
            disabled={isLoading || !hasData}
          >
            Xuất Excel
          </Button>
        }
      />

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-0">
          <UnitsNotFullyPaidReportTable
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
          <UnitsNotFullyPaidFilter
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
