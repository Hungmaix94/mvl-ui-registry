import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Card, Text, Tabs } from '@radix-ui/themes'
import { type components } from '@/api/schema'
import { F2Source } from '@/constants/api-schema-aliases'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { PageTitle, Table } from '@/components/ui'
import { Loading } from '@/components/Loading'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import {
  usePartnerDebtReport,
  useF2DebtReport,
  type GetPartnerDebtReportParams,
  type PartnerDebtMetric,
  type PartnerDebtRow,
} from '@/features/accounting/reports/services/report-service'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { parsePositiveInt } from '@/utils/common'
import { formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency, sumRows } from '@/utils/table/summary'

export default function BranchF2ReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const { data: allPeriods } = useAllAccountingPeriods()
  const periods = useMemo(() => allPeriods ?? [], [allPeriods])

  const month = parsePositiveInt(searchParams.get('month'))
  const year = parsePositiveInt(searchParams.get('year'))
  const activeTab = searchParams.get('tab') || 'branch'

  const activePeriodId = useMemo(() => {
    if (year && month) {
      return periods.find((p) => p.year === year && p.month === month)?.id || null
    }
    return null
  }, [periods, year, month])

  // Sync year and month with defaults on mount
  useEffect(() => {
    if (periods.length === 0 || isLoadingCurrent) return

    const actualUrlParams = new URLSearchParams(window.location.search)
    const hasYear = searchParams.has('year') || actualUrlParams.has('year')
    const hasMonth = searchParams.has('month') || actualUrlParams.has('month')

    if (!hasYear || !hasMonth) {
      const newParams = new URLSearchParams(searchParams)
      const defaultPeriod = currentPeriod ?? periods[0]
      if (defaultPeriod) {
        newParams.set('year', String(defaultPeriod.year))
        newParams.set('month', String(defaultPeriod.month))
      }
      if (!searchParams.has('tab')) {
        newParams.set('tab', 'branch')
      }
      setSearchParams(newParams, { replace: true })
    } else {
      setIsUrlReady(true)
    }
  }, [periods, currentPeriod, isLoadingCurrent, searchParams, setSearchParams])

  type ExtendedPartnerDebtReportParams = GetPartnerDebtReportParams & {
    month?: number
    year?: number
  }

  const filters = useMemo(() => {
    return {
      month: month || undefined,
      year: year || undefined,
    }
  }, [month, year])

  // Fetch branch/partner debt report
  const { data: partnerDebtResponse, isLoading: isLoadingPartner } = usePartnerDebtReport(
    filters as ExtendedPartnerDebtReportParams,
    {
      enabled: isUrlReady && activeTab === 'branch',
    }
  )

  // Fetch F2 debt report
  const { data: f2DebtResponse, isLoading: isLoadingF2 } = useF2DebtReport(filters, {
    enabled: isUrlReady && activeTab === 'f2',
  })

  // Fetch exchange list to resolve exchange names in F2 tab
  const { exchangeOptions } = useExchangeSelect({ valueType: 'id' })
  const exchangesMap = useMemo(() => {
    const map = new Map<number, string>()
    exchangeOptions.forEach((opt) => {
      map.set(Number(opt.value), opt.label)
    })
    return map
  }, [exchangeOptions])

  interface PartnerTableDataRow {
    partner_id: number
    partner_type: string
    partner_name: string | null
    contact: string
    receivable: PartnerDebtMetric
    payable: PartnerDebtMetric
    balance: PartnerDebtMetric
    receivableNum: number
    payableNum: number
    balanceNum: number
  }

  // Process partner/branch data. The partner-debt report is month-scoped; use the
  // outstanding balance here.
  const partnerData = useMemo<PartnerTableDataRow[]>(() => {
    const results = partnerDebtResponse?.results || []
    return results.map((row: PartnerDebtRow) => ({
      ...row,
      // Regen 2026-07-27: mỗi chỉ tiêu là { period, cumulative }; báo cáo này
      // theo tháng nhưng lấy DƯ CUỐI KỲ (đúng ghi chú ngay trên).
      receivableNum: Number(row.receivable?.cumulative || 0),
      payableNum: Number(row.payable?.cumulative || 0),
      balanceNum: Number(row.balance?.cumulative || 0),
    }))
  }, [partnerDebtResponse])

  // F2 source label (SLK/F2-công ty/F2-giám đốc) — same app-constant + fallback pattern
  // as CommSlkMonthlyDetail.tsx, so the wording matches the SLK monthly screen.
  const { keysMap: f2SourceKeysMap } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE],
  })
  const f2SourceLabels =
    (f2SourceKeysMap.get(APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE) as Record<
      string,
      string
    > | null) ?? null
  const f2SourceLabel = (source: string) => f2SourceLabels?.[source] ?? source

  interface F2TableDataRow {
    payee_exchange_id: number
    f2_source: string
    f2_source_director_id: number | null
    f2_source_director_name: string | null
    outstanding: string
    total_expected: string
    total_paid: string
    name: string
    expectedNum: number
    paidNum: number
    outstandingNum: number
  }

  // Process F2 data — one row per (exchange, F2 source): the report used to lump every
  // source into a single row per exchange, but the accounting system already records the
  // source per transaction, so ClickUp 86exzg79v asks to split the figures by source.
  const f2Data = useMemo<F2TableDataRow[]>(() => {
    const results = f2DebtResponse?.results || []
    return results.map((row: components['schemas']['F2DebtRow']) => {
      const name = exchangesMap.get(row.payee_exchange_id) || `Sàn F2 #${row.payee_exchange_id}`
      return {
        ...row,
        name,
        expectedNum: Number(row.total_expected || 0),
        paidNum: Number(row.total_paid || 0),
        outstandingNum: Number(row.outstanding || 0),
      }
    })
  }, [f2DebtResponse, exchangesMap])

  // Chart data for Branch
  const partnerChartData = useMemo(() => {
    return partnerData.map((row) => ({
      name: row.partner_name || `Đối tác #${row.partner_id}`,
      'Phải thu': row.receivableNum,
      'Phải chi': row.payableNum,
      'Dư nợ': row.balanceNum,
    }))
  }, [partnerData])

  // Chart data for F2 — the chart stays one bar per exchange (unchanged UX), so sum
  // across the exchange's source rows here; the "Nguồn" breakdown lives in the table.
  const f2ChartData = useMemo(() => {
    const byExchange = new Map<
      string,
      { name: string; expected: number; paid: number; outstanding: number }
    >()
    for (const row of f2Data) {
      const entry = byExchange.get(row.name) ?? {
        name: row.name,
        expected: 0,
        paid: 0,
        outstanding: 0,
      }
      entry.expected += row.expectedNum
      entry.paid += row.paidNum
      entry.outstanding += row.outstandingNum
      byExchange.set(row.name, entry)
    }
    return Array.from(byExchange.values()).map((entry) => ({
      name: entry.name,
      'Dự kiến': entry.expected,
      'Đã chi': entry.paid,
      'Dư nợ': entry.outstanding,
    }))
  }, [f2Data])

  const handlePeriodChange = useCallback(
    (periodId: number | string | null) => {
      const period = periods.find((p) => p.id === periodId)
      if (period) {
        const newParams = new URLSearchParams(searchParams)
        newParams.set('year', String(period.year))
        newParams.set('month', String(period.month))
        setSearchParams(newParams, { replace: true })
      }
    },
    [periods, searchParams, setSearchParams]
  )

  const handleTabChange = useCallback(
    (value: string) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('tab', value)
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Both report endpoints return the whole filtered set (no page/page_size), so these are
  // the filter's totals, not a page's.
  const partnerTotals = useMemo(
    () => ({
      receivable: sumRows(partnerData, (row) => row.receivableNum),
      payable: sumRows(partnerData, (row) => row.payableNum),
      balance: sumRows(partnerData, (row) => row.balanceNum),
    }),
    [partnerData]
  )

  const f2Totals = useMemo(
    () => ({
      expected: sumRows(f2Data, (row) => row.expectedNum),
      paid: sumRows(f2Data, (row) => row.paidNum),
      outstanding: sumRows(f2Data, (row) => row.outstandingNum),
    }),
    [f2Data]
  )

  const partnerColumns = useMemo<ColumnDef<PartnerTableDataRow>[]>(
    () => [
      {
        accessorKey: 'partner_name',
        header: 'Tên chi nhánh / Đối tác',
        cell: ({ row }) => row.original.partner_name || `Đối tác #${row.original.partner_id}`,
        meta: { sortable: false },
      },
      {
        accessorKey: 'contact',
        header: 'Liên hệ',
        cell: ({ row }) => row.original.contact || '-',
        meta: { sortable: false },
      },
      {
        accessorKey: 'receivableNum',
        header: 'Phải thu (Receivable)',
        cell: ({ row }) => (
          <span className="font-semibold text-blue-600">
            {formatCurrencyVND(row.original.receivableNum)}
          </span>
        ),
        footer: () => formatSummaryCurrency(partnerTotals.receivable),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'payableNum',
        header: 'Phải chi (Payable)',
        cell: ({ row }) => (
          <span className="font-semibold text-red-600">
            {formatCurrencyVND(row.original.payableNum)}
          </span>
        ),
        footer: () => formatSummaryCurrency(partnerTotals.payable),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'balanceNum',
        header: 'Số dư (Balance)',
        cell: ({ row }) => (
          <span className="font-bold text-green-600">
            {formatCurrencyVND(row.original.balanceNum)}
          </span>
        ),
        footer: () => formatSummaryCurrency(partnerTotals.balance),
        meta: { sortable: false, align: 'right' },
      },
    ],
    [partnerTotals]
  )

  const f2Columns = useMemo<ColumnDef<F2TableDataRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Tên Sàn / Đại lý liên kết',
        cell: ({ row }) => row.original.name,
        meta: { sortable: false },
      },
      {
        id: 'f2_source',
        header: 'Nguồn',
        cell: ({ row }) => {
          const { f2_source, f2_source_director_name } = row.original
          return (
            <span className="text-sm">
              {f2_source_director_name
                ? `${f2SourceLabel(F2Source.director)} — ${f2_source_director_name}`
                : f2SourceLabel(f2_source)}
            </span>
          )
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'expectedNum',
        header: 'Dự kiến phải chi (Total Expected)',
        cell: ({ row }) => (
          <span className="font-semibold text-blue-600">
            {formatCurrencyVND(row.original.expectedNum)}
          </span>
        ),
        footer: () => formatSummaryCurrency(f2Totals.expected),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'paidNum',
        header: 'Đã chi trả (Total Paid)',
        cell: ({ row }) => (
          <span className="font-semibold text-green-600">
            {formatCurrencyVND(row.original.paidNum)}
          </span>
        ),
        footer: () => formatSummaryCurrency(f2Totals.paid),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'outstandingNum',
        header: 'Dư nợ còn lại (Outstanding)',
        cell: ({ row }) => (
          <span className="font-bold text-red-600">
            {formatCurrencyVND(row.original.outstandingNum)}
          </span>
        ),
        footer: () => formatSummaryCurrency(f2Totals.outstanding),
        meta: { sortable: false, align: 'right' },
      },
    ],
    [f2Totals, f2SourceLabels]
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="20.16 Báo cáo theo chi nhánh và F2"
        toolbarLeftContent={
          <AccountingPeriodSelect
            periods={periods}
            selectedPeriodId={activePeriodId}
            onSelect={handlePeriodChange}
          />
        }
      />

      <div className="flex-grow overflow-y-auto p-6">
        <Tabs.Root value={activeTab} onValueChange={handleTabChange} className="w-full">
          <Tabs.List className="mb-6">
            <Tabs.Trigger value="branch">Chi nhánh nội bộ</Tabs.Trigger>
            <Tabs.Trigger value="f2">Đại lý liên kết F2</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="branch" className="space-y-6">
            {isLoadingPartner ? (
              <div className="flex h-64 items-center justify-center">
                <Loading size="lg" />
              </div>
            ) : (
              <>
                {partnerChartData.length > 0 && (
                  <Card className="border-border-1 border bg-white p-4 shadow-sm">
                    <Text size="3" className="mb-4 block font-semibold">
                      Biểu đồ so sánh công nợ chi nhánh
                    </Text>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={partnerChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tickLine={false} />
                          <YAxis tickFormatter={(val) => `${val / 1000000}M`} tickLine={false} />
                          <Tooltip formatter={(value) => formatCurrencyVND(Number(value))} />
                          <Legend />
                          <Bar dataKey="Phải thu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Phải chi" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Dư nợ" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                <div className="flex-grow overflow-x-auto overflow-y-auto pt-0 pb-10">
                  <Table
                    data={partnerData}
                    columns={partnerColumns}
                    isLoading={isLoadingPartner}
                    showSTT={false}
                    enablePagination={false}
                    manualPagination={true}
                    totalRecords={partnerData.length}
                    pageSize={partnerData.length || 10}
                    pageCount={1}
                    currentPageIndex={0}
                    onPaginationChange={() => {}}
                    emptyMessage="Không có dữ liệu"
                    bordered
                    showSummaryRow
                    summaryRowCount={partnerData.length}
                    disableInnerOverflow
                    paginationPosition="static"
                    stickyHeader
                  />
                </div>
              </>
            )}
          </Tabs.Content>

          <Tabs.Content value="f2" className="space-y-6">
            {isLoadingF2 ? (
              <div className="flex h-64 items-center justify-center">
                <Loading size="lg" />
              </div>
            ) : (
              <>
                {f2ChartData.length > 0 && (
                  <Card className="border-border-1 border bg-white p-4 shadow-sm">
                    <Text size="3" className="mb-4 block font-semibold">
                      Biểu đồ so sánh công nợ Đại lý F2
                    </Text>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={f2ChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tickLine={false} />
                          <YAxis tickFormatter={(val) => `${val / 1000000}M`} tickLine={false} />
                          <Tooltip formatter={(value) => formatCurrencyVND(Number(value))} />
                          <Legend />
                          <Bar dataKey="Dự kiến" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Đã chi" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Dư nợ" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                <div className="flex-grow overflow-x-auto overflow-y-auto pt-0 pb-10">
                  <Table
                    data={f2Data}
                    columns={f2Columns}
                    isLoading={isLoadingF2}
                    showSTT={false}
                    enablePagination={false}
                    manualPagination={true}
                    totalRecords={f2Data.length}
                    pageSize={f2Data.length || 10}
                    pageCount={1}
                    currentPageIndex={0}
                    onPaginationChange={() => {}}
                    emptyMessage="Không có dữ liệu"
                    bordered
                    showSummaryRow
                    summaryRowCount={f2Data.length}
                    disableInnerOverflow
                    paginationPosition="static"
                    stickyHeader
                  />
                </div>
              </>
            )}
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  )
}
