import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Flex, Card, Text, Grid } from '@radix-ui/themes'
import PageTitle from '@/components/ui/page-title/PageTitle'
import { Button } from '@/components/ui/button'
import { Table, TextField } from '@/components/ui'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { useIncomeBySalespersonReport } from '@/features/accounting/reports/services/report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { SimplePagination } from '@/components/ui/table/SimplePagination'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'
import {
  buildIncomeBySalespersonSearchParams,
  filterIncomeBySalespersonRows,
} from '@/features/report/accounting/income-by-salesperson/income-by-salesperson-filters'
import { formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency } from '@/utils/table/summary'
import { parsePositiveInt } from '@/utils/common'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { IconDownload } from '@/assets/icons'
import { APP_PATH } from '@/routes'

export default function IncomeBySalespersonReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const { data: allPeriods } = useAllAccountingPeriods()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))

  const branch = searchParams.get('branch') || ''
  const block = searchParams.get('block') || ''
  const department = searchParams.get('department') || ''
  const employee = searchParams.get('employee') || ''

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
      branch: branch ? Number(branch) : undefined,
      block: block ? Number(block) : undefined,
      department: department ? Number(department) : undefined,
      employee: employee ? Number(employee) : undefined,
    }
  }, [year, month, branch, block, department, employee])

  const { data, isLoading } = useIncomeBySalespersonReport(filters, {
    enabled: isUrlReady && !!filters.year && !!filters.month,
  })

  const { openExportDialog, isExporting } = useAccountingListExport(
    '/api/accounting/reports/income-by-salesperson/',
    'thu-nhap-theo-nhan-vien-sale.xlsx'
  )

  const handleExport = useCallback(() => {
    openExportDialog(filters)
  }, [filters, openExportDialog])

  const patchFilterParams = useCallback(
    (changes: Record<string, string | number | null | undefined>) => {
      setSearchParams(buildIncomeBySalespersonSearchParams(searchParams, changes), {
        replace: true,
      })
    },
    [searchParams, setSearchParams]
  )

  const cascadeInitialValues = useMemo(
    () => ({
      branch: branch || undefined,
      block: block || undefined,
      department: department || undefined,
      employee: employee || undefined,
    }),
    [branch, block, department, employee]
  )

  const handleCascadeChange = useCallback(
    (data: {
      branch_id?: number
      block_id?: number
      department_id?: number
      employee_id?: number
    }) => {
      patchFilterParams({
        branch: data.branch_id || null,
        block: data.block_id || null,
        department: data.department_id || null,
        employee: data.employee_id || null,
      })
    },
    [patchFilterParams]
  )

  const [searchQuery, setSearchQuery] = useState('')

  const rawRows = useMemo(() => data?.results || [], [data?.results])

  const rows = useMemo(() => {
    return filterIncomeBySalespersonRows(rawRows, {
      branch,
      block,
      department,
      employee,
      searchQuery,
    })
  }, [rawRows, branch, block, department, employee, searchQuery])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return rows.slice(start, end)
  }, [rows, currentPage, pageSize])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.hh_bh += Number(row.hh_bh || 0)
        acc.hh_ql += Number(row.hh_ql || 0)
        acc.ad_support += Number(row.ad_support || 0)
        acc.salary += Number(row.salary || 0)
        acc.bonus += Number(row.bonus || 0)
        acc.bhxh += Number(row.bhxh || 0)
        acc.total_income += Number(row.total_income || 0)
        acc.ytd_hh_bh += Number(row.ytd_hh_bh || 0)
        acc.ytd_hh_ql += Number(row.ytd_hh_ql || 0)
        acc.ytd_ad_support += Number(row.ytd_ad_support || 0)
        acc.ytd_total_income += Number(row.ytd_total_income || 0)
        return acc
      },
      {
        hh_bh: 0,
        hh_ql: 0,
        ad_support: 0,
        salary: 0,
        bonus: 0,
        bhxh: 0,
        total_income: 0,
        ytd_hh_bh: 0,
        ytd_hh_ql: 0,
        ytd_ad_support: 0,
        ytd_total_income: 0,
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
        accessorKey: 'employee_code',
        header: 'Mã NV mới',
        cell: ({ row }) => {
          return <span className="font-mono">{row.original.employee_code || '—'}</span>
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'employee_name',
        header: 'Tên',
        cell: ({ row }) => {
          const employeeId = row.original.employee_id
          const name = row.original.employee_name
          return employeeId ? (
            <Link
              to={APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(employeeId))}
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
        accessorKey: 'department_name',
        header: 'Phòng Ban',
        cell: ({ row }) => {
          return row.original.department_name || '—'
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'salary_bonus',
        header: 'Lương + thưởng',
        cell: ({ row }) => (
          <span>
            {formatCurrencyVND(Number(row.original.salary || 0) + Number(row.original.bonus || 0))}
          </span>
        ),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'hh_bh',
        header: 'Hoa hồng bán hàng',
        cell: ({ row }) => (
          <span className="text-green-600">
            {formatCurrencyVND(Number(row.original.hh_bh || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.hh_bh),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'ad_support',
        header: 'HTQC',
        cell: ({ row }) => (
          <span className="text-green-600">
            {formatCurrencyVND(Number(row.original.ad_support || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.ad_support),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'hh_ql',
        header: 'Hoa hồng quản lý',
        cell: ({ row }) => (
          <span className="text-green-600">
            {formatCurrencyVND(Number(row.original.hh_ql || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.hh_ql),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'total_income',
        header: 'Tổng Thu Nhập',
        cell: ({ row }) => (
          <span className="font-semibold text-green-700">
            {formatCurrencyVND(Number(row.original.total_income || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.total_income),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'bhxh',
        header: 'Giảm trừ bảo hiểm',
        cell: ({ row }) => (
          <span className="text-red-600">{formatCurrencyVND(Number(row.original.bhxh || 0))}</span>
        ),
        footer: () => formatSummaryCurrency(totals.bhxh),
        meta: { sortable: false, align: 'right' },
      },
    ],
    [totals]
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="21.11 Tổng thu nhập nội bộ theo người đứng tên bán hàng"
        toolbarLeftContent={
          <div className="flex items-center gap-3">
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
            <div className="w-64">
              <TextField
                placeholder="Tìm nhân sự, phòng ban, chi nhánh..."
                value={searchQuery}
                onChange={(val: any) =>
                  setSearchQuery(typeof val === 'string' ? val : val?.target?.value || '')
                }
              />
            </div>
          </div>
        }
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
        {/* Filters: Org hierarchy cascade (Chi nhánh → Khối → Phòng ban → Nhân sự) */}
        <div className="flex flex-wrap items-start gap-3 px-7">
          <div className="w-full">
            <CascadeSelectGroupOrganization
              initialValues={cascadeInitialValues}
              onFormChange={handleCascadeChange}
              showEmployee={true}
              employeeLabel="Nhân sự"
              showPosition={false}
              skipValidation
              className="w-full"
            />
          </div>
        </div>

        {/* Summaries */}
        <div className="px-7">
          <Grid columns={{ initial: '1', md: '2' }} gap="4">
            <Card className="border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" className="font-medium">
                  Tổng HH bán hàng nội bộ
                </Text>
                <Text size="5" className="font-bold text-blue-700">
                  {isLoading ? '...' : formatCurrencyVND(totals.hh_bh)}
                </Text>
              </Flex>
            </Card>
            <Card className="border border-green-200 bg-green-50 p-4 shadow-sm">
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" className="font-medium">
                  Tổng thu nhập (Lương + HH)
                </Text>
                <Text size="5" className="font-bold text-green-700">
                  {isLoading ? '...' : formatCurrencyVND(totals.total_income)}
                </Text>
              </Flex>
            </Card>
          </Grid>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-0">
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
    </div>
  )
}
