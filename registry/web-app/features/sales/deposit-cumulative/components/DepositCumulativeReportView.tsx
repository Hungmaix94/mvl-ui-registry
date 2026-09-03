import { useCallback, useMemo, useRef, useState } from 'react'
import { Table as RadixTable } from '@radix-ui/themes'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageTitle from '@/components/ui/page-title/PageTitle'
import AppDialog from '@/components/dialog/AppDialog'
import { Button } from '@/components/ui/button'
import { LoadingWrapper } from '@/components'
import { IconDownloadsimple } from '@/assets/icons'
import { getColorForLabelByIndex } from '@/components/ui/chart/utils'
import { useAbility } from '@/lib/ability'
import { useApiQuery } from '@/hooks/useApiQuery'
import { QUERY_KEYS } from '@/constants'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { useDepositCumulativeFilters } from '@/features/sales/deposit-cumulative/hooks/useDepositCumulativeFilters'
import DepositCumulativeFilterForm, {
  type DepositCumulativeFilterFormRef,
} from '@/features/sales/deposit-cumulative/components/DepositCumulativeFilterForm'
import {
  buildCumulativeChartData,
  getUnitNames,
  SUMMARY_KEY,
} from '@/features/sales/deposit-cumulative/components/deposit-cumulative-chart'
import type { DepositCumulativeResponse } from '@/features/sales/deposit-cumulative/services/deposit-cumulative-service'
import type { DepositCumulativeReportConfig } from '@/features/sales/deposit-cumulative/constants'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import toastService from '@/services/toast-service'

const ONE_BILLION = 1_000_000_000

function formatBillionTick(value: number) {
  if (value === 0) return '0'
  return `${formatNumber(value / ONE_BILLION, { maximumFractionDigits: 1 })}T`
}

function renderLegendText(value: string) {
  return <span className="text-content-dark-2 px-1 text-[13px] font-semibold">{value}</span>
}

function getQueryKey(
  dimension: DepositCumulativeReportConfig['dimension'],
  params: Record<string, unknown>
) {
  return dimension === 'branch'
    ? QUERY_KEYS.SALES.DEPOSIT_CUMULATIVE.BY_BRANCH(params)
    : QUERY_KEYS.SALES.DEPOSIT_CUMULATIVE.BY_BLOCK(params)
}

type DepositCumulativeReportViewProps = {
  config: DepositCumulativeReportConfig
}

export default function DepositCumulativeReportView({ config }: DepositCumulativeReportViewProps) {
  const {
    title,
    dimensionLabel,
    permission,
    exportFilename,
    dimension,
    fetchReport,
    exportReport,
  } = config

  const ability = useAbility()
  const canExport = ability.can('get', permission)
  const [isExporting, setIsExporting] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)
  const formRef = useRef<DepositCumulativeFilterFormRef>(null)

  const filters = useDepositCumulativeFilters()
  const {
    params,
    isUrlReady,
    periods,
    activePeriodId,
    patch,
    applyFilters,
    filterFormValues,
    activeFilterCount,
  } = filters

  const { data, isLoading, error } = useApiQuery<DepositCumulativeResponse>(
    getQueryKey(dimension, (params ?? {}) as Record<string, unknown>),
    () => fetchReport(params!) as Promise<DepositCumulativeResponse>,
    { enabled: isUrlReady && !!params, staleTime: 1000 * 60 * 5 }
  )

  const weeks = useMemo(() => data?.weeks ?? [], [data])

  // Ordinary unit rows (summary excluded), sorted by month total descending.
  const rows = useMemo(() => {
    const units = getUnitNames(data)
    return units
      .map((name) => ({ name, cells: data!.data[name] }))
      .sort((a, b) => Number(b.cells.total ?? 0) - Number(a.cells.total ?? 0))
  }, [data])

  const summaryRow = data?.data?.[SUMMARY_KEY]
  const chartData = useMemo(() => buildCumulativeChartData(data), [data])
  const chartUnits = useMemo(() => getUnitNames(data), [data])

  const handleExport = useCallback(async () => {
    if (!params) return
    setIsExporting(true)
    try {
      await exportReport(params, exportFilename)
      toastService.success('Xuất Excel thành công.')
    } catch {
      toastService.error('Xuất Excel thất bại. Vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }, [params, exportReport, exportFilename])

  const colSpan = weeks.length + 3

  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpenKey((key) => key + 1)
    setIsFilterDialogOpen(true)
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues()
    if (!formData) return
    applyFilters(formData)
    setIsFilterDialogOpen(false)
  }, [applyFilters])

  return (
    <div className="bg-neutral-2 flex h-full flex-col">
      <PageTitle
        title={title}
        toolbarLeftContent={
          <AccountingPeriodSelect
            periods={periods}
            selectedPeriodId={activePeriodId}
            onSelect={(periodId) => {
              const period = periods.find((p) => p.id === periodId)
              if (period) patch({ year: period.year, month: period.month })
            }}
          />
        }
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        customActions={
          canExport ? (
            <Button
              variant="secondary-border"
              size="small"
              onClick={handleExport}
              disabled={isExporting || isLoading || !params}
            >
              <span className="flex items-center gap-2">
                <IconDownloadsimple size={16} />
                {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
              </span>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6">
        {error ? (
          <div className="border-border-1 bg-content-light-1 flex flex-1 items-center justify-center rounded-md border p-6 text-red-500">
            Có lỗi xảy ra khi tải dữ liệu: {(error as Error)?.message || 'Unknown error'}
          </div>
        ) : (
          <>
            {/* Cumulative line chart */}
            <div className="border-border-1 bg-content-light-1 flex flex-col gap-2 rounded-md border p-5">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h2 className="typo-body-large-semibold text-content-dark-1">
                  Cọc cộng dồn theo tuần
                </h2>
                <p className="text-content-dark-3 text-xs">
                  Đơn vị: Tỷ (T = {formatNumber(ONE_BILLION)} VND)
                </p>
              </div>
              <LoadingWrapper isLoading={isLoading} containerHeight={360} data={chartData}>
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tickLine={false}
                      axisLine={false}
                      fontSize={13}
                      dy={8}
                      stroke="#737373"
                    />
                    <YAxis
                      tickFormatter={formatBillionTick}
                      tickLine={false}
                      axisLine={false}
                      fontSize={13}
                      width={48}
                      stroke="#737373"
                    />
                    <Tooltip
                      formatter={(value, name) => [`${formatCurrencyVND(Number(value))} VND`, name]}
                      cursor={{ stroke: 'rgba(0, 0, 0, 0.1)' }}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid #e5e5e5',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        fontSize: 13,
                      }}
                    />
                    <Legend
                      iconType="line"
                      iconSize={14}
                      formatter={renderLegendText}
                      wrapperStyle={{ paddingTop: 16 }}
                    />
                    {chartUnits.map((unit, index) => (
                      <Line
                        key={unit}
                        type="monotone"
                        dataKey={unit}
                        name={unit}
                        stroke={getColorForLabelByIndex(index).backgroundColor}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </LoadingWrapper>
            </div>

            {/* Detail table */}
            <div className="flex flex-1 flex-col">
              <LoadingWrapper isLoading={isLoading} containerHeight={300}>
                <RadixTable.Root size="2" variant="surface">
                  <RadixTable.Header>
                    <RadixTable.Row>
                      <RadixTable.ColumnHeaderCell className="w-16">
                        STT
                      </RadixTable.ColumnHeaderCell>
                      <RadixTable.ColumnHeaderCell>{dimensionLabel}</RadixTable.ColumnHeaderCell>
                      {weeks.map((week) => (
                        <RadixTable.ColumnHeaderCell
                          key={week.index}
                          align="right"
                          title={`${formatDate(week.week_start)} – ${formatDate(week.week_end)}`}
                        >
                          Tuần {week.index}
                        </RadixTable.ColumnHeaderCell>
                      ))}
                      <RadixTable.ColumnHeaderCell align="right">Cộng</RadixTable.ColumnHeaderCell>
                    </RadixTable.Row>
                  </RadixTable.Header>
                  <RadixTable.Body>
                    {rows.length === 0 ? (
                      <RadixTable.Row>
                        <RadixTable.Cell colSpan={colSpan}>
                          <p className="text-content-dark-3 py-6 text-center text-sm">
                            Không có dữ liệu
                          </p>
                        </RadixTable.Cell>
                      </RadixTable.Row>
                    ) : (
                      <>
                        {rows.map((row, index) => (
                          <RadixTable.Row key={row.name}>
                            <RadixTable.Cell className="text-content-dark-3">
                              {index + 1}
                            </RadixTable.Cell>
                            <RadixTable.Cell className="font-medium" title={row.name}>
                              {row.name}
                            </RadixTable.Cell>
                            {weeks.map((week) => (
                              <RadixTable.Cell key={week.index} align="right" className="">
                                {formatCurrencyVND(Number(row.cells[String(week.index)] ?? 0))}
                              </RadixTable.Cell>
                            ))}
                            <RadixTable.Cell align="right" className="font-semibold">
                              {formatCurrencyVND(Number(row.cells.total ?? 0))}
                            </RadixTable.Cell>
                          </RadixTable.Row>
                        ))}
                        {summaryRow && (
                          <RadixTable.Row className="bg-neutral-10 border-neutral-60 border-t border-double font-bold">
                            <RadixTable.Cell colSpan={2}>Tổng cộng</RadixTable.Cell>
                            {weeks.map((week) => (
                              <RadixTable.Cell key={week.index} align="right" className="">
                                {formatCurrencyVND(Number(summaryRow[String(week.index)] ?? 0))}
                              </RadixTable.Cell>
                            ))}
                            <RadixTable.Cell align="right" className="">
                              {formatCurrencyVND(Number(summaryRow.total ?? 0))}
                            </RadixTable.Cell>
                          </RadixTable.Row>
                        )}
                      </>
                    )}
                  </RadixTable.Body>
                </RadixTable.Root>
              </LoadingWrapper>
            </div>
          </>
        )}
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <DepositCumulativeFilterForm
            key={String(filterDialogOpenKey)}
            ref={formRef}
            initialValues={filterFormValues}
          />
        }
        onClearFilter={() => formRef.current?.clearForm()}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}
