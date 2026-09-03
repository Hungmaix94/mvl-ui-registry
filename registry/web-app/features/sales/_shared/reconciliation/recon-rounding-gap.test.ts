import { describe, expect, it } from 'vitest'

import {
  hasRoundingGap,
  sheetRoundingGap,
} from '@/features/sales/_shared/reconciliation/recon-rounding-gap'

describe('sheetRoundingGap', () => {
  it('đọc đủ ba trục từ payload của BE', () => {
    const gap = sheetRoundingGap({ rounding_gap: { net: '1', vat: '-1', with_vat: '0' } })

    expect(gap).toEqual({ net: 1, vat: -1, withVat: 0 })
  })

  it('giữ nguyên dấu âm', () => {
    const gap = sheetRoundingGap({ rounding_gap: { net: '-5', vat: '1', with_vat: '-4' } })

    expect(gap).toEqual({ net: -5, vat: 1, withVat: -4 })
  })

  it('trả 0/0/0 khi BE chưa gửi field — màn hình giữ nguyên hành vi cũ', () => {
    expect(sheetRoundingGap({})).toEqual({ net: 0, vat: 0, withVat: 0 })
    expect(sheetRoundingGap(undefined)).toEqual({ net: 0, vat: 0, withVat: 0 })
    expect(sheetRoundingGap({ rounding_gap: null })).toEqual({ net: 0, vat: 0, withVat: 0 })
  })

  it('không để giá trị rác thành NaN trên màn hình', () => {
    const gap = sheetRoundingGap({ rounding_gap: { net: 'abc', vat: undefined, with_vat: null } })

    expect(gap).toEqual({ net: 0, vat: 0, withVat: 0 })
  })
})

describe('hasRoundingGap', () => {
  it('phiếu khớp cả ba trục thì không có gì để hiện', () => {
    expect(hasRoundingGap({ net: 0, vat: 0, withVat: 0 })).toBe(false)
  })

  /**
   * Ca nghiệm thu chính. `TVVL-IRS0019`: dòng "Tổng (gồm VAT)" khớp hoàn hảo trong khi hai dòng
   * ngay trên nó đều lệch 1đ ngược chiều nhau. Chỉ soi `withVat` là kết luận "phiếu sạch" rồi để
   * nguyên hai dòng sai — giấu đúng cái cần hiện.
   */
  it('BÁO CÓ LỆCH khi gồm-VAT khớp mà net và VAT ngược dấu nhau', () => {
    expect(hasRoundingGap({ net: 1, vat: -1, withVat: 0 })).toBe(true)
  })

  it('báo có lệch khi chỉ một trục lệch', () => {
    expect(hasRoundingGap({ net: 0, vat: 5, withVat: 5 })).toBe(true)
    expect(hasRoundingGap({ net: -1, vat: 0, withVat: -1 })).toBe(true)
  })
})
