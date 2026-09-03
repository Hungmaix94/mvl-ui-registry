import { format } from 'date-fns'
import { MONTH_FORMAT } from '../../constants/date-format'
import { Switch } from '../../ui'

type TimesheetMonthSelectorProps = {
  selectedMonth: Date
  hideDays: boolean
  onToggleHideDays: (hide: boolean) => void
}

export default function TimesheetMonthSelector({
  selectedMonth,
  hideDays,
  onToggleHideDays,
}: TimesheetMonthSelectorProps) {
  const formattedMonth = format(selectedMonth, MONTH_FORMAT)

  return (
    <div className="flex items-center justify-between px-10 py-3">
      <div className="text-content-dark-1 flex items-center gap-0">
        <span className="text-sm">Thời gian lọc:</span>
        <div className={'font-body-lg-semibold px-2'}>{formattedMonth}</div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="hide-days-toggle" className="text-content-dark-2 cursor-pointer text-sm">
          Ẩn Ngày công
        </label>
        <Switch checked={hideDays} onChange={onToggleHideDays} />
      </div>
    </div>
  )
}
