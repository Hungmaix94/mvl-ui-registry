import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx'
import { RecruitmentReportPeriodType } from '@/constants/api-schema-aliases'
interface ReportToolbarProps {
  periodType: RecruitmentReportPeriodType
  onPeriodTypeChange: (type: RecruitmentReportPeriodType) => void
}

function StaffGrowthTab({ periodType, onPeriodTypeChange }: ReportToolbarProps) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <Tabs defaultValue={periodType} className="w-[400px]">
        <TabsList>
          <TabsTrigger
            value={RecruitmentReportPeriodType.week}
            onClick={() => onPeriodTypeChange(RecruitmentReportPeriodType.week)}
          >
            Theo tuần
          </TabsTrigger>
          <TabsTrigger
            value={RecruitmentReportPeriodType.month}
            onClick={() => onPeriodTypeChange(RecruitmentReportPeriodType.month)}
          >
            Theo tháng
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}

export default StaffGrowthTab
