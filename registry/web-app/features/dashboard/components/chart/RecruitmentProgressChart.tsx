import { ApiPaths } from '@/api/schema'
import CustomBarChart from '@/components/ui/chart/CustomBarChart.tsx'
import { useMemo, useRef } from 'react'
import { cn } from '@/utils'
import { APP_PATH } from '@/routes'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import { exportElementToPdf } from '@/utils/exportChart.ts'
import { useRecruitmentDashboardChartPermission } from '@/features/dashboard/hooks/useRecruitmentDashboardChartPermission.tsx'
import { useMonthlyTrends } from '@/services'
import { useRecruitmentDashboardFilterForMonthlyCharts } from '@/features/dashboard/hooks/useRecruitmentDashboardFilterForMonthlyCharts.tsx'
import { LoadingWrapper } from '@/components'
import { formatDateRangeText } from '@/utils/date-utils.ts'

interface MonthlyTrendChartItem {
  label: string
  [key: string]: string | number
}

function RecruitmentProgressChart() {
  const chartRef = useRef<HTMLDivElement>(null)

  const { canViewChart } = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.monthly_trends_chart'
  )

  const { openFilterModal, apiParams, filterCount, subTitle, filterParams } =
    useRecruitmentDashboardFilterForMonthlyCharts({ includeBranch: false })

  const { data: apiData, isLoading } = useMonthlyTrends(apiParams)
  const apiFilteredDateRange = useMemo(
    () => formatDateRangeText(apiData?.report_from_date, apiData?.report_to_date),
    [apiData?.report_from_date, apiData?.report_to_date]
  )

  const { months = [], source_type_names = [], data: sources = [] } = apiData?.data || {}

  const monthlyTrendsData: MonthlyTrendChartItem[] = useMemo(() => {
    if (!months.length || !sources.length) {
      return []
    }

    return months.map((month, monthIndex) => {
      const entry: MonthlyTrendChartItem = { label: month }
      sources.forEach((source) => {
        entry[source.name] = source.statistics[monthIndex] ?? 0
      })
      return entry
    })
  }, [months, sources])

  const handleDownloadChart = async () => {
    if (!chartRef.current) return

    await exportElementToPdf(chartRef.current, {
      fileName: 'bieu-do-so-lieu-tuyen-moi-theo-nguon-va-kenh-tuyen-dung.pdf',
      overlayMessage: 'Đang tạo biểu đồ Số liệu tuyển mới theo nguồn và kênh tuyển dụng...',
      orientation: 'landscape',
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
      className={cn('flex flex-col gap-8 p-5', 'border-border-1 border border-t-0', 'bg-white')}
      data-api={ApiPaths.hrm_dashboard_charts_monthly_trends_retrieve}
    >
      <DashboardChartTitle
        reportLink={APP_PATH.REPORT_RECRUITMENT_SOURCE}
        title={'Số liệu tuyển mới theo nguồn và kênh tuyển dụng'}
        subTitle={apiFilteredDateRange || subTitle}
        filterCount={filterCount}
        handleDownloadChart={handleDownloadChart}
        handleFilter={handleFilter}
        filterParams={filterParams}
      />
      <LoadingWrapper
        isLoading={isLoading}
        data={monthlyTrendsData}
        noDataMessage={'Không có dữ liệu để hiển thị'}
        hasActiveFilters={filterCount > 0}
      >
        <div className="h-full">
          <CustomBarChart data={monthlyTrendsData} dataKeys={source_type_names} dataKey="label" />
        </div>
      </LoadingWrapper>
    </div>
  )
}

export default RecruitmentProgressChart
