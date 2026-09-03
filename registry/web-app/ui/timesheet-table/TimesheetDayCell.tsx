import { formatTimeRange } from '@/features/attendance/timesheet/_shares/utils/timesheet-utils'
import { IconWarningcircle } from '../../icons'
import { Flex, Text } from '@radix-ui/themes'
import { cn } from '@/utils'
import { useMemo } from 'react'
import useAppConstant from '../../hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '../../constants/app-constant-key'
import type { TimesheetEntry } from '@/services'
import {
  ColoredValueVariant,
  DailyTimesheetEntryDay_type,
  DailyTimesheetEntryMorning_absent_reason,
} from '@/api/schema'

type TimesheetDayCellProps = {
  entry: TimesheetEntry | null
  onSelect?: (entryId: number, date: string) => void
}

const LEAVE_REASONS = [
  DailyTimesheetEntryMorning_absent_reason.paid_leave,
  DailyTimesheetEntryMorning_absent_reason.unpaid_leave,
  // DailyTimesheetEntryMorning_absent_reason.maternity_leave,
  // DailyTimesheetEntryMorning_absent_reason.unexcused_absence,
]
const STATUTORY_LEAVE_REASON = DailyTimesheetEntryMorning_absent_reason.statutory_paid_leave

function isLeaveMorning(entry: TimesheetEntry | null): boolean {
  if (!entry) return false
  return LEAVE_REASONS.some((i) => i === entry.morning_absent_reason)
}
function isLeaveAfternoon(entry: TimesheetEntry | null): boolean {
  if (!entry) return false
  return LEAVE_REASONS.some((i) => i === entry.afternoon_absent_reason)
}
function isStatutoryLeaveMorning(entry: TimesheetEntry | null): boolean {
  if (!entry) return false
  return entry.morning_absent_reason === STATUTORY_LEAVE_REASON
}
function isStatutoryLeaveAfternoon(entry: TimesheetEntry | null): boolean {
  if (!entry) return false
  return entry.afternoon_absent_reason === STATUTORY_LEAVE_REASON
}

function isSaturday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return d.getDay() === 6
}

export default function TimesheetDayCell({ entry, onSelect }: TimesheetDayCellProps) {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.TIMESHEET_ENTRY_STATUS_CHOICES,
      APP_CONSTANT_KEY.HRM.TIMESHEET_DAY_TYPE,
    ],
  })

  const statusTextMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.TIMESHEET_ENTRY_STATUS_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.TIMESHEET_ENTRY_STATUS_CHOICES) as Record<
          string,
          string
        > | null) || {}
      : {}
  }, [keysMap])
  const dayTypeTextMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.TIMESHEET_DAY_TYPE)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.TIMESHEET_DAY_TYPE) as Record<string, string> | null) ||
          {}
      : {}
  }, [keysMap])
  const coloredStatus = entry?.colored_status
  const statusValue = coloredStatus?.value || null
  const statusVariant = coloredStatus?.variant || null
  const startTime = entry?.start_time || null
  const endTime = entry?.end_time || null
  const hasComplaint = !!entry?.has_complaint
  const hasConflict = !!entry?.has_leave_attendance_conflict
  const hasEntryId = typeof entry?.id === 'number' && entry.id !== null
  const isClickable = !!onSelect && !!hasEntryId

  const timeRange = formatTimeRange(startTime, endTime)

  const statusLabel = useMemo(() => {
    if (!statusValue || typeof statusValue !== 'string') return undefined
    return statusTextMapping[statusValue] || undefined
  }, [statusValue, statusTextMapping])

  const primaryLabel = useMemo(() => {
    if (entry?.day_type && DailyTimesheetEntryDay_type.holiday === entry.day_type)
      return dayTypeTextMapping[DailyTimesheetEntryDay_type.holiday]
    if (entry?.day_type && entry?.day_type === DailyTimesheetEntryDay_type.additional_day_off)
      return dayTypeTextMapping[DailyTimesheetEntryDay_type.additional_day_off]

    const isMorningLeave = isLeaveMorning(entry)
    const isAfternoonLeave = isLeaveAfternoon(entry)
    const isMorningStatutoryLeave = isStatutoryLeaveMorning(entry)
    const isAfternoonStatutoryLeave = isStatutoryLeaveAfternoon(entry)
    const isT7 = isSaturday(entry?.date)

    if (isT7 && (isMorningStatutoryLeave || isAfternoonStatutoryLeave)) return 'Nghỉ CĐ'
    if (isT7 && (isMorningLeave || isAfternoonLeave)) return 'Nghỉ phép'

    if (!isT7 && isMorningStatutoryLeave && isAfternoonStatutoryLeave) return 'Nghỉ CĐ'
    if (!isT7 && isMorningLeave && isAfternoonLeave) return 'Nghỉ phép'

    return statusLabel
  }, [entry, statusLabel, dayTypeTextMapping])

  const showNoPayrollRectangle = !!entry && entry.count_for_payroll === false

  const variantClasses = useMemo(() => {
    const colorStyles = {
      [ColoredValueVariant.GREEN]: 'text-content-dark-2 bg-background-4',
      [ColoredValueVariant.YELLOW]: 'text-content-dark-1 bg-data-yellow-focus',
      [ColoredValueVariant.RED]: 'text-content-dark-1 bg-data-red-disabled',
      [ColoredValueVariant.GREY]: 'text-content-dark-2 bg-background-2',
    }

    let variant: ColoredValueVariant
    switch (statusVariant) {
      case 'GREEN':
        variant = ColoredValueVariant.GREEN
        break
      case 'YELLOW':
        variant = ColoredValueVariant.YELLOW
        break
      case 'RED':
        variant = ColoredValueVariant.RED
        break
      default:
        variant = ColoredValueVariant.GREY
    }

    return colorStyles[variant]
  }, [statusVariant])

  return (
    <>
      <Flex
        direction="column"
        align="center"
        justify="center"
        px={'2'}
        py={'1'}
        position={'relative'}
        role={isClickable ? 'button' : 'presentation'}
        tabIndex={isClickable ? 0 : -1}
        aria-disabled={!isClickable}
        data-entry-id={entry?.id || undefined}
        onClick={() => {
          if (isClickable && entry?.id) {
            onSelect?.(entry.id, entry.date)
          }
        }}
        onKeyDown={(event) => {
          if (!isClickable || !entry?.id) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect?.(entry.id, entry.date)
          }
        }}
        className={cn(
          'text-content-dark-1 typo-body-sm-medium min-h-[40px] min-w-[136px] text-nowrap',
          'rounded-sm',
          variantClasses,
          isClickable ? 'hover:bg-background-3 cursor-pointer' : 'cursor-not-allowed opacity-80'
        )}
      >
        {showNoPayrollRectangle && (
          <div
            className="bg-border-2 absolute top-0 left-0 h-full w-1 rounded-tl-sm rounded-bl-sm"
            aria-hidden
          />
        )}
        {primaryLabel && <Text>{primaryLabel}</Text>}
        <Text>{timeRange}</Text>
        {hasComplaint && (
          <IconWarningcircle
            className={cn('absolute top-1 right-1', 'text-data-red-default', 'font-h5', 'shrink-0')}
            size={12}
          />
        )}
        {hasConflict && (
          <IconWarningcircle
            className={cn('absolute top-1 left-1', 'text-data-yellow-hover', 'font-h5', 'shrink-0')}
            size={12}
            title="Ngày công bị xung đột"
          />
        )}
      </Flex>
    </>
  )
}
