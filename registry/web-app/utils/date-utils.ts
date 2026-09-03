import {
  format,
  parse,
  isValid,
  parseISO,
  startOfYear,
  endOfYear,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import { DATE_FORMAT } from '@/constants'
import {
  DATE_SERVER_FORMAT,
  DATETIME_FORMAT,
  MONTH_SERVER_FORMAT,
} from '@/constants/date-format.ts'

/**
 * Formats a date string or Date object to 'yyyy-MM-dd' for API requests.
 * If the input is a string, it's assumed to be in 'dd/MM/yyyy' format (DatePicker.onChange's
 * contract) — but edit-mode forms often seed a field's default straight from a prior API
 * response, which is already 'yyyy-MM-dd'. If the user never touches that field, this function
 * receives the server format back unchanged, so it falls back to parsing that too instead of
 * silently producing ''.
 * @param date - The date string or Date object to format.
 * @returns The formatted date string or an empty string if the input is invalid.
 */
export const formatDateToApi = (date: string | Date | undefined): string => {
  if (!date) {
    return ''
  }
  try {
    if (date instanceof Date) {
      return isValid(date) ? format(date, DATE_SERVER_FORMAT) : ''
    }
    // If it's already an ISO string or contains time, take the date part
    if (typeof date === 'string' && date.includes('T')) {
      return date.split('T')[0]
    }
    // If it's already in YYYY-MM-DD format
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date
    }
    // if it's a string, parse it from 'dd/MM/yyyy' format
    const parsedDate = parse(date, DATE_FORMAT, new Date())
    return isValid(parsedDate) ? format(parsedDate, DATE_SERVER_FORMAT) : ''
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}

/**
 * Formats a date string or Date object to a common display format.
 * If the input is null or invalid, it returns '-'.
 * @param date The date to format.
 * @param dateFormat The format string to use (defaults to DATE_FORMAT).
 * @returns The formatted date string or '-'.
 */
export const formatDate = (
  date: string | Date | null | undefined,
  dateFormat: string = DATE_FORMAT
): string => {
  if (!date) {
    return '-'
  }
  try {
    return format(new Date(date), dateFormat)
  } catch (error) {
    console.error('Error formatting date:', error)
    return '-'
  }
}

/** Start of calendar year for the given date (local midnight). */
export const getStartOfYear = (date: Date): Date => startOfYear(date)

/** Today as a `yyyy-MM-dd` server string (local time). */
export const getTodayApiDate = (): string => formatDateToApi(new Date())

/**
 * Current ISO week (Monday–Sunday) as `yyyy-MM-dd` server strings.
 * Mirrors the backend admin-dashboard "tuần này" range (week starts Monday).
 */
export const getThisWeekRangeApi = (): { from: string; to: string } => {
  const now = new Date()
  return {
    from: formatDateToApi(startOfWeek(now, { weekStartsOn: 1 })),
    to: formatDateToApi(endOfWeek(now, { weekStartsOn: 1 })),
  }
}

/**
 * Monday-start calendar week (Monday–Sunday) containing the given date, as
 * `yyyy-MM-dd` server strings. Matches the backend TKKD week mode, which resolves
 * the whole Mon–Sun week from any date passed in the `week` query param.
 */
export const getWeekRangeApi = (date: string | Date): { from: string; to: string } => {
  const anchor = date instanceof Date ? date : (parseDateFromApi(date) ?? new Date(date))
  return {
    from: formatDateToApi(startOfWeek(anchor, { weekStartsOn: 1 })),
    to: formatDateToApi(endOfWeek(anchor, { weekStartsOn: 1 })),
  }
}

/**
 * Human-readable label for the Mon–Sun week containing the given date,
 * e.g. `07/07/2026 - 13/07/2026`. Returns `''` for an invalid input.
 */
export const formatWeekRangeText = (date: string | Date | null | undefined): string => {
  if (!date) return ''
  const anchor = date instanceof Date ? date : (parseDateFromApi(date) ?? new Date(date))
  if (!isValid(anchor)) return ''
  return `${formatDate(startOfWeek(anchor, { weekStartsOn: 1 }))} - ${formatDate(
    endOfWeek(anchor, { weekStartsOn: 1 })
  )}`
}

/**
 * Current calendar month (first day–last day) as `yyyy-MM-dd` server strings.
 * Mirrors the backend admin-dashboard "tháng này" range.
 */
export const getThisMonthRangeApi = (): { from: string; to: string } => {
  const now = new Date()
  return {
    from: formatDateToApi(startOfMonth(now)),
    to: formatDateToApi(endOfMonth(now)),
  }
}

export const formatDateRangeText = (from?: Date | string, to?: Date | string): string => {
  if (from && to) {
    return `Từ ${formatDate(from)} - ${formatDate(to)}`
  }

  if (from) {
    return `Từ ${formatDate(from)}`
  }

  if (to) {
    return `Đến ${formatDate(to)}`
  }

  return ''
}

/**
 * Parses a date string in 'yyyy-MM-dd' (server/API) format to a Date object.
 * Use this when converting URL params or API response date strings to Date objects
 * (e.g. for populating date pickers or form state).
 * Returns undefined if the input is missing or invalid.
 */
export const parseDateFromApi = (val: string | null | undefined): Date | undefined => {
  if (!val) return undefined
  const parsed = parse(val, DATE_SERVER_FORMAT, new Date())
  return isValid(parsed) ? parsed : undefined
}

export const parseStringToDate = (val: string | undefined): Date | undefined => {
  if (!val) return undefined
  try {
    const parsed = parse(val, DATE_FORMAT, new Date())
    return parsed.toString() === 'Invalid Date' ? undefined : parsed
  } catch {
    return undefined
  }
}

/**
 * Formats a datetime string ('dd/MM/yyyy HH:mm') or Date to ISO 8601 format for API requests.
 * @returns ISO datetime string (yyyy-MM-dd'T'HH:mm:ss) or empty string if invalid
 */
export const formatDateTimeToApi = (datetime: string | Date | undefined): string => {
  if (!datetime) return ''
  try {
    if (datetime instanceof Date) {
      return isValid(datetime) ? format(datetime, "yyyy-MM-dd'T'HH:mm:ss") : ''
    }
    const parsed = parse(datetime, DATETIME_FORMAT, new Date())
    return isValid(parsed) ? format(parsed, "yyyy-MM-dd'T'HH:mm:ss") : ''
  } catch {
    return ''
  }
}

/**
 * Parses an ISO datetime string from API to a display string in 'dd/MM/yyyy HH:mm' format.
 * Also handles legacy date-only strings ('yyyy-MM-dd'), defaulting time to 23:59.
 */
export const parseDateTimeFromApi = (val: string | null | undefined): string => {
  if (!val) return ''
  try {
    if (val.includes('T')) {
      const d = parseISO(val)
      return isValid(d) ? format(d, DATETIME_FORMAT) : ''
    }
    const d = parse(val, DATE_SERVER_FORMAT, new Date())
    return isValid(d) ? `${format(d, DATE_FORMAT)} 23:59` : ''
  } catch {
    return ''
  }
}

/**
 * Parses a month string in non-padded 'M/yyyy' format returned by the salary-period API
 * (e.g. "1/2025", "12/2025") to a Date object.
 * Returns undefined if the input is missing or invalid.
 */
export const parseMonthFromApi = (val: string | null | undefined): Date | undefined => {
  if (!val) return undefined
  const parsed = parse(val, 'M/yyyy', new Date())
  return isValid(parsed) ? parsed : undefined
}

/**
 * Converts a 'yyyy-MM' month key returned by the API to the display format 'MM/yyyy'.
 * Falls back to the original key if parsing fails.
 */
export const formatMonthKeyFromApi = (monthKey: string): string => {
  try {
    const date = parseISO(`${monthKey}-01`)
    return isValid(date) ? format(date, MONTH_SERVER_FORMAT) : monthKey
  } catch {
    return monthKey
  }
}

/**
 * Nhận diện dạng của một `period_label` do admin-dashboard phát ra. Ba dạng đã xác nhận
 * bằng chính API dev (24/08/2026): `2025` · `2026-06` · `2026-W23`.
 */
const PERIOD_LABEL_PATTERNS = {
  year: /^\d{4}$/,
  month: /^\d{4}-\d{2}$/,
  week: /^\d{4}-W\d{2}$/,
} as const

/**
 * Nhãn kỳ (`period_label`) của admin-dashboard → khoảng ngày `yyyy-MM-dd` để gửi lên API.
 *
 * Endpoint `performance` KHÔNG có tham số `period`, chỉ có `from`/`to` — nên lọc theo kỳ
 * chỉ thực hiện được bằng cách quy kỳ về đúng cặp mốc ngày của nó.
 *
 * Dạng kỳ tự nhận diện qua chính chuỗi, không cần truyền `group` vào: truyền `group` thì
 * hai nguồn sự thật có thể lệch nhau (người dùng đổi "nhóm theo thời gian" trước khi kỳ cũ
 * kịp bị xoá), còn đọc từ chuỗi thì không lệch được.
 *
 * Trả `undefined` khi chuỗi không thuộc dạng nào — caller bỏ qua bộ lọc thay vì gửi ngày rác.
 */
export const getPeriodLabelRangeApi = (
  label: string | null | undefined
): { from: string; to: string } | undefined => {
  if (!label) return undefined

  if (PERIOD_LABEL_PATTERNS.year.test(label)) {
    const anchor = parse(label, 'yyyy', new Date())
    if (!isValid(anchor)) return undefined
    return { from: formatDateToApi(startOfYear(anchor)), to: formatDateToApi(endOfYear(anchor)) }
  }

  if (PERIOD_LABEL_PATTERNS.month.test(label)) {
    const anchor = parse(label, 'yyyy-MM', new Date())
    if (!isValid(anchor)) return undefined
    return { from: formatDateToApi(startOfMonth(anchor)), to: formatDateToApi(endOfMonth(anchor)) }
  }

  if (PERIOD_LABEL_PATTERNS.week.test(label)) {
    // `RRRR`/`II` = năm-theo-tuần và số tuần ISO. Phải đi cùng nhau, dùng `yyyy`/`ww` ở đây
    // sẽ lệch một tuần ở các năm mà 01/01 rơi vào giữa tuần.
    const anchor = parse(label, "RRRR-'W'II", new Date())
    if (!isValid(anchor)) return undefined
    return {
      from: formatDateToApi(startOfWeek(anchor, { weekStartsOn: 1 })),
      to: formatDateToApi(endOfWeek(anchor, { weekStartsOn: 1 })),
    }
  }

  return undefined
}

/**
 * Nhãn kỳ của kỳ ĐANG DIỄN RA, cùng định dạng với `period_label` mà API phát ra — dùng làm
 * giá trị mặc định cho bộ lọc kỳ.
 *
 * Phải tính lúc gọi, không được đóng băng thành hằng số ở mức module: dashboard là màn hay
 * bị mở nguyên ngày (và qua đêm), một hằng số tính lúc import sẽ trỏ sang tháng cũ ngay sau
 * nửa đêm mùng 1 mà giao diện không có dấu hiệu gì.
 *
 * `group` nhận chuỗi thay vì enum của schema để date-utils không phải phụ thuộc vào tầng API.
 * Chuỗi lạ trả `''` (= tất cả kỳ) chứ không đoán bừa sang tháng.
 */
export const getCurrentPeriodLabel = (group: string): string => {
  const now = new Date()
  switch (group) {
    case 'year':
      return format(now, 'yyyy')
    case 'month':
      return format(now, 'yyyy-MM')
    case 'week':
      // `RRRR`/`II` = năm-theo-tuần ISO, xem ghi chú ở `getPeriodLabelRangeApi`.
      return format(now, "RRRR-'W'II")
    default:
      return ''
  }
}

/**
 * Nhãn kỳ của admin-dashboard → chữ đọc được cho người dùng:
 * `2025` → `Năm 2025` · `2026-06` → `Tháng 06/2026` · `2026-W23` → `Tuần 23/2026`.
 * Chuỗi lạ thì trả nguyên văn, để bộ lọc không bao giờ hiện ô trống.
 */
export const formatPeriodLabel = (label: string | null | undefined): string => {
  if (!label) return ''
  if (PERIOD_LABEL_PATTERNS.year.test(label)) return `Năm ${label}`
  if (PERIOD_LABEL_PATTERNS.month.test(label)) {
    const [year, month] = label.split('-')
    return `Tháng ${month}/${year}`
  }
  if (PERIOD_LABEL_PATTERNS.week.test(label)) {
    const [year, week] = label.split('-W')
    return `Tuần ${week}/${year}`
  }
  return label
}

/**
 * Formats a date to MM/YYYY format for API requests that require month format.
 * @param date - The date to format
 * @returns The formatted month string (MM/YYYY) or empty string if invalid
 */
export const formatDateToMonth = (date: Date | undefined): string => {
  if (!date) {
    return ''
  }
  try {
    return format(date, 'MM/yyyy')
  } catch (error) {
    console.error('Error formatting date to month:', error)
    return ''
  }
}

/**
 * Formats a date to ISO month (yyyy-MM) for BE endpoints that require ISO format.
 * @param date - The date to format
 * @returns The formatted month string (yyyy-MM) or empty string if invalid
 */
export const formatDateToServerMonth = (date: Date | undefined): string => {
  if (!date) {
    return ''
  }
  try {
    return format(date, 'yyyy-MM')
  } catch (error) {
    console.error('Error formatting date to ISO month:', error)
    return ''
  }
}
