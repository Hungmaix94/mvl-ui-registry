import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatDateToApi,
  formatPeriodLabel,
  formatWeekRangeText,
  getPeriodLabelRangeApi,
  getThisMonthRangeApi,
  getThisWeekRangeApi,
  getWeekRangeApi,
  getTodayApiDate,
} from './date-utils'

describe('formatDateToApi', () => {
  it('converts a dd/MM/yyyy display string to yyyy-MM-dd', () => {
    expect(formatDateToApi('18/07/2026')).toBe('2026-07-18')
  })

  it('passes through a yyyy-MM-dd server string untouched (edit-mode default seeded from API)', () => {
    expect(formatDateToApi('2026-07-18')).toBe('2026-07-18')
  })

  it('converts a Date object to yyyy-MM-dd', () => {
    expect(formatDateToApi(new Date(2026, 6, 18))).toBe('2026-07-18')
  })

  it('returns an empty string for falsy input', () => {
    expect(formatDateToApi(undefined)).toBe('')
    expect(formatDateToApi('')).toBe('')
  })

  it('returns an empty string for an unparseable string', () => {
    expect(formatDateToApi('not-a-date')).toBe('')
  })
})

describe('getTodayApiDate', () => {
  afterEach(() => vi.useRealTimers())

  it('returns today as a yyyy-MM-dd string', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15, 10, 30)) // Wed 15 Jul 2026
    expect(getTodayApiDate()).toBe('2026-07-15')
  })
})

describe('getThisWeekRangeApi', () => {
  afterEach(() => vi.useRealTimers())

  it('returns Monday–Sunday of the current week (mid-week)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15, 10, 30)) // Wed 15 Jul 2026
    expect(getThisWeekRangeApi()).toEqual({ from: '2026-07-13', to: '2026-07-19' })
  })

  it('keeps Monday as the week start when today is Sunday', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 19, 23, 0)) // Sun 19 Jul 2026
    expect(getThisWeekRangeApi()).toEqual({ from: '2026-07-13', to: '2026-07-19' })
  })
})

describe('getThisMonthRangeApi', () => {
  afterEach(() => vi.useRealTimers())

  it('returns the first and last day of the current month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15, 10, 30)) // Wed 15 Jul 2026
    expect(getThisMonthRangeApi()).toEqual({ from: '2026-07-01', to: '2026-07-31' })
  })

  it('handles February in a non-leap year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 1, 10, 8, 0)) // Tue 10 Feb 2026
    expect(getThisMonthRangeApi()).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })
})

describe('getWeekRangeApi', () => {
  it('resolves the Mon–Sun week from any mid-week date (Date input)', () => {
    // Wed 15 Jul 2026 → week is Mon 13 → Sun 19
    expect(getWeekRangeApi(new Date(2026, 6, 15))).toEqual({
      from: '2026-07-13',
      to: '2026-07-19',
    })
  })

  it('resolves the Mon–Sun week from a yyyy-MM-dd server string', () => {
    expect(getWeekRangeApi('2026-07-15')).toEqual({ from: '2026-07-13', to: '2026-07-19' })
  })

  it('keeps Monday as the week start when the anchor is Sunday', () => {
    expect(getWeekRangeApi('2026-07-19')).toEqual({ from: '2026-07-13', to: '2026-07-19' })
  })

  it('keeps the same week when the anchor is Monday', () => {
    expect(getWeekRangeApi('2026-07-13')).toEqual({ from: '2026-07-13', to: '2026-07-19' })
  })

  it('spans across a month boundary correctly', () => {
    // Wed 1 Jul 2026 → week is Mon 29 Jun → Sun 5 Jul
    expect(getWeekRangeApi('2026-07-01')).toEqual({ from: '2026-06-29', to: '2026-07-05' })
  })
})

describe('formatWeekRangeText', () => {
  it('formats the Mon–Sun week as a dd/MM/yyyy range label', () => {
    expect(formatWeekRangeText('2026-07-15')).toBe('13/07/2026 - 19/07/2026')
  })

  it('returns an empty string for falsy input', () => {
    expect(formatWeekRangeText(undefined)).toBe('')
    expect(formatWeekRangeText(null)).toBe('')
    expect(formatWeekRangeText('')).toBe('')
  })
})

describe('getPeriodLabelRangeApi', () => {
  it('quy nhãn kỳ theo năm về trọn năm', () => {
    expect(getPeriodLabelRangeApi('2025')).toEqual({ from: '2025-01-01', to: '2025-12-31' })
  })

  it('quy nhãn kỳ theo tháng về trọn tháng, kể cả tháng 2 năm nhuận', () => {
    expect(getPeriodLabelRangeApi('2026-06')).toEqual({ from: '2026-06-01', to: '2026-06-30' })
    expect(getPeriodLabelRangeApi('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' })
  })

  it('quy nhãn kỳ theo tuần ISO về đúng Thứ 2 - Chủ nhật', () => {
    expect(getPeriodLabelRangeApi('2026-W23')).toEqual({ from: '2026-06-01', to: '2026-06-07' })
  })

  it('tuần ISO đầu năm bám năm-theo-tuần, không bám năm dương lịch', () => {
    // 2026-W01 bắt đầu 29/12/2025 (Thứ 2) — dùng yyyy/ww thay vì RRRR/II sẽ lệch một tuần.
    expect(getPeriodLabelRangeApi('2026-W01')).toEqual({ from: '2025-12-29', to: '2026-01-04' })
  })

  it('trả undefined cho chuỗi không phải nhãn kỳ, thay vì đoán bừa một khoảng ngày', () => {
    expect(getPeriodLabelRangeApi('')).toBeUndefined()
    expect(getPeriodLabelRangeApi(null)).toBeUndefined()
    expect(getPeriodLabelRangeApi(undefined)).toBeUndefined()
    expect(getPeriodLabelRangeApi('06/2026')).toBeUndefined()
    expect(getPeriodLabelRangeApi('linh tinh')).toBeUndefined()
  })
})

describe('formatPeriodLabel', () => {
  it('đọc được ba dạng nhãn kỳ mà API phát ra', () => {
    expect(formatPeriodLabel('2025')).toBe('Năm 2025')
    expect(formatPeriodLabel('2026-06')).toBe('Tháng 06/2026')
    expect(formatPeriodLabel('2026-W23')).toBe('Tuần 23/2026')
  })

  it('giữ nguyên văn chuỗi lạ để ô lọc không bao giờ trống', () => {
    expect(formatPeriodLabel('quý 1')).toBe('quý 1')
    expect(formatPeriodLabel(null)).toBe('')
  })
})
