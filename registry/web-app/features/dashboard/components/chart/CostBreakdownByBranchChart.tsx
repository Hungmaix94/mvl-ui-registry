import { ApiPaths } from '@/api/schema'
import DoughnutChart, { type ChartSegment } from '@/components/ui/chart/DoughnutChart.tsx'
import { LoadingWrapper } from '@/components'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import { useRecruitmentDashboardChartPermission } from '@/features/dashboard/hooks/useRecruitmentDashboardChartPermission.tsx'
import { useRecruitmentDashboardFilter } from '@/features/dashboard/hooks/useRecruitmentDashboardFilter.tsx'
import { useCostBreakdownByBranch } from '@/services'
import { APP_PATH } from '@/routes'
import { exportElementToPdf } from '@/utils/exportChart.ts'
import { formatDateRangeText } from '@/utils/date-utils.ts'
import { useMemo, useRef } from 'react'
import { getStartOfYear } from '@/utils/date-utils'

type CostBreakdownByBranchChartProps = { compact?: boolean }

function CostBreakdownByBranchChart({ compact }: CostBreakdownByBranchChartProps = {}) {
  const chartRef = useRef<HTMLDivElement>(null)
  const costByBranchDefaultDateRange = useMemo(() => {
    const to = new Date()
    return { from: getStartOfYear(to), to }
  }, [])
  const { canViewChart } = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.cost_breakdown_by_branch_chart'
  )
  const { openFilterModal, apiParams, subTitle, filterCount, filterParams } =
    useRecruitmentDashboardFilter({
      includeBranch: false,
      defaultDateRange: costByBranchDefaultDateRange,
    })
  const { data: apiData, isLoading } = useCostBreakdownByBranch(apiParams)

  const apiFilteredDateRange = useMemo(
    () => formatDateRangeText(apiData?.report_from_date, apiData?.report_to_date),
    [apiData?.report_from_date, apiData?.report_to_date]
  )

  const data = useMemo((): ChartSegment[] => {
    if (!apiData?.data?.length) {
      return []
    }
    return apiData.data.map((item) => ({
      label: item.branch_name,
      percentage: item.percentage,
      count: item.total_cost,
    }))
  }, [apiData?.data])

  const handleDownloadChart = async () => {
    if (!chartRef.current) return
    await exportElementToPdf(chartRef.current, {
      fileName: 'bieu-do-chi-phi-theo-chi-nhanh.pdf',
      overlayMessage: 'Đang tạo biểu đồ Chi phí theo chi nhánh...',
    })
  }

  if (!canViewChart) {
    return null
  }

  return (
    <div
      ref={chartRef}
      className="flex flex-col gap-8 bg-white"
      data-api={ApiPaths.hrm_dashboard_charts_cost_breakdown_by_branch_retrieve}
    >
      <DashboardChartTitle
        reportLink={APP_PATH.REPORT_RECRUITMENT_EXPENSE_BY_SOURCE}
        title="Chi phí theo chi nhánh"
        subTitle={apiFilteredDateRange || subTitle}
        filterCount={filterCount}
        handleDownloadChart={handleDownloadChart}
        handleFilter={openFilterModal}
        filterParams={filterParams}
      />
      <LoadingWrapper
        isLoading={isLoading}
        data={data}
        noDataMessage="Không có dữ liệu để hiển thị"
        hasActiveFilters={filterCount > 0}
      >
        <DoughnutChart segments={data} compact={compact} />
      </LoadingWrapper>
    </div>
  )
}

export default CostBreakdownByBranchChart
