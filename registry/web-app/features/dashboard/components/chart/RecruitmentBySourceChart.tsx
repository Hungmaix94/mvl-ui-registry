import { ApiPaths } from '@/api/schema'
import DoughnutChart, { ChartSegment } from '@/components/ui/chart/DoughnutChart.tsx'
import { useMemo, useRef } from 'react'
import { APP_PATH } from '@/routes'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import { exportElementToPdf } from '@/utils/exportChart.ts'
import { useRecruitmentDashboardChartPermission } from '@/features/dashboard/hooks/useRecruitmentDashboardChartPermission.tsx'
import { useSourceTypeBreakdown } from '@/services'
import { useRecruitmentDashboardFilter } from '@/features/dashboard/hooks/useRecruitmentDashboardFilter.tsx'
import { LoadingWrapper } from '@/components'
import { formatDateRangeText } from '@/utils/date-utils.ts'

type RecruitmentBySourceChartProps = { compact?: boolean }

function RecruitmentBySourceChart({ compact }: RecruitmentBySourceChartProps = {}) {
  const chartRef = useRef<HTMLDivElement>(null)

  const { canViewChart } = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.source_type_breakdown_chart'
  )

  const { openFilterModal, subTitle, apiParams, filterCount, filterParams } =
    useRecruitmentDashboardFilter({ includeBranch: false })

  const { data: apiData, isLoading } = useSourceTypeBreakdown(apiParams)
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
      count: item.count,
    }))
  }, [apiData?.data])

  const handleDownloadChart = async () => {
    if (!chartRef.current) return

    await exportElementToPdf(chartRef.current, {
      fileName: 'bieu-do-ty-le-tuyen-moi-theo-nguon-va-kenh-tuyen-dung.pdf',
      overlayMessage: 'Đang tạo biểu đồ Tỷ lệ tuyển mới theo nguồn và kênh tuyển dụng...',
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
      className="flex flex-col gap-8 bg-white"
      data-api={ApiPaths.hrm_dashboard_charts_source_type_breakdown_retrieve}
    >
      <DashboardChartTitle
        reportLink={APP_PATH.REPORT_RECRUITMENT_SOURCE}
        title={'Tỷ lệ tuyển mới theo nguồn và kênh tuyển dụng'}
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
        <DoughnutChart segments={data} compact={compact} />
      </LoadingWrapper>
    </div>
  )
}

export default RecruitmentBySourceChart
