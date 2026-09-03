/**
 * Helpers for the sticky summary ("TỔNG CỘNG") row rendered at the bottom of list tables.
 *
 * IMPORTANT — only use `sumRows` when the frontend holds the WHOLE filtered set.
 * On a server-paginated endpoint `rows` is a single page, so summing here produces the
 * total of that page, not of the filter — which is wrong and actively misleading for
 * accounting. Those screens must read `totals` from the API response instead.
 * See docs/list_total_row_be_request_20260731.md.
 */

import { formatCurrencyVND } from '@/utils/common'

/**
 * Coerce an API money value into a number.
 *
 * Feed it RAW API values only — decimal strings like `"1200000.00"`, or numbers.
 * Returns `null` for anything that is not a finite number, so the caller can skip it
 * instead of poisoning the sum with `NaN`.
 *
 * ⚠️ NEVER pass a formatted display string. This app formats money vi-VN style, where the
 * dot is the THOUSANDS separator (`"1.234.567"`) — but here a dot is the decimal point, so
 * that string parses to `1.234567`. No error, no `NaN`, just a total roughly a million times
 * too small. Only `,` is stripped, for the rare en-US formatted input.
 */
export function toSummaryNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const parsed = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Sum one numeric field across rows, skipping null/empty/non-numeric values.
 * Returns `null` when no row contributed a number, so the caller can render a dash
 * instead of a misleading `0`.
 */
export function sumRows<TRow>(
  rows: readonly TRow[] | null | undefined,
  selector: (row: TRow) => unknown
): number | null {
  if (!rows?.length) return null

  let total = 0
  let hasValue = false

  for (const row of rows) {
    const value = toSummaryNumber(selector(row))
    if (value === null) continue
    total += value
    hasValue = true
  }

  return hasValue ? total : null
}

/**
 * Strip pagination **and ordering** out of a list's query params to get the params for its
 * `/summary/` sibling.
 *
 * The summary endpoints accept the same filters as their list and ignore `page` /
 * `page_size` / `ordering` — a total depends on neither which page you are looking at nor
 * what order the rows come back in. Dropping them here keeps the React Query key stable, so
 * paging and sorting never refetch the summary. That matters most for the
 * investor-invoice-reconciliation report, whose summary builds every row of the filtered set.
 */
export function toSummaryParams<TParams extends Record<string, unknown> | undefined>(
  params: TParams
): Record<string, unknown> {
  if (!params) return {}
  const { page: _page, page_size: _pageSize, ordering: _ordering, ...filters } = params
  return filters
}

/**
 * Render a summary cell's money value. Shows an em dash when there is nothing to total,
 * so an empty column never reads as a real zero.
 */
export function formatSummaryCurrency(value: unknown): string {
  const amount = toSummaryNumber(value)
  return amount === null ? '—' : formatCurrencyVND(amount)
}

/** Hướng tiền của một cột chứng từ: phiếu thu là tiền vào, phiếu chi là tiền ra. */
export type MoneyDirection = '+' | '−'

/**
 * Tiền có dấu cho cột "Số tiền (VND)" của phiếu thu / phiếu chi.
 *
 * Dấu phải xuất hiện ở CẢ ô dữ liệu LẪN dòng tổng. Trước đây chỉ ô dữ liệu được gắn dấu còn
 * `footer` gọi `formatSummaryCurrency` không dấu, nên cùng một cột đọc ra `−1` ở thân bảng và
 * `1` ở dòng tổng — cùng một số tiền in ra hai kiểu, người dùng tưởng là hai đại lượng khác nhau.
 *
 * Trả `—` khi không có giá trị, nhưng số 0 vẫn in ra `0`: 0 đồng là một con số có thật, khác hẳn
 * "chưa có dữ liệu". Kiểm bằng `null` chứ không bằng tính falsy vì `0` là falsy.
 */
export function formatDirectionalCurrency(value: unknown, direction: MoneyDirection): string {
  const amount = toSummaryNumber(value)
  if (amount === null) return '—'
  return `${direction}${formatCurrencyVND(amount)}`
}

/**
 * Sum several fields in a single pass — the shape the summary row consumes.
 *
 * ```ts
 * const totals = sumRowsByKeys(rows, ['gross', 'net'])
 * // → { gross: 1200000, net: 1080000 }
 * ```
 */
export function sumRowsByKeys<TRow extends Record<string, unknown>, TKey extends keyof TRow>(
  rows: readonly TRow[] | null | undefined,
  keys: readonly TKey[]
): Record<TKey, number | null> {
  return Object.fromEntries(keys.map((key) => [key, sumRows(rows, (row) => row[key])])) as Record<
    TKey,
    number | null
  >
}
