import { StaffGrowthReportAggregated } from '@/services'
import CustomBarChart from '@/components/ui/chart/CustomBarChart.tsx'
import { omit } from 'lodash'
import StaffChartTitle from '@/features/report/_shares/components/StaffChartTitle.tsx'
import { LoadingWrapper } from '@/components'

interface GrowthChartProps {
  data: StaffGrowthReportAggregated[]
  filterTitle?: string
  filterPeriod?: string
  filterDateRangeTooltip?: string
  loading?: boolean
}

function StaffGrowthChart({
  data,
  filterTitle,
  filterPeriod,
  filterDateRangeTooltip,
  loading,
}: GrowthChartProps) {
  const dataKeys = Object.keys(omit(data?.[0] || {}, ['label', 'period_type']))

  return (
    <div className="border-border-1 rounded-sm border p-4">
      <StaffChartTitle
        title={`Biểu đồ Tăng trưởng nhân sự ${filterTitle ? ' - ' + filterTitle : ''}`}
        subTitle={filterPeriod ? `${filterPeriod}` : 'Lấy theo ngày cuối cùng của bộ lọc'}
        subTitleTooltip={filterDateRangeTooltip}
      />
      <LoadingWrapper isLoading={loading} data={data}>
        <CustomBarChart
          data={data}
          dataKeys={dataKeys}
          dataKey={'label'}
          yAxisLabel={'Nhân sự'}
          isLoading={loading}
        />
      </LoadingWrapper>
    </div>
  )
}

export default StaffGrowthChart
