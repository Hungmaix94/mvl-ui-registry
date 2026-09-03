import { ApiPaths } from '@/api/schema'
import CostBySourceBarChart, {
  type CostBySourceDataItem,
  type CostBySourceSegment,
} from '@/components/ui/chart/CostBySourceBarChart.tsx'
import { getColorForLabelByIndex } from '@/components/ui/chart/utils'
import { useMemo, useRef } from 'react'
import { cn } from '@/utils'
import { APP_PATH } from '@/routes'
import DashboardChartTitle from '@/features/dashboard/components/chart/DashboardChartTitle.tsx'
import { exportElementToPdf } from '@/utils/exportChart.ts'
import { useRecruitmentDashboardChartPermission } from '@/features/dashboard/hooks/useRecruitmentDashboardChartPermission.tsx'
import { useCostByBranches } from '@/services'
import { useRecruitmentCostByBranchesFilter } from '@/features/dashboard/hooks/useRecruitmentCostByBranchesFilter.tsx'
import { LoadingWrapper } from '@/components'
import { formatDateToMonth } from '@/utils/date-utils.ts'

/** Hex for the average-per-hire line stroke (matches the "Chi phí theo nguồn" chart). */
const LINE_COLOR = '#D4A017'
const SEGMENT_NAME = 'Chi phí thực tế'
const EXPECTED_SEGMENT_NAME = 'Chi phí dự kiến'
const AVERAGE_PER_HIRE_LABEL = 'Chi phí bình quân / người'
const Y_AXIS_COST_LABEL = 'Chi phí (₫)'

function RecruitmentCostByBranches() {
  const chartRef = useRef<HTMLDivElement>(null)

  const { canViewChart } = useRecruitmentDashboardChartPermission(
    'recruitment_dashboard.cost_by_branches_chart'
  )

  const { openFilterModal, apiParams, filterCount, subTitle, filterParams } =
    useRecruitmentCostByBranchesFilter()

  const { data: apiData, isLoading } = useCostByBranches(apiParams)

  const { months = [], branch_names = [], data: branches = [] } = apiData?.data || {}

  const apiMonthLabel = useMemo(() => {
    // If API returns explicit months, prefer that
    if (months.length > 0) {
      const raw = months[0]

      // Handle format 'YYYY-MM'
      if (/^\d{4}-\d{2}$/.test(raw)) {
        const [yearStr, monthStr] = raw.split('-')
        const year = Number(yearStr)
        const month = Number(monthStr)
        if (!Number.isNaN(year) && !Number.isNaN(month) && month >= 1 && month <= 12) {
          const date = new Date(year, month - 1, 1)
          return `Tháng ${formatDateToMonth(date)}`
        }
      }

      // Handle format 'MM/yyyy'
      if (/^\d{2}\/\d{4}$/.test(raw)) {
        const [monthStr, yearStr] = raw.split('/')
        const year = Number(yearStr)
        const month = Number(monthStr)
        if (!Number.isNaN(year) && !Number.isNaN(month) && month >= 1 && month <= 12) {
          const date = new Date(year, month - 1, 1)
          return `Tháng ${formatDateToMonth(date)}`
        }
      }
    }

    // Fallback: infer from report_from_date / report_to_date when available
    if (apiData?.report_from_date) {
      const date = new Date(apiData.report_from_date)
      if (!Number.isNaN(date.getTime())) {
        return `Tháng ${formatDateToMonth(date)}`
      }
    }

    return ''
  }, [months, apiData?.report_from_date])

  const branchNames = useMemo(() => {
    return branch_names.length > 0 ? branch_names : branches.map((branch) => branch.name)
  }, [branch_names, branches])

  // Each branch is one x-category with a single stacked bar: đã chi (paid_cost,
  // solid) + dự kiến (expected_cost, light). The line plots the average cost per
  // hire (total_avg_cost_per_hire) so the "bình quân" intent stays visible.
  const chartData = useMemo<CostBySourceDataItem[]>(() => {
    if (!branchNames.length) {
      return []
    }

    return branchNames.map((branchName) => {
      const branch = branches.find((b) => b.name === branchName)
      const stat = branch?.statistics?.[0]
      return {
        label: branchName,
        paid_0: stat?.paid_cost ?? 0,
        expected_0: stat?.expected_cost ?? 0,
        expected_raw_0: stat?.expected_cost ?? 0,
        averageCost: stat?.total_avg_cost_per_hire ?? 0,
      }
    })
  }, [branchNames, branches])

  const segments = useMemo<CostBySourceSegment[]>(
    () => [
      {
        dataKey: 'paid_0',
        expectedDataKey: 'expected_0',
        expectedRawDataKey: 'expected_raw_0',
        name: SEGMENT_NAME,
        color: getColorForLabelByIndex(0).backgroundColor,
      },
    ],
    []
  )

  const lineSeries = useMemo(
    () => ({ dataKey: 'averageCost', name: AVERAGE_PER_HIRE_LABEL, color: LINE_COLOR }),
    []
  )

  const handleDownloadChart = async () => {
    if (!chartRef.current) return

    await exportElementToPdf(chartRef.current, {
      fileName: 'bieu-do-chi-phi-tuyen-dung-binh-quan-theo-chi-nhanh.pdf',
      overlayMessage: 'Đang tạo biểu đồ Chi phí tuyển dụng bình quân theo chi nhánh...',
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
      data-api={ApiPaths.hrm_dashboard_charts_cost_by_branches_retrieve}
    >
      <DashboardChartTitle
        reportLink={APP_PATH.REPORT_RECRUITMENT_EXPENSE_BY_SOURCE}
        title={'Chi phí tuyển dụng bình quân - Theo chi nhánh'}
        subTitle={subTitle || apiMonthLabel}
        filterCount={filterCount}
        handleDownloadChart={handleDownloadChart}
        handleFilter={handleFilter}
        filterParams={filterParams}
      />
      <LoadingWrapper
        isLoading={isLoading}
        data={chartData}
        noDataMessage={'Không có dữ liệu để hiển thị'}
        hasActiveFilters={filterCount > 0}
      >
        <div className="h-full">
          <CostBySourceBarChart
            data={chartData}
            segments={segments}
            lineSeries={lineSeries}
            yAxisLabel={Y_AXIS_COST_LABEL}
            rightYAxisLabel={AVERAGE_PER_HIRE_LABEL}
            expectedSeriesLabel={EXPECTED_SEGMENT_NAME}
          />
        </div>
      </LoadingWrapper>
    </div>
  )
}

export default RecruitmentCostByBranches
