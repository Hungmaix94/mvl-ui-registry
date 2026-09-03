import { describe, expect, it } from 'vitest'

import { deductionMagnitudesFromFee } from './deduction-follow'
import { redistributePercentages } from './split-helpers'

describe('deductionMagnitudesFromFee', () => {
  it('dồn hết giảm trừ cho người nhận hộ 100% phí', () => {
    // Ca UAT ws178: toàn bộ phí sang CTV, người đứng tên không nhận đồng nào.
    expect(deductionMagnitudesFromFee([0, 54_724_146], 859_951)).toEqual([0, 859_951])
  })

  it('chia theo tỉ lệ phí và cộng đúng bằng số phải gánh', () => {
    const out = deductionMagnitudesFromFee([5_000_000, 5_000_000], 1_320_001)!
    expect(out.reduce((s, a) => s + a, 0)).toBe(1_320_001)
    expect(out).toEqual([660_000, 660_001])
  })

  it('nhận số âm của bucket giảm trừ cũng ra cùng độ lớn', () => {
    expect(deductionMagnitudesFromFee([3_000_000, 1_000_000], -800_000)).toEqual([600_000, 200_000])
  })

  it('không ném phần dư làm tròn cho dòng không gánh phí', () => {
    // 100 chia theo [1, 2, 0]: dòng cuối gánh 0đ phí nên không được dính 1đ giảm trừ.
    const out = deductionMagnitudesFromFee([1, 2, 0], 100)!
    expect(out[2]).toBe(0)
    expect(out.reduce((s, a) => s + a, 0)).toBe(100)
  })

  it('trả null khi không có phí nào để bám vào', () => {
    expect(deductionMagnitudesFromFee([0, 0], 500_000)).toBeNull()
    expect(deductionMagnitudesFromFee([], 500_000)).toBeNull()
  })
})

describe('redistributePercentages với tiền âm', () => {
  it('tính % theo tỉ lệ thay vì chia đều', () => {
    // Trước fix: tổng âm rơi vào nhánh `totalAmount > 0` sai → ra 50/50 dù một dòng gánh hết.
    const rows = [
      { amount: '-859951', pct_of_parent: '0.00' },
      { amount: '0', pct_of_parent: '0.00' },
    ]

    expect(redistributePercentages(rows).map((r) => r.pct_of_parent)).toEqual(['100.00', '0.00'])
  })

  it('giữ nguyên cách tính cho tiền dương', () => {
    const rows = [
      { amount: '5000000', pct_of_parent: '0.00' },
      { amount: '5000000', pct_of_parent: '0.00' },
    ]

    expect(redistributePercentages(rows).map((r) => r.pct_of_parent)).toEqual(['50.00', '50.00'])
  })
})
