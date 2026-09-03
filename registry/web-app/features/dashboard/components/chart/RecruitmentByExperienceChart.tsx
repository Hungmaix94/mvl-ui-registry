import { ApiPaths } from '@/api/schema'
import DoughnutChart, { ChartSegment } from '@/components/ui/chart/DoughnutChart.tsx'
import { useMemo, useRef } from 'react'
import { APP_PATH } from '@/routes'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import { exportElementToPdf } from '@/utils/exportChart.ts'
import { useRecruitmentDashboardChartPermission } from '@/features/dashboard/hooks/useRecruitmentDashboardChartPermission.tsx'
import { useExperienceBreakdown } from '@/services'
import { useRecruitmentDashboardFilter } from '@/features/dashboard/hooks/useRecruitmentDashboardFilter.tsx'
import { LoadingWrapper } from '@/components'
import { formatDateRangeText } from '@/utils/date-utils.ts'

type RecruitmentByExperienceChartProps = { compact?: boolean }

function RecruitmentByExperienceChart({ compact }: RecruitmentByExperienceChartProps = {}) {
  const chartRef = useRef<HTMLDivElement>(null)

  const { canViewChart } = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.experience_breakdown_chart'
  )

  const { openFilterModal, subTitle, apiParams, filterCount, filterParams } =
    useRecruitmentDashboardFilter({ includeBranch: false })

  const { data: apiData, isLoading } = useExperienceBreakdown(apiParams)

  const apiFilteredDateRange = useMemo(() => {
    return formatDateRangeText(apiData?.report_from_date, apiData?.report_to_date)
  }, [apiData?.report_from_date, apiData?.report_to_date])

  const data = useMemo((): ChartSegment[] => {
    const response = apiData?.data
    if (!response) {
      return []
    }

    return response.map((item) => ({
      label: item.label,
      percentage: item.percentage,
      count: item.count,
    }))
  }, [apiData?.data])

  const handleDownloadChart = async () => {
    if (!chartRef.current) return

    await exportElementToPdf(chartRef.current, {
      fileName: 'bieu-do-ty-le-tuyen-moi-theo-kinh-nghiem.pdf',
      overlayMessage: 'Đang tạo biểu đồ Tỷ lệ tuyển mới theo kinh nghiệm...',
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
      data-api={ApiPaths.hrm_dashboard_charts_experience_breakdown_retrieve}
    >
      <DashboardChartTitle
        reportLink={APP_PATH.REPORT_RECRUITMENT_HIRED_CANDIDATE}
        title={'Tỷ lệ tuyển mới theo kinh nghiệm'}
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

export default RecruitmentByExperienceChart
