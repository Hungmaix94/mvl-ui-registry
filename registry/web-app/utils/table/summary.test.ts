import { describe, expect, it } from 'vitest'
import {
  formatDirectionalCurrency,
  formatSummaryCurrency,
  sumRows,
  sumRowsByKeys,
  toSummaryNumber,
  toSummaryParams,
} from '@/utils/table/summary'

describe('toSummaryParams', () => {
  it('drops page and page_size so paging never changes the query key', () => {
    const page1 = toSummaryParams({ status: 'POSTED', page: 1, page_size: 25 })
    const page7 = toSummaryParams({ status: 'POSTED', page: 7, page_size: 50 })

    expect(page1).toEqual({ status: 'POSTED' })
    expect(page7).toEqual(page1)
  })

  it('keeps every other filter untouched', () => {
    expect(toSummaryParams({ year: 2026, month: 7, search: 'HD001', investor: 3 })).toEqual({
      year: 2026,
      month: 7,
      search: 'HD001',
      investor: 3,
    })
  })

  it('drops ordering so sorting never refetches the total', () => {
    // Một tổng không phụ thuộc thứ tự dòng. Giữ `ordering` trong query key thì mỗi lần bấm
    // sort lại gọi `/summary/` — nặng nhất ở BC Đối chiếu HĐ CĐT (dựng mọi dòng của tập lọc).
    const asc = toSummaryParams({ status: 'POSTED', ordering: 'total_amount', page: 1 })
    const desc = toSummaryParams({ status: 'POSTED', ordering: '-invoice_date', page: 3 })

    expect(asc).toEqual({ status: 'POSTED' })
    expect(desc).toEqual(asc)
  })

  it('returns an empty object for undefined params', () => {
    expect(toSummaryParams(undefined)).toEqual({})
  })
})

describe('toSummaryNumber', () => {
  it('parses decimal strings as the API sends them', () => {
    expect(toSummaryNumber('1200000.50')).toBe(1200000.5)
  })

  it('strips thousand separators from display strings', () => {
    expect(toSummaryNumber('1,200,000')).toBe(1200000)
  })

  it('returns null for empty, null and undefined', () => {
    expect(toSummaryNumber('')).toBeNull()
    expect(toSummaryNumber(null)).toBeNull()
    expect(toSummaryNumber(undefined)).toBeNull()
  })

  it('returns null for values that are not finite numbers', () => {
    expect(toSummaryNumber('abc')).toBeNull()
    expect(toSummaryNumber(Number.NaN)).toBeNull()
    expect(toSummaryNumber(Number.POSITIVE_INFINITY)).toBeNull()
    expect(toSummaryNumber({})).toBeNull()
  })

  it('keeps zero, which is a real amount', () => {
    expect(toSummaryNumber(0)).toBe(0)
    expect(toSummaryNumber('0')).toBe(0)
  })
})

describe('sumRows', () => {
  const rows = [{ amount: '100' }, { amount: 250 }, { amount: null }, { amount: 'n/a' }]

  it('sums numeric values and skips the rest', () => {
    expect(sumRows(rows, (row) => row.amount)).toBe(350)
  })

  it('returns null when no row contributes a number, so callers can render a dash', () => {
    expect(sumRows([{ amount: null }, { amount: '' }], (row) => row.amount)).toBeNull()
  })

  it('returns null for an empty or missing row set', () => {
    expect(sumRows([], (row: { amount: string }) => row.amount)).toBeNull()
    expect(sumRows(undefined, (row: { amount: string }) => row.amount)).toBeNull()
    expect(sumRows(null, (row: { amount: string }) => row.amount)).toBeNull()
  })

  it('supports derived values, not just plain fields', () => {
    const advances = [
      { paid: '1000', recovered: '400' },
      { paid: '500', recovered: '500' },
    ]
    expect(sumRows(advances, (row) => Number(row.paid) - Number(row.recovered))).toBe(600)
  })
})

describe('sumRowsByKeys', () => {
  it('sums several fields in one pass', () => {
    const rows = [
      { gross: '100', net: '90' },
      { gross: '200', net: '180' },
    ]
    expect(sumRowsByKeys(rows, ['gross', 'net'])).toEqual({ gross: 300, net: 270 })
  })

  it('reports null per key when that key has no numeric value', () => {
    const rows = [{ gross: '100', net: null }]
    expect(sumRowsByKeys(rows, ['gross', 'net'])).toEqual({ gross: 100, net: null })
  })
})

describe('formatSummaryCurrency', () => {
  it('formats a numeric total in Vietnamese currency style', () => {
    expect(formatSummaryCurrency(1200000)).toBe('1.200.000')
    expect(formatSummaryCurrency('1200000')).toBe('1.200.000')
  })

  it('renders a dash when there is nothing to total, never a fake zero', () => {
    expect(formatSummaryCurrency(null)).toBe('—')
    expect(formatSummaryCurrency(undefined)).toBe('—')
    expect(formatSummaryCurrency('')).toBe('—')
  })

  it('still renders a real zero total', () => {
    expect(formatSummaryCurrency(0)).toBe('0')
  })
})

describe('formatDirectionalCurrency', () => {
  // Dấu phải giống nhau ở ô dữ liệu và dòng tổng. Lỗi cũ: thân bảng in `−1`, dòng tổng in `1`
  // — cùng một số tiền, hai cách in, người dùng đọc ra hai đại lượng khác nhau.
  it('gắn dấu trừ cho tiền chi', () => {
    expect(formatDirectionalCurrency(1, '−')).toBe('−1')
    expect(formatDirectionalCurrency(54579545, '−')).toBe('−54.579.545')
  })

  it('gắn dấu cộng cho tiền thu', () => {
    expect(formatDirectionalCurrency(275000000, '+')).toBe('+275.000.000')
  })

  it('nhận chuỗi decimal của DRF', () => {
    expect(formatDirectionalCurrency('81304545.00', '−')).toBe('−81.304.545')
  })

  it('in 0 đồng là số 0 chứ không phải gạch ngang', () => {
    // Kiểm bằng null, không bằng falsy: `0` là falsy nên lối cũ `amt ? ... : '-'` biến một
    // phiếu 0 đồng thành "không có dữ liệu".
    expect(formatDirectionalCurrency(0, '−')).toBe('−0')
    expect(formatDirectionalCurrency('0', '+')).toBe('+0')
  })

  it('chỉ dùng gạch ngang khi thực sự không có giá trị', () => {
    expect(formatDirectionalCurrency(null, '−')).toBe('—')
    expect(formatDirectionalCurrency(undefined, '+')).toBe('—')
  })
})
