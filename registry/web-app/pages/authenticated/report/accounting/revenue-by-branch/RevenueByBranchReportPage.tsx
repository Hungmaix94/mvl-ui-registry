import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Flex, Card, Text, Grid, Tabs, Select as RadixSelect } from '@radix-ui/themes'
import PageTitle from '@/components/ui/page-title/PageTitle'
import AppDialog from '@/components/dialog/AppDialog'
import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import {
  useRevenueByBranchReport,
  useRevenueByBranchYearlyReport,
} from '@/features/accounting/reports/services/report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import RevenueByBranchFilter, {
  type RevenueByBranchFilterFormData,
  type RevenueByBranchFilterRef,
} from '@/features/report/accounting/revenue-by-branch/RevenueByBranchFilter'
import RevenueByBranchYearlyTable from '@/features/report/accounting/revenue-by-branch/RevenueByBranchYearlyTable'
import { SimplePagination } from '@/components/ui/table/SimplePagination'
import { formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency } from '@/utils/table/summary'
import { parsePositiveInt } from '@/utils/common'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { IconDownload } from '@/assets/icons'
import { APP_PATH } from '@/routes'

const YEARLY_TAB = 'yearly'
const MONTHLY_TAB = 'monthly'

export default function RevenueByBranchReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)

  const formRef = useRef<RevenueByBranchFilterRef>(null)

  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const { data: allPeriods } = useAllAccountingPeriods()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))
  const branch = parsePositiveInt(searchParams.get('branch')) || undefined
  const tab = searchParams.get('tab') === YEARLY_TAB ? YEARLY_TAB : MONTHLY_TAB

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
      branch,
    }
  }, [year, month, branch])

  const { data, isLoading } = useRevenueByBranchReport(filters, {
    enabled: isUrlReady,
  })

  const isPageLoading = isLoading || !isUrlReady || isLoadingCurrent

  const { openExportDialog, isExporting } = useAccountingListExport(
    '/api/accounting/reports/revenue-by-branch/',
    'doanh-thu-theo-chi-nhanh.xlsx'
  )

  const handleExport = useCallback(() => {
    openExportDialog(filters)
  }, [filters, openExportDialog])

  const handleTabChange = useCallback(
    (next: string) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('tab', next === YEARLY_TAB ? YEARLY_TAB : MONTHLY_TAB)
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleYearlyYearChange = useCallback(
    (nextYear: string) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('year', nextYear)
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const yearlyYear = year || new Date().getFullYear()
  const yearlyYearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, i) => yearlyYear - 2 + i),
    [yearlyYear]
  )

  const yearlyParams = useMemo(() => ({ year: yearlyYear }), [yearlyYear])

  const { data: yearlyData, isLoading: isYearlyLoading } = useRevenueByBranchYearlyReport(
    yearlyParams,
    { enabled: isUrlReady && tab === YEARLY_TAB }
  )
  const yearlyRows = useMemo(() => yearlyData?.rows ?? [], [yearlyData])

  const { openExportDialog: openYearlyExportDialog, isExporting: isYearlyExporting } =
    useAccountingListExport(
      '/api/accounting/reports/revenue-by-branch-yearly/',
      'lai-gop-theo-chi-nhanh-nam.xlsx'
    )

  const handleExportYearly = useCallback(() => {
    openYearlyExportDialog(yearlyParams)
  }, [yearlyParams, openYearlyExportDialog])

  const rows = useMemo(() => data?.by_branch || [], [data])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return rows.slice(start, end)
  }, [rows, currentPage, pageSize])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.revenue += Number(row.revenue || 0)
        acc.cost_of_sale += Number(row.cost_of_sale || 0)
        acc.gross_margin += Number(row.gross_margin || 0)
        acc.mgmt_commission_cost += Number(row.mgmt_commission_cost || 0)
        return acc
      },
      {
        revenue: 0,
        cost_of_sale: 0,
        gross_margin: 0,
        mgmt_commission_cost: 0,
      }
    )
  }, [rows])

  const handlePaginationChange = useCallback(
    (nextPage: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(nextPage))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', '1')
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: 'stt',
        header: 'STT',
        cell: ({ row }) => row.index + 1,
        meta: { sortable: false, align: 'center' },
      },
      {
        accessorKey: 'branch_name',
        header: 'Chi nhánh',
        cell: ({ row }) => {
          const branchId = row.original.branch_id
          const name = row.original.branch_name || 'Khác'
          return branchId ? (
            <Link
              to={APP_PATH.BRANCH_MANAGEMENT_DETAIL.replace(':id', String(branchId))}
              className="text-action-primary-default font-medium hover:underline"
            >
              {name}
            </Link>
          ) : (
            name
          )
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'revenue',
        header: 'Doanh thu tiền về',
        cell: ({ row }) => <span>{formatCurrencyVND(Number(row.original.revenue || 0))}</span>,
        footer: () => formatSummaryCurrency(totals.revenue),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'cost_of_sale',
        header: 'Giá vốn (HH sale+bonus)',
        cell: ({ row }) => (
          <span className="text-content-dark-1">
            {formatCurrencyVND(Number(row.original.cost_of_sale || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.cost_of_sale),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'gross_margin',
        header: 'Lãi gộp',
        cell: ({ row }) => (
          <span className="text-content-dark-1 font-semibold">
            {formatCurrencyVND(Number(row.original.gross_margin || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.gross_margin),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'mgmt_commission_cost',
        header: 'Chi phí HHQL & KPI',
        cell: ({ row }) => (
          <span className="text-content-dark-1">
            {formatCurrencyVND(Number(row.original.mgmt_commission_cost || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.mgmt_commission_cost),
        meta: { sortable: false, align: 'right' },
      },
    ],
    [totals]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchParams.has('branch')) count++
    return count
  }, [searchParams])

  const currentFilters: RevenueByBranchFilterFormData = useMemo(
    () => ({
      branch: searchParams.get('branch') ?? undefined,
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

    if (formData.branch) newParams.set('branch', formData.branch)
    else newParams.delete('branch')

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="21.8 Doanh thu theo chi nhánh"
        toolbarLeftContent={
          tab === MONTHLY_TAB ? (
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
          ) : (
            <RadixSelect.Root value={String(yearlyYear)} onValueChange={handleYearlyYearChange}>
              <RadixSelect.Trigger placeholder="Năm" />
              <RadixSelect.Content>
                {yearlyYearOptions.map((y) => (
                  <RadixSelect.Item key={y} value={String(y)}>
                    {y}
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Content>
            </RadixSelect.Root>
          )
        }
        handleFilter={tab === MONTHLY_TAB ? handleOpenFilterDialog : undefined}
        filterBadgeCount={tab === MONTHLY_TAB ? activeFilterCount : undefined}
        customActions={
          tab === MONTHLY_TAB ? (
            <Button
              variant="secondary"
              size="small"
              leftIcon={<IconDownload />}
              onClick={handleExport}
              disabled={isPageLoading || isExporting || !rows.length}
              loading={isExporting}
            >
              Xuất Excel
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="small"
              leftIcon={<IconDownload />}
              onClick={handleExportYearly}
              disabled={isYearlyLoading || isYearlyExporting || !yearlyRows.length}
              loading={isYearlyExporting}
            >
              Xuất Excel
            </Button>
          )
        }
      />

      <Tabs.Root
        value={tab}
        onValueChange={handleTabChange}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <Tabs.List className="px-7 pt-4">
          <Tabs.Trigger value={MONTHLY_TAB}>Theo tháng</Tabs.Trigger>
          <Tabs.Trigger value={YEARLY_TAB}>Lãi gộp cả năm</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content
          value={MONTHLY_TAB}
          className="flex flex-1 flex-col gap-4 overflow-hidden pt-4 pb-16 outline-none"
        >
          {/* Summaries */}
          <div className="px-7">
            <Grid columns={{ initial: '1', sm: '2', md: '4' }} gap="4">
              <Card className="border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <Flex direction="column" gap="1">
                  <Text size="2" color="gray" className="font-medium">
                    Tổng doanh thu tiền về
                  </Text>
                  <Text size="5" className="font-bold text-blue-700">
                    {isPageLoading ? '...' : `${formatCurrencyVND(totals.revenue)} đ`}
                  </Text>
                </Flex>
              </Card>
              <Card className="border border-red-200 bg-red-50 p-4 shadow-sm">
                <Flex direction="column" gap="1">
                  <Text size="2" color="gray" className="font-medium">
                    Tổng giá vốn (HH sale+bonus)
                  </Text>
                  <Text size="5" className="font-bold text-red-700">
                    {isPageLoading ? '...' : `${formatCurrencyVND(totals.cost_of_sale)} đ`}
                  </Text>
                </Flex>
              </Card>
              <Card className="border border-green-200 bg-green-50 p-4 shadow-sm">
                <Flex direction="column" gap="1">
                  <Text size="2" color="gray" className="font-medium">
                    Tổng lãi gộp (Gross Margin)
                  </Text>
                  <Text size="5" className="font-bold text-green-700">
                    {isPageLoading ? '...' : `${formatCurrencyVND(totals.gross_margin)} đ`}
                  </Text>
                </Flex>
              </Card>
              <Card className="border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <Flex direction="column" gap="1">
                  <Text size="2" color="gray" className="font-medium">
                    Tổng chi phí HH quản lý & KPI
                  </Text>
                  <Text size="5" className="font-bold text-amber-700">
                    {isPageLoading ? '...' : `${formatCurrencyVND(totals.mgmt_commission_cost)} đ`}
                  </Text>
                </Flex>
              </Card>
            </Grid>
          </div>

          {/* Data Table */}
          <div className="flex-grow overflow-x-auto overflow-y-auto pt-0 pb-10">
            <Table
              data={paginatedRows}
              columns={columns}
              isLoading={isPageLoading}
              showSTT={false}
              enablePagination={false}
              manualPagination={true}
              totalRecords={paginatedRows.length}
              pageSize={pageSize}
              pageCount={1}
              currentPageIndex={0}
              onPaginationChange={() => {}}
              emptyMessage="Không có dữ liệu cho các tiêu chí lọc hiện tại"
              bordered
              showSummaryRow
              summaryRowCount={rows.length}
              disableInnerOverflow
              paginationPosition="static"
              stickyHeader
            />
          </div>

          {/* Pagination */}
          {rows.length > 0 && !isPageLoading && (
            <SimplePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalRecords={rows.length}
              onPageChange={handlePaginationChange}
              onPageSizeChange={handlePageSizeChange}
              position="fixed"
            />
          )}
        </Tabs.Content>

        <Tabs.Content
          value={YEARLY_TAB}
          className="flex flex-1 flex-col overflow-hidden pt-4 pb-16 outline-none"
        >
          <div className="flex-grow overflow-x-auto overflow-y-auto px-7">
            <RevenueByBranchYearlyTable rows={yearlyRows} isLoading={isYearlyLoading} />
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <RevenueByBranchFilter
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
