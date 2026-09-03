/**
 * Bound helpers for `DateRangePicker` (CR STT47, 86eyjxafg).
 *
 * Kept out of the component so the rule can be unit-tested on its own — mounting the picker just
 * to assert "is 30/04 before 01/05" costs a popover plus a two-month calendar render per case.
 */

import { formatDate } from '@/utils/date-utils'

/**
 * Strip the time part so a bound carrying a time component (e.g. `new Date()`) can never exclude
 * its own day. Every comparison here is day-granular.
 */
export function startOfDay(date: Date): Date {
  const midnight = new Date(date)
  midnight.setHours(0, 0, 0, 0)
  return midnight
}

/**
 * Message for a day falling outside [`minDate`, `maxDate`], or `undefined` when it fits.
 *
 * Both bounds are inclusive. Shared by the calendar matcher, the blur handlers and Apply, so a day
 * the calendar greys out cannot slip through by being typed into the text input instead.
 */
export function getOutOfBoundsError(
  date: Date,
  minDate?: Date,
  maxDate?: Date
): string | undefined {
  const day = startOfDay(date)
  if (minDate && day < startOfDay(minDate)) {
    return `Ngày không được trước ${formatDate(startOfDay(minDate))}`
  }
  if (maxDate && day > startOfDay(maxDate)) {
    return `Ngày không được sau ${formatDate(startOfDay(maxDate))}`
  }
  return undefined
}
