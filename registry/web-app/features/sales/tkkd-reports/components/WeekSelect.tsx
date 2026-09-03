import { useCallback } from 'react'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { formatDateToApi, getWeekRangeApi } from '@/utils/date-utils'

type WeekSelectProps = {
  /** Any `yyyy-MM-dd` date inside the selected week (we store the week's Monday). */
  value?: string | null
  /** Emits the selected week's Monday as a `yyyy-MM-dd` string, or `undefined` when cleared. */
  onChange: (weekStart: string | undefined) => void
  label?: string
  className?: string
}

/**
 * Week picker for the TKKD reports "Tuần" mode. Lets the user pick any day; the value is
 * snapped to that day's Mon–Sun calendar week (Monday stored) to match the backend `week`
 * param semantics.
 *
 * The resolved Mon–Sun range is rendered by the CALLER, on the same line (see
 * [TkkdReportPeriodSelector]) — not as a `caption` here. A caption adds a second line
 * inside the toolbar, which grows the row only in week mode and leaves the picker
 * visually shoved above the Tháng/Tuần buttons.
 */
export default function WeekSelect({ value, onChange, label, className }: WeekSelectProps) {
  const handleChange = useCallback(
    (picked: string | undefined | null) => {
      const apiDate = formatDateToApi(picked ?? undefined)
      if (!apiDate) {
        onChange(undefined)
        return
      }
      onChange(getWeekRangeApi(apiDate).from)
    },
    [onChange]
  )

  return (
    <DatePicker
      className={className}
      label={label}
      value={value ?? null}
      onChange={handleChange}
      placeholder="Chọn tuần"
      // Not clearable: the week IS the report period, like the accounting period in month
      // mode. Clearing it would only bounce back to the current week (the filters hook
      // re-seeds a missing week), so we don't offer the affordance.
    />
  )
}
