import { describe, expect, it } from 'vitest'
import {
  formatPct,
  formatPctFloor,
  formatRatePct,
  formatReportNumber,
  formatSignedCurrencyVND,
  roundNumber,
} from './common'

describe('formatReportNumber', () => {
  it('returns "0" for nullish or empty input', () => {
    expect(formatReportNumber(null)).toBe('0')
    expect(formatReportNumber(undefined)).toBe('0')
    expect(formatReportNumber('')).toBe('0')
  })

  it('returns "0" for non-numeric strings', () => {
    expect(formatReportNumber('abc')).toBe('0')
  })

  it('formats finite numbers with the vi-VN locale, capped at 2 decimals', () => {
    // Compare against the same locale expression so the assertion is not tied to
    // a specific decimal/grouping separator across environments.
    expect(formatReportNumber(4.16)).toBe(
      (4.16).toLocaleString('vi-VN', { maximumFractionDigits: 2 })
    )
    expect(formatReportNumber(337)).toBe(
      (337).toLocaleString('vi-VN', { maximumFractionDigits: 2 })
    )
  })

  it('rounds to at most 2 decimals', () => {
    expect(formatReportNumber(4.16049)).toBe(
      (4.16).toLocaleString('vi-VN', { maximumFractionDigits: 2 })
    )
  })

  it('coerces numeric strings before formatting', () => {
    expect(formatReportNumber('4.16')).toBe(
      (4.16).toLocaleString('vi-VN', { maximumFractionDigits: 2 })
    )
  })
})

describe('roundNumber', () => {
  it('returns 0 for nullish or non-finite input', () => {
    expect(roundNumber(null)).toBe(0)
    expect(roundNumber(undefined)).toBe(0)
    expect(roundNumber(Number.NaN)).toBe(0)
    expect(roundNumber(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('rounds to 2 decimals by default', () => {
    expect(roundNumber(4.16049)).toBe(4.16)
    expect(roundNumber(4.126)).toBe(4.13)
    expect(roundNumber(337)).toBe(337)
    expect(roundNumber(0)).toBe(0)
  })

  it('respects a custom number of decimals', () => {
    expect(roundNumber(4.567, 1)).toBe(4.6)
    expect(roundNumber(4.5, 0)).toBe(5)
  })
})

describe('formatPctFloor', () => {
  it('returns the em-dash for nullish, empty or non-numeric input', () => {
    expect(formatPctFloor(null)).toBe('—')
    expect(formatPctFloor(undefined)).toBe('—')
    expect(formatPctFloor('')).toBe('—')
    expect(formatPctFloor('abc')).toBe('—')
  })

  it('cuts the extra decimals off instead of rounding them up', () => {
    // formatPct half-ups these to 69,23% — the exact mismatch reported on Muc 3, where the
    // two IR rows added up to 69,22 while the "Luy ke toan can" cell showed 69,23.
    expect(formatPctFloor('69.2299999999')).toBe('69,22%')
    expect(formatPctFloor('16.6666666666')).toBe('16,66%')
    expect(formatPct('69.2299999999', 2)).toBe('69,23%')
  })

  it('keeps a value that is already exact — float64 must not eat the last cent', () => {
    // 69.23 * 100 === 6922.999999999999, so a naive Math.floor(v * 100) / 100 returns 69,22.
    expect(formatPctFloor('69.23')).toBe('69,23%')
    expect(formatPctFloor(0.29)).toBe('0,29%')
    expect(formatPctFloor(100)).toBe('100%')
    expect(formatPctFloor(0)).toBe('0%')
  })

  it('truncates toward zero on negatives, matching Decimal ROUND_DOWN on the BE', () => {
    // A retro correction can push a period negative; floor would grow the magnitude.
    expect(formatPctFloor('-16.666')).toBe('-16,66%')
  })

  it('respects a custom number of digits', () => {
    expect(formatPctFloor('69.2299999999', 4)).toBe('69,2299%')
    expect(formatPctFloor('69.99', 0)).toBe('69%')
  })
})

describe('formatRatePct', () => {
  it('returns the em-dash for nullish, empty or non-numeric input', () => {
    expect(formatRatePct(null)).toBe('—')
    expect(formatRatePct(undefined)).toBe('—')
    expect(formatRatePct('')).toBe('—')
    expect(formatRatePct('abc')).toBe('—')
  })

  it('keeps a 2-decimal MINIMUM so a plain rate still reads the familiar way', () => {
    // formatPct would print "2%" here — the whole point of this helper is that a
    // configured rate keeps its trailing zeros.
    expect(formatRatePct(2)).toBe('2,00%')
    expect(formatRatePct('2.00')).toBe('2,00%')
    expect(formatPct(2, 3)).toBe('2%')
  })

  it('shows the third decimal that the F2 rate columns now store', () => {
    expect(formatRatePct('1.667')).toBe('1,667%')
    expect(formatRatePct(2.125)).toBe('2,125%')
    expect(formatRatePct('33.333')).toBe('33,333%')
  })

  it('caps at three decimals, half-up', () => {
    expect(formatRatePct('1.6675')).toBe('1,668%')
    expect(formatRatePct('1.6674')).toBe('1,667%')
  })

  it('handles zero and whole percentages', () => {
    expect(formatRatePct(0)).toBe('0,00%')
    expect(formatRatePct(100)).toBe('100,00%')
  })
})

/**
 * Tiền ÂM trên màn phân bổ phiếu thu / phiếu chi. Hai cách trình bày SAI mà luật này chặn:
 * `-1.234` (gạch nối ASCII, ở cỡ tiền đọc như dấu nối giữa hai số) và `(1.234)` (đọc như chú thích).
 */
describe('formatSignedCurrencyVND', () => {
  it('số âm dùng dấu trừ U+2212, không ngoặc đơn', () => {
    expect(formatSignedCurrencyVND(-1234)).toBe('\u22121.234')
    expect(formatSignedCurrencyVND(-1234)).not.toContain('(')
    expect(formatSignedCurrencyVND(-1234)).not.toContain('-')
  })

  it('số dương KHÔNG thêm dấu + (cột phân bổ toàn số dương sẽ đầy nhiễu)', () => {
    expect(formatSignedCurrencyVND(1234)).toBe('1.234')
  })

  it('làm tròn trước khi xét dấu ⇒ không bao giờ ra "−0"', () => {
    expect(formatSignedCurrencyVND(-0.4)).toBe('0')
    expect(formatSignedCurrencyVND(-0)).toBe('0')
  })

  it('đọc được chuỗi decimal của BE', () => {
    expect(formatSignedCurrencyVND('-5')).toBe('\u22125')
  })

  it('rỗng / không hợp lệ trả "-" như formatCurrencyVND', () => {
    expect(formatSignedCurrencyVND(null)).toBe('-')
    expect(formatSignedCurrencyVND(undefined)).toBe('-')
    expect(formatSignedCurrencyVND('')).toBe('-')
    expect(formatSignedCurrencyVND('abc')).toBe('-')
  })
})
