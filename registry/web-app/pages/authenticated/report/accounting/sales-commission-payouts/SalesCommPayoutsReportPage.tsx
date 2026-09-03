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
import {
  useSalesCommissionPayoutReport,
  type SalesCommissionPayoutRow,
} from '@/features/accounting/reports/services/report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import SalesCommissionPayoutFilter, {
  type SalesCommissionPayoutFilterFormData,
  type SalesCommissionPayoutFilterRef,
} from '@/features/report/accounting/sales-commission-payouts/SalesCommissionPayoutFilter'
import { SimplePagination } from '@/components/ui/table/SimplePagination'
import { cn, formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency } from '@/utils/table/summary'
import { parsePositiveInt } from '@/utils/common'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { IconDownload } from '@/assets/icons'
import { APP_PATH } from '@/routes'

export default function SalesCommPayoutsReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)

  const formRef = useRef<SalesCommissionPayoutFilterRef>(null)

  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const { data: allPeriods } = useAllAccountingPeriods()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))
  const beneficiaryType = searchParams.get('type') || undefined

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
      type: beneficiaryType as any,
    }
  }, [year, month, beneficiaryType])

  const { data, isLoading } = useSalesCommissionPayoutReport(filters, {
    enabled: isUrlReady && !!filters.year && !!filters.month,
  })

  const { openExportDialog, isExporting } = useAccountingListExport(
    '/api/accounting/reports/sales-commission-payout/',
    'chi-tra-hoa-hong-sale.xlsx'
  )

  const handleExport = useCallback(() => {
    openExportDialog(filters)
  }, [filters, openExportDialog])

  const rows = useMemo(() => data?.results || [], [data])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return rows.slice(start, end)
  }, [rows, currentPage, pageSize])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.sale_amount += Number(row.sale_amount || 0)
        acc.prior_month_supplement += Number(row.prior_month_supplement || 0)
        acc.htqc += Number(row.htqc || 0)
        acc.pit += Number(row.pit || 0)
        acc.advance_to_recover += Number(row.advance_to_recover || 0)
        acc.hold_amount += Number(row.hold_amount || 0)
        acc.ccmg_supplement += Number(row.ccmg_supplement || 0)
        acc.net_payable += Number(row.net_payable || 0)
        acc.bank_transfer += Number(row.bank_transfer || 0)
        return acc
      },
      {
        sale_amount: 0,
        prior_month_supplement: 0,
        htqc: 0,
        pit: 0,
        advance_to_recover: 0,
        hold_amount: 0,
        ccmg_supplement: 0,
        net_payable: 0,
        bank_transfer: 0,
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

  type PayoutTableRow = SalesCommissionPayoutRow

  const columns = useMemo<ColumnDef<PayoutTableRow>[]>(
    () => [
      {
        accessorKey: 'beneficiary_type',
        header: 'Loại đối tượng',
        cell: ({ row }) => {
          let typeLabel = row.original.beneficiary_type
          if (row.original.beneficiary_type === 'EMPLOYEE') {
            typeLabel = 'Nhân viên'
          } else if (row.original.beneficiary_type === 'COLLABORATOR') {
            typeLabel = 'CTV'
          } else if (row.original.beneficiary_type === 'EXCHANGE') {
            typeLabel = 'Sàn liên kết'
          }
          return typeLabel
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'beneficiary_name',
        header: 'Mã / Tên đối tượng',
        cell: ({ row }) => {
          let detailLink = ''
          if (row.original.beneficiary_type === 'EMPLOYEE') {
            if (row.original.beneficiary_id) {
              detailLink = APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(
                ':id',
                String(row.original.beneficiary_id)
              )
            }
          } else if (row.original.beneficiary_type === 'COLLABORATOR') {
            if (row.original.beneficiary_id) {
              detailLink = APP_PATH.COLLABORATOR_DETAIL.replace(
                ':id',
                String(row.original.beneficiary_id)
              )
            }
          } else if (row.original.beneficiary_type === 'EXCHANGE') {
            if (row.original.beneficiary_id) {
              detailLink = APP_PATH.EXCHANGE_MANAGEMENT_DETAIL.replace(
                ':id',
                String(row.original.beneficiary_id)
              )
            }
          }
          return detailLink ? (
            <Link
              to={detailLink}
              className="text-action-primary-default font-medium hover:underline"
            >
              {row.original.beneficiary_name}
            </Link>
          ) : (
            row.original.beneficiary_name
          )
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'sale_amount',
        header: 'HH bán hàng',
        cell: ({ row }) => (
          <span className="text-green-600">
            {formatCurrencyVND(Number(row.original.sale_amount || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.sale_amount),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'prior_month_supplement',
        header: 'HH bổ sung',
        cell: ({ row }) => (
          <span className="text-green-600">
            {formatCurrencyVND(Number(row.original.prior_month_supplement || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.prior_month_supplement),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'htqc',
        header: 'HTQC',
        cell: ({ row }) => (
          <span className="text-green-600">
            {formatCurrencyVND(Number(row.original.htqc || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.htqc),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'pit',
        header: 'Thuế TNCN',
        cell: ({ row }) => (
          <span className="text-red-600">{formatCurrencyVND(Number(row.original.pit || 0))}</span>
        ),
        footer: () => formatSummaryCurrency(totals.pit),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'advance_to_recover',
        header: 'Tạm ứng thu hồi',
        cell: ({ row }) => (
          <span className="text-red-600">
            {formatCurrencyVND(Number(row.original.advance_to_recover || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.advance_to_recover),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'hold_amount',
        header: 'HH tạm giữ',
        cell: ({ row }) => (
          <span className="text-red-600">
            {formatCurrencyVND(Number(row.original.hold_amount || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.hold_amount),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'ccmg_supplement',
        header: 'Chi bổ sung CCMG',
        cell: ({ row }) => (
          <span className="text-green-600">
            {formatCurrencyVND(Number(row.original.ccmg_supplement || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.ccmg_supplement),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'net_payable',
        header: 'Thực nhận',
        cell: ({ row }) => (
          <span className={cn('text-green-700', 'font-semibold')}>
            {formatCurrencyVND(Number(row.original.net_payable || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.net_payable),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'bank_transfer',
        header: 'Chuyển khoản',
        cell: ({ row }) => (
          <span className={cn('text-green-700', 'font-semibold')}>
            {formatCurrencyVND(Number(row.original.bank_transfer || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.bank_transfer),
        meta: { sortable: false, align: 'right' },
      },
    ],
    [totals]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchParams.has('type')) count++
    return count
  }, [searchParams])

  const currentFilters: SalesCommissionPayoutFilterFormData = useMemo(
    () => ({
      type: searchParams.get('type') ?? undefined,
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

    if (formData.type) newParams.set('type', formData.type)
    else newParams.delete('type')

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Báo cáo chi tiết HH bán hàng tháng"
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

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        {/* Summaries */}
        <div className="px-7">
          <Grid columns={{ initial: '1', md: '3' }} gap="4">
            <Card className="border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" className="font-medium">
                  Tổng số tiền trả sale
                </Text>
                <Text size="5" className="font-bold text-blue-700">
                  {isLoading ? '...' : formatCurrencyVND(totals.sale_amount)}
                </Text>
              </Flex>
            </Card>
            <Card className="border border-green-200 bg-green-50 p-4 shadow-sm">
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" className="font-medium">
                  Tổng thực nhận (Net)
                </Text>
                <Text size="5" className="font-bold text-green-700">
                  {isLoading ? '...' : formatCurrencyVND(totals.net_payable)}
                </Text>
              </Flex>
            </Card>
            <Card className="border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" className="font-medium">
                  Tổng chuyển khoản thực tế
                </Text>
                <Text size="5" className="font-bold text-amber-700">
                  {isLoading ? '...' : formatCurrencyVND(totals.bank_transfer)}
                </Text>
              </Flex>
            </Card>
          </Grid>
        </div>

        {/* Data Table */}
        <div className="flex-grow overflow-x-auto overflow-y-auto pt-0 pb-0">
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
          <SalesCommissionPayoutFilter
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
