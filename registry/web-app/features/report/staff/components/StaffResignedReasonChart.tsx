import { useMemo } from 'react'
import StaffChartTitle from '@/features/report/_shares/components/StaffChartTitle.tsx'
import { EmployeeResignedReasonSummary } from '@/services'
import LoadingWrapper from '@/components/commons/Loadingwrapper.tsx'
import DoughnutChart, { ChartSegment } from '@/components/ui/chart/DoughnutChart'
import { cn } from '@/utils'

type StaffResignedReasonChartProps = {
  summary?: EmployeeResignedReasonSummary
  isLoading?: boolean
  title?: string
  subTitle?: string
  subTitleTooltip?: string
  onDownload?: () => void
}

const StaffResignedReasonChart = ({
  summary,
  isLoading,
  title,
  subTitle,
  subTitleTooltip,
  onDownload,
}: StaffResignedReasonChartProps) => {
  const chartSegments = useMemo<ChartSegment[]>(() => {
    if (!summary?.reasons?.length) {
      return []
    }

    return summary.reasons
      .map((reason) => {
        const percentageValue = Number.parseFloat(reason.percentage ?? '0') || 0
        return {
          label: reason.label,
          percentage: percentageValue,
          count: reason.count,
        }
      })
      .filter((segment) => segment.count && segment.count > 0)
  }, [summary?.reasons])

  return (
    <div
      className={cn(
        'border-border-1 bg-background-1 w-full rounded-sm border',
        'p-4 md:p-6 lg:p-8'
      )}
    >
      <StaffChartTitle
        title={title ?? 'Tỉ lệ lý do nghỉ việc'}
        subTitle={subTitle}
        subTitleTooltip={subTitleTooltip}
        handleDownload={onDownload}
      />

      <LoadingWrapper
        isLoading={isLoading}
        data={chartSegments}
        noDataMessage={'Không có dữ liệu để hiển thị'}
        containerHeight={380}
      >
        <DoughnutChart segments={chartSegments} />
      </LoadingWrapper>
    </div>
  )
}

export default StaffResignedReasonChart
