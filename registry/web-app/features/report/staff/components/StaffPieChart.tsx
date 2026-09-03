import { useEffect, useMemo, useRef } from 'react'
import DoughnutChart, { ChartSegment } from '@/components/ui/chart/DoughnutChart'
import { EmployeeStatusBreakdownReportAggregated } from '@/services'

import { ORG_LEVEL } from '@/features/report/staff/constants'
import { flattenTree, TreeRow } from '@/features/report/staff/utils/treeTransform'
import { cn } from '@/utils'
import StaffChartTitle from '@/features/report/_shares/components/StaffChartTitle.tsx'
import { exportElementToPdf } from '@/utils/exportChart'
import LoadingWrapper from '../../../../components/commons/Loadingwrapper.tsx'
import { ReportType } from './StaffChart'

const StaffTurnoverPieChart = ({
  data,
  orgLevel,
  isLoading,
  filterTitle,
  filterPeriod,
  filterDateRangeTooltip,
  filterEndDate,
  reportType = 'statistics',
}: {
  data?: EmployeeStatusBreakdownReportAggregated
  orgLevel: ORG_LEVEL
  isLoading?: boolean
  filterTitle?: string
  filterPeriod?: string
  filterDateRangeTooltip?: string
  filterEndDate?: string
  reportType?: ReportType
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const timeHeaders: string[] = useMemo(() => data?.time_headers || [], [data?.time_headers])
  const treeNodes = useMemo(() => data?.data || [], [data?.data])

  const allRows = useMemo(() => flattenTree(timeHeaders, treeNodes), [timeHeaders, treeNodes])

  const chartData = useMemo(() => {
    if (!data || !timeHeaders.length || !treeNodes.length) {
      return []
    }

    let filtered: TreeRow[] = []

    switch (orgLevel) {
      case ORG_LEVEL.BRANCH:
        filtered = allRows.filter((row) => row.type === ORG_LEVEL.BRANCH)
        break
      case ORG_LEVEL.BLOCK:
        filtered = allRows.filter((row) => row.type === ORG_LEVEL.BLOCK)
        break
      case ORG_LEVEL.DEPARTMENT:
        filtered = allRows.filter((row) => row.type === ORG_LEVEL.DEPARTMENT)
        break
    }

    if (filtered.length === 0) {
      return []
    }

    // Determine target index: last period before "Trung bình" (never use average column)
    const avgIndex = timeHeaders.findIndex((h) => h.trim().toLowerCase() === 'trung bình')
    const targetIndex = avgIndex > 0 ? avgIndex - 1 : timeHeaders.length - 1
    // If only column is "Trung bình" or it's first, there is no period column to show
    if (avgIndex === 0 || timeHeaders[targetIndex]?.trim().toLowerCase() === 'trung bình') {
      return []
    }

    // Calculate total for percentage calculation (last period column)
    const total = filtered.reduce((sum, row) => sum + (row.statistics[targetIndex] || 0), 0)

    if (total === 0) {
      return []
    }

    // Transform to chart segments
    const segments: ChartSegment[] = filtered
      .map((row) => {
        const count = row.statistics[targetIndex] || 0
        const percentage = total > 0 ? (count / total) * 100 : 0

        return {
          label: row.name,
          percentage: percentage,
          count: count,
        }
      })
      .filter((segment) => segment.count > 0) // Only include segments with data

    segments.sort((a, b) => b.percentage - a.percentage)

    return segments
  }, [allRows, orgLevel, data, timeHeaders, treeNodes.length])

  useEffect(() => {
    console.log(chartData)
  }, [chartData])

  const chartTitle = useMemo(() => {
    if (reportType === 'turnover') {
      return `Biểu đồ Tỉ lệ nghỉ việc${filterTitle ? ' - ' + filterTitle : ''}`
    }
    return `Biểu đồ Tỉ lệ Nhân sự${filterTitle ? ' - ' + filterTitle : ''}`
  }, [reportType, filterTitle])

  const overlayMessage = useMemo(() => {
    if (reportType === 'turnover') {
      return 'Đang tạo biểu đồ Tỷ lệ nghỉ việc...'
    }
    return 'Đang tạo biểu đồ Tỷ lệ Nhân sự...'
  }, [reportType])

  const subTitle = useMemo(() => {
    if (reportType === 'turnover') {
      return filterPeriod
    }
    return filterEndDate
      ? `${filterPeriod} (Lấy theo ngày ${filterEndDate})`
      : `${filterPeriod} (Lấy theo ngày cuối cùng của bộ lọc)`
  }, [filterPeriod, filterEndDate, reportType])

  const handleDownload = async () => {
    const container = containerRef.current
    if (!container) {
      return
    }

    await exportElementToPdf(container, {
      fileName:
        reportType === 'turnover'
          ? 'staff-turnover-pie-chart.pdf'
          : 'staff-statistics-pie-chart.pdf',
      overlayMessage,
    })
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative',
        'flex flex-col items-center justify-start gap-4',
        'w-full',
        'border-border-1 rounded-sm border p-4',
        '!h-fit'
      )}
    >
      <StaffChartTitle
        title={chartTitle}
        subTitle={subTitle}
        subTitleTooltip={filterDateRangeTooltip}
        handleDownload={handleDownload}
      />

      <LoadingWrapper
        isLoading={isLoading}
        data={chartData}
        noDataMessage={'Không có dữ liệu để hiển thị'}
      >
        <DoughnutChart segments={chartData} />
      </LoadingWrapper>
    </div>
  )
}

export default StaffTurnoverPieChart
