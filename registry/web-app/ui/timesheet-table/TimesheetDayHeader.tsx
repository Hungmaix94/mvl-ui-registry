import { formatDayHeader } from '@/features/attendance/timesheet/_shares/utils/timesheet-utils'

type TimesheetDayHeaderProps = {
  date: Date
}

export default function TimesheetDayHeader({ date }: TimesheetDayHeaderProps) {
  const { weekday, day } = formatDayHeader(date)

  return (
    <div className="flex min-h-[60px] flex-col items-center justify-center">
      <div className="text-content-dark-3 typo-body-sm">{weekday}</div>
      <div className="text-content-dark-1 typo-body-base-semibold mt-1">{day}</div>
    </div>
  )
}
