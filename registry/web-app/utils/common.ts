import { ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Removes properties from an object that have undefined, null, or empty string values.
 * @param obj The object to clean.
 * @returns A new object with cleaned properties.
 */
export function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => {
      if (value === undefined || value === null) return false
      if (typeof value === 'string' && value.trim() === '') return false
      if (Array.isArray(value) && value.length === 0) return false
      return true
    })
  ) as Partial<T>
}

/**
 * Formats a number using 'vi-VN' locale.
 * @param value The number to format.
 * @param options Intl.NumberFormatOptions
 * @returns Formatted number string.
 */
export function formatNumber(value: number | string, options?: Intl.NumberFormatOptions): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) {
    return '-'
  }
  return num.toLocaleString('vi-VN', options)
}

/**
 * Formats a number into a Vietnamese Dong currency string.
 * @param value The number to format.
 * @param options Optional Intl.NumberFormatOptions
 * @returns Formatted currency string (e.g., "5.000.000").
 */
export function formatCurrencyVND(
  value: number | string,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) {
    return '-'
  }
  return formatNumber(Math.round(num), options)
}

/**
 * Parses a Vietnamese Dong currency string back into a number.
 * @param value The currency string to parse.
 * @returns Parsed number (e.g., "5.000.000 VND" -> 5000000).
 */
export function parseCurrencyVND(value: string): number {
  if (!value) {
    return 0
  }
  // For VND, we treat both dots and commas as thousands separators (no decimal cents).
  // Remove all characters except digits and minus sign.
  const cleanedValue = value.replace(/[^\d-]/g, '')
  const num = parseFloat(cleanedValue)
  return isNaN(num) ? 0 : num
}

/**
 * Formats a value as a percentage using Vietnamese locale (comma for decimals).
 * @param value The number or string to format.
 * @param isFraction If true, the value is a fraction (e.g. 0.125 -> 12,5%). If false, it's already a percent (e.g. 12.5 -> 12,5%). Default false.
 * @returns Formatted percentage string.
 */
export function formatPercent(
  value: number | string | null | undefined,
  isFraction: boolean = false,
  maximumFractionDigits: number = 3
): string {
  if (value === null || value === undefined || value === '') return '-'
  let num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '-'

  if (isFraction) {
    num = num * 100
  }

  return formatNumber(num, { maximumFractionDigits }) + '%'
}

/**
 * Formats a currency value with VND. Returns em-dash '—' if empty or invalid.
 */
export function formatMoney(v: string | number | undefined | null): string {
  if (v === undefined || v === null || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return '—'
  return formatCurrencyVND(n)
}

/**
 * Formats a currency value KEEPING its sign, using the typographic minus U+2212 for negatives.
 *
 * `formatCurrencyVND` delegates to `toLocaleString('vi-VN')`, which emits the ASCII hyphen `-`; at
 * money sizes that hyphen reads as a dash between two numbers, and an accounting-style `(1.234)`
 * reads as a footnote marker. Both are wrong on a money column, so every screen that can render a
 * NEGATIVE amount (rounding-difference invoice lines, credit notes, over-allocations) goes through
 * here. Same convention as `signedMoney()` in `ReconSheetTotalSummary`, minus the leading `+` —
 * an allocation column that prefixes every ordinary figure with `+` is noise.
 *
 * Returns `'-'` for empty/invalid input, mirroring `formatCurrencyVND` (NOT `'—'`, which
 * `formatMoney`/`formatNegative` use — those two are a different, older pair).
 */
export function formatSignedCurrencyVND(
  value: number | string | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || value === '') return '-'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(num)) return '-'
  // Round BEFORE testing the sign, and normalise `-0` away (`Math.round(-0.4)` IS `-0`, and
  // `(-0).toLocaleString()` prints "-0"): −0,4 must render "0", never "−0" or "-0".
  const rounded = Math.round(num) || 0
  if (rounded < 0) return `−${formatCurrencyVND(Math.abs(rounded), options)}`
  return formatCurrencyVND(rounded, options)
}

/**
 * Formats a currency value as negative (with U+2212 minus sign). Returns em-dash '—' if empty, invalid, or zero.
 */
export function formatNegative(v: string | number | undefined | null): string {
  if (v === undefined || v === null || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n) || n === 0) return '—'
  return `−${formatCurrencyVND(Math.abs(n))}`
}

/**
 * Formats a value as a percentage. Returns em-dash '—' if empty or invalid.
 */
export function formatPct(
  value?: string | number | null | undefined,
  maximumFractionDigits: number = 3
): string {
  if (value === undefined || value === null || value === '') return '—'
  return formatPercent(value, false, maximumFractionDigits)
}

/**
 * Formats a CONFIGURED RATE: minimum 2 decimals, maximum 3 ("2,00%" / "1,667%").
 *
 * The F2 rate cluster (hoa hồng sàn liên kết, thưởng F2, tỷ lệ giữ giỏ hàng) is stored at
 * numeric(6,3) since 12/08/2026, so a third decimal is real data and must not be rounded
 * away. The 2-decimal MINIMUM is what keeps the familiar reading: a plain 2% still shows
 * as "2,00%", not "2%" (which is what `formatPct` gives, since it only caps the maximum).
 *
 * Not to be confused with `formatPctFloor` — that one is ROUND_DOWN at 2dp and belongs to
 * the collection / cumulative / cap percentages, which must never advertise more than the
 * cash actually collected. A configured rate is an exact input, so it rounds half-up.
 */
export function formatRatePct(value?: string | number | null | undefined): string {
  if (value === undefined || value === null || value === '') return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return formatNumber(num, { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + '%'
}

/**
 * Formats a percentage by rounding DOWN (floor) to `digits` decimals.
 *
 * The single rounding rule for every collection / cumulative / cap percentage: the BE ships
 * these at numeric(14,10) with ROUND_DOWN and the UI must not round them back up.
 * - Half-up advertises a cap above the cash actually collected, so an accountant typing the
 *   exact number on screen gets silently clamped.
 * - Rounding each row half-up also stops the rows from adding up to their own total: two IR
 *   rows showing 34,61 + 34,61 against a "Lũy kế toàn căn" of 69,23 was the reported bug.
 *
 * Truncates toward zero (`Math.trunc`, not `Math.floor`) to mirror Decimal's ROUND_DOWN on
 * the BE — a retro correction can make a period's fee progress negative, and floor would
 * grow its magnitude instead of shrinking it.
 *
 * `toFixed(9)` before truncating is required, not defensive: 69.23 * 100 is 6922.999999999999
 * in float64, which would truncate to 69,22. 9 digits is the discriminating width — float
 * error on these magnitudes is ~1e-12 while the BE's own quantum (1e-10 of a percent) lands
 * at 1e-8 once scaled, so it absorbs the noise without ever swallowing a real digit.
 */
export function formatPctFloor(
  value?: string | number | null | undefined,
  digits: number = 2
): string {
  if (value === undefined || value === null || value === '') return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  const scale = 10 ** digits
  return formatPercent(Math.trunc(Number((num * scale).toFixed(9))) / scale, false, digits)
}

export function createOptions<T>(
  options: Array<T & { id: number | string; name: string }>
): Array<{ value: string | number; label: string }> {
  return options.map((option) => ({
    label: option.name,
    value: option.id,
  }))
}

/**
 * Formats a numeric value for report display using the Vietnamese locale.
 * Integers render without decimals; fractional values show up to 2 decimals.
 * Nullish or non-finite input renders as "0".
 */
export function formatReportNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0'
  const num = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(num)) return '0'
  return num.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
}

/**
 * Rounds a number to at most `decimals` fraction digits (default 2), returning a number.
 * Nullish or non-finite input returns 0. Useful for keeping exported cells numeric.
 */
export function roundNumber(value: number | null | undefined, decimals = 2): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined

  const trimmed = value.trim()
  if (trimmed === '') return undefined

  // Only accept digits to avoid parseInt("1abc") => 1
  if (!/^\d+$/.test(trimmed)) return undefined

  const num = Number.parseInt(trimmed, 10)
  return Number.isFinite(num) && num > 0 ? num : undefined
}
