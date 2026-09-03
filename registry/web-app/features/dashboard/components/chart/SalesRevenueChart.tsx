import { ApiPaths } from '@/api/schema'
import { useMemo, useRef } from 'react'
import { eachMonthOfInterval, format } from 'date-fns'
import { cn } from '@/utils'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import { exportElementToPdf } from '@/utils/exportChart.ts'
import { useSalesRevenueReportsChart } from '@/services'
import { LoadingWrapper } from '@/components'
import StackedBarChart, {
  type StackedBarDataItem,
  type StackedBarSegment,
} from '@/components/ui/chart/StackedBarChart.tsx'
import { useSalesRevenueDashboardFilter } from '@/features/dashboard/hooks/useSalesRevenueDashboardFilter.tsx'
import { APP_PATH } from '@/routes'

const COLORS = {
  withRevenue: '#D32F2F', // Darker red for employees with revenue
  withoutRevenue: '#EF9A9A', // Lighter red/pink for employees without revenue
}

function SalesRevenueChart() {
  const chartRef = useRef<HTMLDivElement>(null)

  const { openFilterModal, apiParams, subTitle, filterCount, filterParams } =
    useSalesRevenueDashboardFilter()

  const { data: apiData, isLoading } = useSalesRevenueReportsChart(apiParams)

  const chartData = useMemo((): StackedBarDataItem[] => {
    const responseData = apiData?.data
    if (!responseData || !Array.isArray(responseData)) {
      return []
    }

    // Try to use filter range, otherwise fallback to data range or returned data
    let dateRange = filterParams?.dateRange

    // If no filtered range (e.g. initial load or default), try to infer from data or use default logic?
    // The requirement is specific to "transform data map with filter date range".
    // If dateRange is incomplete, we can't build an interval.
    if (!dateRange?.from || !dateRange?.to) {
      // If we don't have a specific range, just format the API data as before
      return responseData.map((item: any) => ({
        label: item.month,
        employeesWithRevenue: item.employees_with_revenue,
        employeesWithoutRevenue: item.total_employees - item.employees_with_revenue,
        totalEmployees: item.total_employees,
        percentage: item.percentage,
      }))
    }

    try {
      // Generate all months in the range
      const months = eachMonthOfInterval({
        start: new Date(dateRange.from),
        end: new Date(dateRange.to),
      })

      return months.map((date) => {
        const monthLabel = format(date, 'MM/yyyy')

        // Find matching data from API
        const item = responseData.find((d: any) => d.month === monthLabel)

        if (item) {
          return {
            label: monthLabel,
            employeesWithRevenue: item.employees_with_revenue,
            employeesWithoutRevenue: item.total_employees - item.employees_with_revenue,
            totalEmployees: item.total_employees,
            percentage: item.percentage,
          }
        }

        // Return empty data for missing months
        return {
          label: monthLabel,
          employeesWithRevenue: 0,
          employeesWithoutRevenue: 0,
          totalEmployees: 0,
          percentage: 0,
        }
      })
    } catch (error) {
      console.error('Error generating chart data interval:', error)
      // Fallback to raw data on error
      return responseData.map((item: any) => ({
        label: item.month,
        employeesWithRevenue: item.employees_with_revenue,
        employeesWithoutRevenue: item.total_employees - item.employees_with_revenue,
        totalEmployees: item.total_employees,
        percentage: item.percentage,
      }))
    }
  }, [apiData, filterParams])

  const labels = useMemo(() => {
    return apiData?.labels || []
  }, [apiData])

  const segments: StackedBarSegment[] = useMemo(
    () => [
      {
        dataKey: 'employeesWithRevenue',
        name: labels[1],
        color: COLORS.withRevenue,
      },
      {
        dataKey: 'employeesWithoutRevenue',
        name: labels[0],
        color: COLORS.withoutRevenue,
        showLabel: false,
      },
    ],
    [labels]
  )

  const handleDownloadChart = async () => {
    if (!chartRef.current) return

    await exportElementToPdf(chartRef.current, {
      fileName: 'ty-le-nhan-vien-dat-doanh-thu.pdf',
      overlayMessage: 'Đang tạo biểu đồ Chất lượng nhân sự khối kinh doanh...',
      orientation: 'landscape',
    })
  }

  const renderCustomTooltip = (active: boolean, payload: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="border-border-1 rounded-lg border bg-white p-3 shadow-lg">
          <p className="typo-body-sm-semibold text-content-dark-1 mb-2">{data.label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.withRevenue }} />
              <span className="typo-body-sm-regular text-content-dark-2">
                {labels[1]}: {data.employeesWithRevenue}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: COLORS.withoutRevenue }}
              />
              <span className="typo-body-sm-regular text-content-dark-2">
                {labels[0]}: {data.totalEmployees}
              </span>
            </div>
            <div className="border-border-1 mt-2 border-t pt-2">
              <span className="typo-body-sm-semibold text-content-dark-1">
                Tỷ lệ: {data.percentage}%
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const getPercentage = (item: StackedBarDataItem) => {
    return (item.percentage as number) || 0
  }

  const getTotalEmployees = (item: StackedBarDataItem) => {
    return (item.totalEmployees as number) || 0
  }

  const renderCustomLegend = () => {
    return (
      <div className="mt-4 flex items-center justify-center gap-6">
        {segments.map((segment) => (
          <div key={segment.dataKey} className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: segment.color }} />
            <span className="typo-body-sm-regular text-content-dark-2">{segment.name}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={chartRef}
      className={cn('flex flex-col gap-8 p-5', 'border-border-1 border', 'bg-white')}
      data-api={ApiPaths.payroll_sales_revenue_reports_chart_retrieve}
    >
      <DashboardChartTitle
        title={'Chất lượng nhân sự khối kinh doanh'}
        subTitle={subTitle}
        handleDownloadChart={handleDownloadChart}
        reportLink={APP_PATH.REPORT_STAFF_SALES_REVENUE}
        handleFilter={openFilterModal}
        filterCount={filterCount}
      />
      <LoadingWrapper
        isLoading={isLoading}
        data={chartData}
        noDataMessage={'Không có dữ liệu để hiển thị'}
        hasActiveFilters={filterCount > 0}
      >
        <StackedBarChart
          data={chartData}
          segments={segments}
          yAxisLabel="Nhân sự"
          height={500}
          showPercentage={true}
          getPercentage={getPercentage}
          showTotalOnTop={true}
          getTotalValue={getTotalEmployees}
          renderCustomTooltip={renderCustomTooltip}
          renderCustomLegend={renderCustomLegend}
          barCategoryGap={12}
          barSize={73}
        />
      </LoadingWrapper>
    </div>
  )
}

export default SalesRevenueChart
