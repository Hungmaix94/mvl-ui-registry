import { ApiPaths } from '@/api/schema'
import { LoadingWrapper } from '@/components'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import { useRecruitmentDashboardChartPermission } from '@/features/dashboard/hooks/useRecruitmentDashboardChartPermission.tsx'
import { useRecruitmentDashboardFilterForMonthlyCharts } from '@/features/dashboard/hooks/useRecruitmentDashboardFilterForMonthlyCharts.tsx'
import { useStaffGrowthByBranches } from '@/services'
import { APP_PATH } from '@/routes'
import { exportElementToPdf } from '@/utils/exportChart.ts'
import { formatDateRangeText } from '@/utils/date-utils.ts'
import { useMemo, useRef } from 'react'
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
import { getColorForLabelByIndex } from '@/components/ui/chart/utils'
import { cn } from '@/utils'
import { Text } from '@/components/ui'

type StaffGrowthByBranchesChartProps = { compact?: boolean }

type StaffGrowthChartRow = {
  label: string
  newHires: number
  resignations: number
  growth: number
}

const MAX_BRANCH_LABEL_LENGTH = 10
const ROTATE_LABEL_BRANCH_THRESHOLD = 8

function truncateBranchLabel(label: string): string {
  if (label.length <= MAX_BRANCH_LABEL_LENGTH) {
    return label
  }
  return `${label.slice(0, MAX_BRANCH_LABEL_LENGTH - 1)}…`
}

function StaffGrowthByBranchesChart({ compact }: StaffGrowthByBranchesChartProps = {}) {
  const chartRef = useRef<HTMLDivElement>(null)
  const { canViewChart } = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.staff_growth_by_branches_chart'
  )

  const { openFilterModal, apiParams, subTitle, filterCount, filterParams } =
    useRecruitmentDashboardFilterForMonthlyCharts({
      includeBranch: true,
      allowMultipleBranch: true,
      branchParamKey: 'branches',
    })

  const { data: apiData, isLoading } = useStaffGrowthByBranches(apiParams)

  const apiFilteredDateRange = useMemo(
    () => formatDateRangeText(apiData?.report_from_date, apiData?.report_to_date),
    [apiData?.report_from_date, apiData?.report_to_date]
  )

  const aggregation = apiData?.data
  const totalCompanyGrowth = aggregation?.total?.growth

  const chartData = useMemo((): StaffGrowthChartRow[] => {
    if (!aggregation?.data?.length) {
      return []
    }

    return aggregation.data.map((branchRow) => {
      const totals = (branchRow.statistics || []).reduce(
        (acc, item) => ({
          newHires: acc.newHires + (item?.new_hires ?? 0),
          resignations: acc.resignations + (item?.resignations ?? 0),
        }),
        { newHires: 0, resignations: 0 }
      )

      return {
        label: branchRow.name,
        newHires: totals.newHires,
        resignations: totals.resignations,
        growth: totals.newHires - totals.resignations,
      }
    })
  }, [aggregation])

  const shouldRotateXAxisLabels = useMemo(() => {
    return chartData.length > ROTATE_LABEL_BRANCH_THRESHOLD
  }, [chartData.length])

  const newHiresColor = getColorForLabelByIndex(0).backgroundColor
  const resignationsColor = getColorForLabelByIndex(1).backgroundColor
  const growthColor = getColorForLabelByIndex(2).backgroundColor

  const handleDownloadChart = async () => {
    if (!chartRef.current) return
    await exportElementToPdf(chartRef.current, {
      fileName: 'bieu-do-tang-truong-nhan-su-theo-chi-nhanh.pdf',
      overlayMessage: 'Đang tạo biểu đồ tăng trưởng nhân sự theo chi nhánh...',
      orientation: 'landscape',
    })
  }

  if (!canViewChart) {
    return null
  }

  return (
    <div
      ref={chartRef}
      className={cn('flex flex-col gap-8 p-5', 'bg-white', 'border-border-1 border border-t-1')}
      data-api={ApiPaths.hrm_dashboard_charts_staff_growth_by_branches_retrieve}
    >
      <DashboardChartTitle
        reportLink={APP_PATH.REPORT_RECRUITMENT_STAFF_GROWTH_WEEKLY}
        title="Tăng trưởng nhân sự theo chi nhánh"
        subTitle={apiFilteredDateRange || subTitle}
        filterCount={filterCount}
        handleDownloadChart={handleDownloadChart}
        handleFilter={openFilterModal}
        filterParams={filterParams}
      />
      {(isLoading || totalCompanyGrowth !== undefined) && (
        <div className="flex justify-around">
          <div>&nbsp;</div>
          <div className="border-data-red-default bg-data-red-disabled min-w-[280px] rounded border px-6 py-3 text-center">
            <Text className="typo-body-base-medium text-data-red-default">
              Tổng tăng trưởng toàn công ty: {isLoading ? '…' : (totalCompanyGrowth ?? 0)}
            </Text>
          </div>
        </div>
      )}
      <LoadingWrapper
        isLoading={isLoading}
        data={chartData}
        noDataMessage="Không có dữ liệu để hiển thị"
        hasActiveFilters={filterCount > 0}
      >
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height={compact ? 320 : 440}>
            <ComposedChart data={chartData} margin={{ top: 20, right: 24, left: 8, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                interval={0}
                height={shouldRotateXAxisLabels ? 64 : 44}
                tickLine={false}
                tick={({ x = 0, y = 0, payload }) => {
                  const rawLabel = String(payload?.value ?? '')
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        transform={shouldRotateXAxisLabels ? 'rotate(-90)' : undefined}
                        x={0}
                        y={0}
                        dy={shouldRotateXAxisLabels ? -6 : 16}
                        textAnchor={shouldRotateXAxisLabels ? 'end' : 'middle'}
                        fill="var(--color-content-dark-2)"
                        fontSize={12}
                      >
                        <title>{rawLabel}</title>
                        {shouldRotateXAxisLabels ? truncateBranchLabel(rawLabel) : rawLabel}
                      </text>
                    </g>
                  )
                }}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ paddingTop: 32 }} />
              <Bar
                yAxisId="left"
                dataKey="newHires"
                name="Tuyển mới"
                fill={newHiresColor}
                maxBarSize={56}
              />
              <Bar
                yAxisId="left"
                dataKey="resignations"
                name="Nghỉ việc"
                fill={resignationsColor}
                maxBarSize={56}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="growth"
                name="Tăng trưởng"
                stroke={growthColor}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </LoadingWrapper>
    </div>
  )
}

export default StaffGrowthByBranchesChart
