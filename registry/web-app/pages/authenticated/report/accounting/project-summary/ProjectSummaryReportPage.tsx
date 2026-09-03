import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Flex, Card, Text, Grid } from '@radix-ui/themes'
import PageTitle from '@/components/ui/page-title/PageTitle'
import AppDialog from '@/components/dialog/AppDialog'
import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { useProjectSummaryReport } from '@/features/accounting/reports/services/report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import ProjectSummaryFilter, {
  type ProjectSummaryFilterFormData,
  type ProjectSummaryFilterRef,
} from '@/features/report/accounting/project-summary/ProjectSummaryFilter'
import { SimplePagination } from '@/components/ui/table/SimplePagination'
import { formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency } from '@/utils/table/summary'
import { parsePositiveInt } from '@/utils/common'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { IconDownload } from '@/assets/icons'
import { APP_PATH } from '@/routes'

export default function ProjectSummaryReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)

  const formRef = useRef<ProjectSummaryFilterRef>(null)

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

  // Sync parameters on load
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

  const { data, isLoading } = useProjectSummaryReport(filters, {
    enabled: isUrlReady && !!filters.year && !!filters.month,
  })

  const { openExportDialog, isExporting } = useAccountingListExport(
    '/api/accounting/reports/project-summary/',
    'tong-hop-du-an.xlsx'
  )

  const handleExport = useCallback(() => {
    openExportDialog(filters)
  }, [filters, openExportDialog])

  const rows = useMemo(() => data?.by_project || [], [data])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return rows.slice(start, end)
  }, [rows, currentPage, pageSize])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.money_received += Number(row.money_received || 0)
        acc.sale_commission += Number(row.sale_commission || 0)
        acc.mgmt_commission += Number(row.mgmt_commission || 0)
        acc.ytd_money_received += Number(row.ytd_money_received || 0)
        acc.ytd_sale_commission += Number(row.ytd_sale_commission || 0)
        acc.ytd_mgmt_commission += Number(row.ytd_mgmt_commission || 0)
        return acc
      },
      {
        money_received: 0,
        sale_commission: 0,
        mgmt_commission: 0,
        ytd_money_received: 0,
        ytd_sale_commission: 0,
        ytd_mgmt_commission: 0,
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
        accessorKey: 'project_name',
        header: 'Dự án',
        cell: ({ row }) => {
          const projectId = row.original.project_id
          const name = row.original.project_name
          return projectId ? (
            <Link
              to={APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(projectId))}
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
        accessorKey: 'money_received',
        header: 'Doanh thu tiền về',
        cell: ({ row }) => (
          <span>{formatCurrencyVND(Number(row.original.money_received || 0))}</span>
        ),
        footer: () => formatSummaryCurrency(totals.money_received),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'sale_commission',
        header: 'HH trả Sale (phí và thưởng)',
        cell: ({ row }) => (
          <span className="text-content-dark-1">
            {formatCurrencyVND(Number(row.original.sale_commission || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.sale_commission),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'mgmt_commission',
        header: 'HH Quản lý',
        cell: ({ row }) => (
          <span className="text-content-dark-1">
            {formatCurrencyVND(Number(row.original.mgmt_commission || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.mgmt_commission),
        meta: { sortable: false, align: 'right' },
      },
    ],
    [totals]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchParams.has('project')) count++
    if (searchParams.has('unit_code')) count++
    return count
  }, [searchParams])

  const currentFilters: ProjectSummaryFilterFormData = useMemo(
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

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="21.12 Tổng hợp theo dự án (tháng + lũy tiến năm)"
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
            disabled={isLoading || isExporting || !rows.length}
            loading={isExporting}
          >
            Xuất Excel
          </Button>
        }
      />

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-16">
        {/* Summaries */}
        <div className="px-7">
          <Grid columns={{ initial: '1', md: '3' }} gap="4">
            <Card className="border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" className="font-medium">
                  Doanh thu tiền về (Tháng)
                </Text>
                <Text size="5" className="font-bold text-blue-700">
                  {isLoading ? '...' : formatCurrencyVND(totals.money_received)}
                </Text>
              </Flex>
            </Card>
            <Card className="border border-green-200 bg-green-50 p-4 shadow-sm">
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" className="font-medium">
                  HH trả Sale (Tháng)
                </Text>
                <Text size="5" className="font-bold text-green-700">
                  {isLoading ? '...' : formatCurrencyVND(totals.sale_commission)}
                </Text>
              </Flex>
            </Card>
            <Card className="border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" className="font-medium">
                  HH Quản lý (Tháng)
                </Text>
                <Text size="5" className="font-bold text-amber-700">
                  {isLoading ? '...' : formatCurrencyVND(totals.mgmt_commission)}
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
            isLoading={isLoading}
            showSTT={false}
            enablePagination={false}
            manualPagination={true}
            totalRecords={paginatedRows.length}
            pageSize={pageSize}
            pageCount={1}
            currentPageIndex={0}
            onPaginationChange={() => {}}
            emptyMessage="Không có dữ liệu cho kỳ báo cáo này"
            bordered
            showSummaryRow
            summaryRowCount={rows.length}
            disableInnerOverflow
            paginationPosition="static"
            stickyHeader
          />
        </div>

        {/* Pagination */}
        {rows.length > 0 && !isLoading && (
          <SimplePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalRecords={rows.length}
            onPageChange={handlePaginationChange}
            onPageSizeChange={handlePageSizeChange}
            position="fixed"
          />
        )}
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <ProjectSummaryFilter
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
