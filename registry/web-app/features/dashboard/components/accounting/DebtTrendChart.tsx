import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LoadingWrapper } from '@/components'
import { Select } from '@/components/ui/select'
import { useAccountantDashboardDebtTrend } from '@/features/accounting/accountant-dashboard/services/accountant-dashboard-service'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import { DEBT_TREND_COLORS, ONE_BILLION } from './accountant-dashboard-constants'

const SERIES_NAMES = {
  investorReceivable: 'Công nợ phải thu (CĐT)',
  f2Payable: 'Công nợ phải trả (F2)',
} as const

/** Year options run from the current year back to this year (system has no earlier data) */
const MIN_SELECTABLE_YEAR = 2025

function formatBillionTick(value: number) {
  if (value === 0) return '0'
  return `${formatNumber(value / ONE_BILLION, { maximumFractionDigits: 1 })}T`
}

function renderLegendText(value: string) {
  return <span className="text-content-dark-2 px-1 text-[13px] font-semibold">{value}</span>
}

function DebtTrendChart() {
  const [year, setYear] = useState<number | null>(null)

  const { data, isLoading } = useAccountantDashboardDebtTrend(year ? { year } : undefined)

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const count = Math.max(1, currentYear - MIN_SELECTABLE_YEAR + 1)
    return Array.from({ length: count }, (_, i) => ({
      value: currentYear - i,
      label: `Năm ${currentYear - i}`,
    }))
  }, [])

  const chartData = useMemo(() => {
    const months = data?.months ?? []
    return months.map((m) => ({
      label: `T${String(m.month).padStart(2, '0')}`,
      investorReceivable: Number(m.investor_receivable) || 0,
      f2Payable: Number(m.f2_payable) || 0,
    }))
  }, [data])

  const yearRangeLabel = useMemo(() => {
    const months = data?.months ?? []
    if (months.length === 0) return ''
    const firstYear = months[0].year
    const lastYear = months[months.length - 1].year
    return firstYear === lastYear ? String(firstYear) : `${firstYear} - ${lastYear}`
  }, [data])

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <h2 className="typo-body-large-semibold text-content-dark-1">
            Xu hướng công nợ {year ? '12 tháng' : '6 tháng'}
          </h2>
          {yearRangeLabel && (
            <span className="text-content-dark-2 rounded bg-gray-100 px-2 py-0.5 text-sm font-medium">
              {yearRangeLabel}
            </span>
          )}
        </div>
        <Select
          options={yearOptions}
          value={year}
          onChange={(next) => setYear(typeof next === 'number' ? next : null)}
          placeholder="6 tháng gần nhất"
          clearable
          wrapperClassName="w-[180px]"
        />
      </div>

      <p className="text-content-dark-3 text-right text-xs">
        Đơn vị: Tỷ (T = {formatNumber(ONE_BILLION)} VND)
      </p>

      <LoadingWrapper isLoading={isLoading} containerHeight={360} data={chartData}>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={chartData} barGap={4} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
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
            <ReferenceLine y={0} stroke="#d4d4d4" />
            <Tooltip
              formatter={(value, name) => [`${formatCurrencyVND(Number(value))} VND`, name]}
              cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #e5e5e5',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                fontSize: 13,
              }}
            />
            <Legend
              iconType="square"
              iconSize={12}
              formatter={renderLegendText}
              wrapperStyle={{ paddingTop: 16 }}
            />
            <Bar
              dataKey="investorReceivable"
              name={SERIES_NAMES.investorReceivable}
              fill={DEBT_TREND_COLORS.investorReceivable}
              maxBarSize={30}
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="f2Payable"
              name={SERIES_NAMES.f2Payable}
              fill={DEBT_TREND_COLORS.f2Payable}
              maxBarSize={30}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </LoadingWrapper>
    </div>
  )
}

export default DebtTrendChart
