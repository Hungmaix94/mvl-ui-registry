import { format, parse, startOfMonth, eachDayOfInterval } from 'date-fns'
import { vi } from 'date-fns/locale'
import { MONTH_FORMAT, TIME_FORMAT } from '@/constants/date-format.ts'
import type { TimesheetEntry } from '@/features/attendance/services/timesheet-service'

/**
 * Get all days in a month as Date array
 */
export function getDaysInMonth(month: Date): Date[] {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = startOfMonth(month)
  const lastDay = new Date(year, monthIndex + 1, 0)
  return eachDayOfInterval({ start: firstDay, end: lastDay })
}

const viShort = {
  ...vi,
  localize: {
    ...vi.localize,
    day: (n: number) => {
      const short = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
      return short[n]
    },
  },
}

/**
 * Format day header for table column
 * Returns weekday (T2, T3, ..., CN) and day (DD/MM)
 */
export function formatDayHeader(date: Date): { weekday: string; day: string } {
  const weekday = format(date, 'EEEE', { locale: viShort })
  const day = format(date, 'dd/MM')
  return { weekday, day }
}

/**
 * Get timesheet entry for a specific date
 * Maps entry based on start_time date
 */
export function getTimesheetEntryForDate(
  entries: TimesheetEntry[],
  index: number
): TimesheetEntry | null {
  if (!entries || entries.length === 0) {
    return null
  }

  return entries[index] || null
}

/**
 * Format time range from start_time and end_time
 * Returns "HH:mm - HH:mm" or "--:-- - --:--" if no data
 */
export function formatTimeRange(startTime: string | null, endTime: string | null): string {
  if (!startTime && !endTime) {
    return '--:-- - --:--'
  }

  try {
    const start = startTime ? format(new Date(startTime), TIME_FORMAT) : '--:--'
    const end = endTime ? format(new Date(endTime), TIME_FORMAT) : '--:--'
    return `${start} - ${end}`
  } catch {
    return '--:-- - --:--'
  }
}

/**
 * Format Date to MM/yyyy for API
 */
export function formatMonthForApi(month: Date): string {
  return format(month, MONTH_FORMAT)
}

/**
 * Parse MM/yyyy string to Date
 * Returns start of month Date or null if invalid
 */
export function parseMonthFromApi(monthStr: string | undefined | null): Date | null {
  if (!monthStr || typeof monthStr !== 'string') {
    return null
  }

  try {
    const parsed = parse(monthStr, MONTH_FORMAT, new Date())
    if (isNaN(parsed.getTime())) {
      return null
    }
    return startOfMonth(parsed)
  } catch {
    return null
  }
}
