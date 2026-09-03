import { EmployeeStatusBreakdownReportAggregated } from '@/services'
import { ORG_LEVEL } from '@/features/report/staff/constants'
import StaffPieChart from '@/features/report/staff/components/StaffPieChart.tsx'
import StaffBarChart from '@/features/report/staff/components/StaffBarChart.tsx'

export type ReportType = 'turnover' | 'statistics'

const StaffChart = ({
  data,
  orgLevel,
  isLoading,
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
  return (
    <div className="flex w-full flex-col gap-4">
      <StaffPieChart
        data={data}
        orgLevel={orgLevel}
        isLoading={isLoading}
        filterTitle={filterTitle}
        filterPeriod={filterPeriod}
        filterDateRangeTooltip={filterDateRangeTooltip}
        filterEndDate={filterEndDate}
        reportType={reportType}
      />

      <StaffBarChart
        data={data}
        orgLevel={orgLevel}
        isLoading={isLoading}
        initialWidth={initialWidth}
        filterTitle={filterTitle}
        filterPeriod={filterPeriod}
        filterDateRangeTooltip={filterDateRangeTooltip}
        filterEndDate={filterEndDate}
        reportType={reportType}
      />
    </div>
  )
}

export default StaffChart
