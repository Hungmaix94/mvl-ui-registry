import { describe, expect, it } from 'vitest'
import { formatPayrollTotal } from './payroll-totals'

describe('formatPayrollTotal', () => {
  it('gắn hậu tố "đ" cho khớp ô dữ liệu ở trên', () => {
    expect(formatPayrollTotal(1234567)).toBe('1.234.567 đ')
    expect(formatPayrollTotal('1234567')).toBe('1.234.567 đ')
  })

  it('đọc được chuỗi decimal mà khối `summary` của API trả về', () => {
    expect(formatPayrollTotal('89612579')).toBe('89.612.579 đ')
    expect(formatPayrollTotal('1200000.00')).toBe('1.200.000 đ')
  })

  it('giữ dấu âm của cột thu hồi/điều chỉnh thay vì nuốt mất', () => {
    expect(formatPayrollTotal('-2000')).toBe('-2.000 đ')
  })

  it('trả em dash trần khi không có gì để cộng — không phải "— đ"', () => {
    expect(formatPayrollTotal(null)).toBe('—')
    expect(formatPayrollTotal('')).toBe('—')
    expect(formatPayrollTotal(undefined)).toBe('—')
  })

  it('chuỗi không phải số ra em dash chứ không phải NaN', () => {
    expect(formatPayrollTotal('n/a')).toBe('—')
  })

  it('số 0 thật vẫn hiện 0, không rơi về em dash', () => {
    expect(formatPayrollTotal(0)).toBe('0 đ')
    expect(formatPayrollTotal('0')).toBe('0 đ')
  })
})
