import { useMemo } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LoadingWrapper } from '@/components'
import { TrendChartSkeleton } from './dashboard-skeletons'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import { useRevenueTrendFilter } from '@/features/dashboard/hooks/useRevenueTrendFilter.tsx'
import { useAdminDashboardRevenueTrend } from '@/features/sales/admin-dashboard/services/admin-dashboard-service'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import { ONE_BILLION, REVENUE_TREND_COLORS } from './sales-admin-dashboard-constants'

const SERIES_NAMES = {
  revenue: 'Doanh thu',
  dealCount: 'Số giao dịch',
} as const

function formatBillionTick(value: number) {
  if (value === 0) return '0'
  return `${formatNumber(value / ONE_BILLION, { maximumFractionDigits: 1 })}T`
}

function renderLegendText(value: string) {
  return <span className="text-content-dark-2 px-1 text-[13px] font-semibold">{value}</span>
}

function RevenueTrendChart() {
  const { openFilterModal, apiParams, subTitle, filterCount } = useRevenueTrendFilter()

  const { data, isLoading } = useAdminDashboardRevenueTrend(apiParams)

  const chartData = useMemo(
    () =>
      (data?.points ?? []).map((p) => ({
        label: p.label,
        revenue: Number(p.revenue_amount) || 0,
        dealCount: p.deal_count,
      })),
    [data]
  )

  return (
    <div className="border-border-1 flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm">
      <DashboardChartTitle
        title="Xu hướng doanh thu"
        subTitle={subTitle}
        handleFilter={openFilterModal}
        filterCount={filterCount}
      />

      <p className="text-content-dark-3 text-right text-xs">
        Đơn vị doanh thu: Tỷ (T = {formatNumber(ONE_BILLION)} VND)
      </p>

      <LoadingWrapper
        isLoading={isLoading}
        containerHeight={360}
        data={chartData}
        hasActiveFilters={filterCount > 0}
        loadingSkeleton={<TrendChartSkeleton />}
      >
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
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
              yAxisId="revenue"
              tickFormatter={formatBillionTick}
              tickLine={false}
              axisLine={false}
              fontSize={13}
              width={48}
              stroke="#737373"
            />
            <YAxis
              yAxisId="deal"
              orientation="right"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              fontSize={13}
              width={40}
              stroke="#737373"
            />
            <Tooltip
              formatter={(value, name) =>
                name === SERIES_NAMES.revenue
                  ? [`${formatCurrencyVND(Number(value))} VND`, name]
                  : [formatNumber(Number(value)), name]
              }
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
              yAxisId="revenue"
              dataKey="revenue"
              name={SERIES_NAMES.revenue}
              fill={REVENUE_TREND_COLORS.revenue}
              maxBarSize={36}
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="deal"
              type="monotone"
              dataKey="dealCount"
              name={SERIES_NAMES.dealCount}
              stroke={REVENUE_TREND_COLORS.dealCount}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </LoadingWrapper>
    </div>
  )
}

export default RevenueTrendChart
