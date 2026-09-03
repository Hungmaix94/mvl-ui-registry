import DoughnutChart, { ChartSegment } from '@/components/ui/chart/DoughnutChart.tsx'
import { useMemo, useRef } from 'react'
import { cn } from '@/utils'
import { APP_PATH } from '@/routes'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import { exportElementToPdf } from '@/utils/exportChart.ts'
import { useRecruitmentDashboardChartPermission } from '@/features/dashboard/hooks/useRecruitmentDashboardChartPermission.tsx'
import { useCostBreakdown } from '@/services'
import { useRecruitmentDashboardFilter } from '@/features/dashboard/hooks/useRecruitmentDashboardFilter.tsx'
import { LoadingWrapper } from '@/components'
import { formatDateRangeText } from '@/utils/date-utils.ts'

function RecruitmentCostChart() {
  const chartRef = useRef<HTMLDivElement>(null)

  const { canViewChart } = useRecruitmentDashboardChartPermission(
    'recruitment_reports.recruitment_cost'
  )

  const { openFilterModal, apiParams, subTitle, filterCount, filterParams } =
    useRecruitmentDashboardFilter({ includeBranch: false })

  const { data: apiData, isLoading } = useCostBreakdown(apiParams)
  const apiFilteredDateRange = useMemo(
    () => formatDateRangeText(apiData?.report_from_date, apiData?.report_to_date),
    [apiData?.report_from_date, apiData?.report_to_date]
  )

  const data = useMemo((): ChartSegment[] => {
    const response = apiData?.data
    if (!response) {
      return []
    }

    return response.map((item) => ({
      label: item.source_type,
      percentage: item.percentage,
      count: item.total_cost,
    }))
  }, [apiData?.data])

  const handleDownloadChart = async () => {
    if (!chartRef.current) return

    await exportElementToPdf(chartRef.current, {
      fileName: 'bieu-do-chi-phi-tuyen-dung.pdf',
      overlayMessage: 'Đang tạo biểu đồ Chi phí tuyển dụng...',
    })
  }

  const handleFilter = () => {
    openFilterModal()
  }

  if (!canViewChart) {
    return null
  }

  return (
    <div className={cn('border-border-1 border-r border-b p-2')}>
      <div ref={chartRef} className={cn('flex flex-col gap-8 bg-white')}>
        <DashboardChartTitle
          reportLink={APP_PATH.REPORT_RECRUITMENT_EXPENSE_BY_SOURCE}
          title={'Chi phí tuyển dụng theo nguồn'}
          subTitle={apiFilteredDateRange || subTitle}
          filterCount={filterCount}
          handleDownloadChart={handleDownloadChart}
          handleFilter={handleFilter}
          filterParams={filterParams}
        />
        <LoadingWrapper
          isLoading={isLoading}
          data={data}
          noDataMessage={'Không có dữ liệu để hiển thị'}
          hasActiveFilters={filterCount > 0}
        >
          <DoughnutChart segments={data} />
        </LoadingWrapper>
      </div>
    </div>
  )
}

export default RecruitmentCostChart
