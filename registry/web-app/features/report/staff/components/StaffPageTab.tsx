import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx'
import { Fragment } from 'react'
import { ResignedBreakdownPeriodType } from '@/constants/api-schema-aliases'

const PERIODS = [
  {
    value: ResignedBreakdownPeriodType.year,
    label: 'Năm',
  },
  {
    value: ResignedBreakdownPeriodType.quarter,
    label: 'Quý',
  },
  {
    value: ResignedBreakdownPeriodType.month,
    label: 'Tháng',
  },
  {
    value: ResignedBreakdownPeriodType.week,
    label: 'Tuần',
  },
]

const StaffPageTab = ({
  currentPeriod,
  onPeriodChange,
}: {
  currentPeriod: ResignedBreakdownPeriodType
  onPeriodChange: (type: ResignedBreakdownPeriodType) => void
}) => {
  return (
    <div className="mb-5 flex items-center justify-between">
      <Tabs defaultValue={currentPeriod} className="w-[400px]">
        <TabsList>
          {PERIODS.map((period, idx) => (
            <Fragment key={idx}>
              <TabsTrigger
                value={period.value}
                onClick={() => onPeriodChange(period.value)}
                className={'h-10 py-0'}
              >
                {period.label}
              </TabsTrigger>
            </Fragment>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}

export default StaffPageTab
