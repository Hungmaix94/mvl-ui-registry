import { describe, expect, it } from 'vitest'

import { formatCompactVND } from './exec-dashboard-constants'

describe('formatCompactVND', () => {
  // Lý do tồn tại: 5 thẻ trên một hàng ở 1440px không đủ chỗ cho số 13 chữ số, chữ bị cắt thành
  // "6.709.759.381 V…". Thẻ hiện số rút gọn, số đầy đủ nằm ở tooltip.
  it('tỷ trở lên rút về "tỷ", tối đa 2 chữ số thập phân', () => {
    expect(formatCompactVND(6_709_759_381)).toEqual({ value: '6,71', unit: 'tỷ' })
  })

  it('hàng triệu rút về "triệu"', () => {
    expect(formatCompactVND(242_194_566)).toEqual({ value: '242,2', unit: 'triệu' })
  })

  it('dưới một triệu giữ nguyên VND', () => {
    expect(formatCompactVND(50_000)).toEqual({ value: '50.000', unit: 'VND' })
  })

  it('0 hiện 0 VND chứ không phải "—"', () => {
    expect(formatCompactVND(0)).toEqual({ value: '0', unit: 'VND' })
  })

  it('nhận chuỗi từ API', () => {
    expect(formatCompactVND('1406562101')).toEqual({ value: '1,41', unit: 'tỷ' })
  })

  it('null / rác → "—", không phải NaN', () => {
    expect(formatCompactVND(null)).toEqual({ value: '0', unit: 'VND' })
    expect(formatCompactVND('không phải số')).toEqual({ value: '—', unit: '' })
  })

  // Công nợ có thể âm (truy thu) — không được nuốt dấu.
  it('giữ dấu âm', () => {
    expect(formatCompactVND(-2_500_000_000)).toEqual({ value: '-2,5', unit: 'tỷ' })
  })
})
