import { useMemo, useRef } from 'react'
import CustomBarChart from '@/components/ui/chart/CustomBarChart'
import { EmployeeStatusBreakdownReportAggregated } from '@/services'
import { ORG_LEVEL } from '@/features/report/staff/constants'
import { cn } from '@/utils'
import { exportElementToPdf } from '@/utils/exportChart'
import { flattenTree, TreeRow } from '@/features/report/staff/utils/treeTransform.ts'
import StaffChartTitle from '@/features/report/_shares/components/StaffChartTitle.tsx'
import { LoadingWrapper } from '@/components'
import { ReportType } from './StaffChart'

const StaffTurnoverBarChart = ({
  data,
  orgLevel,
  isLoading = true,
  initialWidth,
  filterTitle,
  filterPeriod,
  filterDateRangeTooltip,
  filterEndDate,
  reportType = 'statistics',
}: {
  data?: EmployeeStatusBreakdownReportAggregated
  orgLevel: ORG_LEVEL
  isLoading?: boolean
  initialWidth?: number
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

    // Transform to bar chart data format
    return filtered.map((row) => {
      const dataPoint: { label: string; [key: string]: string | number } = {
        label: row.name,
      }

      // Add each time period as a data key
      timeHeaders.forEach((header, index) => {
        dataPoint[header] = row.statistics[index] || 0
      })

      return dataPoint
    })
  }, [allRows, orgLevel, timeHeaders, data, treeNodes.length])

  const chartTitle = useMemo(() => {
    if (reportType === 'turnover') {
      return `Biểu đồ Biến động nghỉ việc${filterTitle ? ' - ' + filterTitle : ''}`
    }
    return `Biểu đồ Số lượng Nhân sự${filterTitle ? ' - ' + filterTitle : ''}`
  }, [reportType, filterTitle])

  const overlayMessage = useMemo(() => {
    if (reportType === 'turnover') {
      return 'Đang tạo biểu đồ Biến động nghỉ việc...'
    }
    return 'Đang tạo biểu đồ Số lượng Nhân sự...'
  }, [reportType])

  const subTitle = useMemo(() => {
    if (reportType === 'turnover') {
      return filterPeriod
    }
    return filterEndDate
      ? `${filterPeriod} (Lấy theo ngày ${filterEndDate})`
      : `${filterPeriod} (Lấy theo ngày cuối cùng của bộ lọc)`
  }, [filterPeriod, filterEndDate, reportType])

  if (!isLoading && (!data || !timeHeaders.length || !treeNodes.length)) {
    return (
      <div className="border-border-1 rounded-sm border p-4">
        <p className="text-content-dark-3 text-center">Không có dữ liệu</p>
      </div>
    )
  }

  if (!isLoading && chartData.length === 0) {
    return (
      <div className="border-border-1 rounded-sm border p-4">
        <p className="text-content-dark-3 text-center">Không có dữ liệu để hiển thị</p>
      </div>
    )
  }

  const handleDownload = async () => {
    const container = containerRef.current
    if (!container) {
      return
    }

    await exportElementToPdf(container, {
      fileName:
        reportType === 'turnover'
          ? 'staff-turnover-bar-chart.pdf'
          : 'staff-statistics-bar-chart.pdf',
      overlayMessage,
    })
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative',
        'flex flex-col gap-2',
        'border-border-1 rounded-sm border p-4',
        'h-fit w-full'
      )}
    >
      <StaffChartTitle
        title={chartTitle}
        subTitle={subTitle}
        subTitleTooltip={filterDateRangeTooltip}
        handleDownload={handleDownload}
      />
      <LoadingWrapper isLoading={isLoading} data={chartData}>
        <CustomBarChart
          data={chartData}
          dataKeys={timeHeaders}
          dataKey="label"
          yAxisLabel="Nhân sự"
          initialWidth={initialWidth}
        />
      </LoadingWrapper>
    </div>
  )
}

export default StaffTurnoverBarChart
