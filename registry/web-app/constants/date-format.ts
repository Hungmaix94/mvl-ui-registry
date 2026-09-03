/**
 * Date format constants for consistent date/time formatting across the application
 *
 * Usage:
 * import { format } from 'date-fns'
 * import { DATE_FORMAT } from '@/constants/date-format'
 *
 * const formattedDate = format(new Date(dateString), DATE_FORMAT)
 */

export const DATE_FORMAT = 'dd/MM/yyyy'
export const DATE_SERVER_FORMAT = 'yyyy-MM-dd'
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm'
export const TIME_FORMAT = 'HH:mm'
export const DATE_TIME_FULL_FORMAT = 'dd/MM/yyyy HH:mm:ss'
export const MONTH_FORMAT = 'MM/yyyy'
export const MONTH_SERVER_FORMAT = 'MM/yyyy'
/**
 * ISO month format used by some BE endpoints (e.g. attendance employee-rate export).
 * Khác `MONTH_SERVER_FORMAT` (MM/yyyy) — KHÔNG đổi tên constant cũ vì nhiều endpoint
 * khác (referral cost report, ...) vẫn đang yêu cầu định dạng MM/yyyy.
 */
export const MONTH_API_ISO_FORMAT = 'yyyy-MM'
