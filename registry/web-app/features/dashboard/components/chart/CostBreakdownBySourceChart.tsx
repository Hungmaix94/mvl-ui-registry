import { ApiPaths } from '@/api/schema'
import CostBySourceBarChart, {
  type CostBySourceDataItem,
  type CostBySourceSegment,
} from '@/components/ui/chart/CostBySourceBarChart.tsx'
import { getColorForLabelByIndex } from '@/components/ui/chart/utils'
import { useMemo, useRef } from 'react'
import { APP_PATH } from '@/routes'
import { useCostBreakdownBySource } from '@/services'
import { formatDateRangeText, formatMonthKeyFromApi } from '@/utils/date-utils.ts'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import { exportElementToPdf } from '@/utils/exportChart.ts'
import { useRecruitmentDashboardChartPermission } from '@/features/dashboard/hooks/useRecruitmentDashboardChartPermission.tsx'
import { useCostBreakdownBySourceFilter } from '@/features/dashboard/hooks/useCostBreakdownBySourceFilter.tsx'
import { LoadingWrapper } from '@/components'
import { formatCurrencyVND } from '@/utils/common'
import { Text } from '@/components/ui'

/** Hex for SVG line stroke (CSS var can be invisible in Recharts SVG) */
const LINE_COLOR = '#D4A017'
const AVERAGE_COST_LABEL = 'Chi phí trung bình (₫)'
const Y_AXIS_COST_LABEL = 'Chi phí (₫)'

type CostBreakdownBySourceChartProps = { compact?: boolean }

function CostBreakdownBySourceChart({ compact }: CostBreakdownBySourceChartProps = {}) {
  const chartRef = useRef<HTMLDivElement>(null)

  const { canViewChart } = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.cost_breakdown_by_source_chart'
  )

  const { openFilterModal, apiParams, subTitle, filterCount, filterParams } =
    useCostBreakdownBySourceFilter()

  const { data: apiData, isLoading } = useCostBreakdownBySource(apiParams)
  const apiFilteredDateRange = useMemo(
    () => formatDateRangeText(apiData?.report_from_date, apiData?.report_to_date),
    [apiData?.report_from_date, apiData?.report_to_date]
  )

  const aggregation = apiData?.data
  const chartData = useMemo((): CostBySourceDataItem[] => {
    if (!aggregation?.data?.length || !aggregation?.months?.length) {
      return []
    }
    const { data: sourceRows, months } = aggregation
    return months.map((monthKey, monthIndex) => {
      const label = formatMonthKeyFromApi(monthKey)
      const item: CostBySourceDataItem = { label }
      let totalCost = 0
      let totalHires = 0
      sourceRows.forEach((row, sourceIndex) => {
        const statForMonth = row.statistics?.[monthIndex]
        // New BE semantics: total_cost = paid + expected (đã chi + dự kiến),
        // paid_cost = đã chi, expected_cost = dự kiến. Stack đã chi (solid, bottom)
        // + dự kiến (light, top); they sum to total_cost.
        const monthPaid = statForMonth?.paid_cost ?? 0
        const monthExpected = statForMonth?.expected_cost ?? 0
        const monthTotal = statForMonth?.total_cost ?? 0
        const monthHires = statForMonth?.total_hires ?? 0

        item[`source_${sourceIndex}`] = monthPaid
        item[`expected_${sourceIndex}`] = monthExpected
        item[`expected_raw_${sourceIndex}`] = monthExpected
        totalCost += monthTotal
        totalHires += monthHires
      })
      // Line = average cost per hire across all sources, on the total (avg tổng).
      item.averageCost = totalHires > 0 ? Math.round(totalCost / totalHires) : 0
      return item
    })
  }, [aggregation])

  const segments = useMemo((): CostBySourceSegment[] => {
    const names = aggregation?.source_names ?? aggregation?.data?.map((d) => d.name) ?? []
    return names.map((name, i) => ({
      dataKey: `source_${i}`,
      expectedDataKey: `expected_${i}`,
      expectedRawDataKey: `expected_raw_${i}`,
      name,
      color: getColorForLabelByIndex(i).backgroundColor,
    }))
  }, [aggregation])

  const lineSeries = useMemo(
    () => ({
      dataKey: 'averageCost',
      name: AVERAGE_COST_LABEL,
      color: LINE_COLOR,
    }),
    []
  )

  const handleDownloadChart = async () => {
    if (!chartRef.current) return
    await exportElementToPdf(chartRef.current, {
      fileName: 'bieu-do-chi-phi-theo-nguon.pdf',
      overlayMessage: 'Đang tạo biểu đồ Chi phí theo nguồn...',
    })
  }

  const handleFilter = () => {
    openFilterModal()
  }

  if (!canViewChart) {
    return null
  }

  return (
    <div
      ref={chartRef}
      className="bg-background-1 flex flex-col gap-2"
      data-api={ApiPaths.hrm_dashboard_charts_cost_breakdown_by_source_retrieve}
    >
      <DashboardChartTitle
        reportLink={APP_PATH.REPORT_RECRUITMENT_EXPENSE_BY_SOURCE}
        title={'Chi phí theo nguồn'}
        subTitle={apiFilteredDateRange ?? subTitle}
        filterCount={filterCount}
        handleDownloadChart={handleDownloadChart}
        handleFilter={handleFilter}
        filterParams={filterParams}
      />
      {(isLoading || apiData?.avg_cost_ytd) && (
        <div className="flex justify-around">
          <div>&nbsp;</div>
          <div className="border-data-red-default bg-data-red-disabled min-w-[280px] rounded border px-6 py-3 text-center">
            <Text className="typo-body-base-medium text-data-red-default">
              Chi phí trung bình từ đầu năm:{' '}
              {isLoading ? '…' : formatCurrencyVND(apiData?.avg_cost_ytd ?? '')}
            </Text>
          </div>
        </div>
      )}
      <LoadingWrapper
        isLoading={isLoading}
        data={chartData}
        noDataMessage={'Không có dữ liệu để hiển thị'}
        hasActiveFilters={filterCount > 0}
      >
        <CostBySourceBarChart
          data={chartData}
          segments={segments}
          lineSeries={lineSeries}
          yAxisLabel={Y_AXIS_COST_LABEL}
          rightYAxisLabel={AVERAGE_COST_LABEL}
          height={compact ? 320 : 500}
        />
      </LoadingWrapper>
    </div>
  )
}

export default CostBreakdownBySourceChart
