import { describe, expect, it } from 'vitest'

import {
  CALC_DASH,
  formatCalcPercent,
  isNonZeroDecimal,
  subtractDecimals,
  sumDecimals,
} from './fee-support-calc-format'

describe('formatCalcPercent', () => {
  it('quy mọi giá trị rỗng về CÙNG một ký tự với cột tiền', () => {
    // formatPercent thuần trả '-', formatMoney trả '—' — lệch ký tự thì người
    // duyệt tưởng là hai loại "rỗng" khác nhau.
    expect(formatCalcPercent(null)).toBe(CALC_DASH)
    expect(formatCalcPercent(undefined)).toBe(CALC_DASH)
    expect(formatCalcPercent('')).toBe(CALC_DASH)
    expect(formatCalcPercent('không-phải-số')).toBe(CALC_DASH)
  })

  it('0 là số thật, không phải rỗng', () => {
    expect(formatCalcPercent('0')).not.toBe(CALC_DASH)
  })
})

describe('isNonZeroDecimal', () => {
  it('so sánh bằng SỐ chứ không dùng truthiness của chuỗi', () => {
    // '0' là chuỗi truthy — guard sai sẽ hiện "(0)" vô nghĩa trong cảnh báo.
    expect(isNonZeroDecimal('0')).toBe(false)
    expect(isNonZeroDecimal('0.00')).toBe(false)
    expect(isNonZeroDecimal(null)).toBe(false)
    expect(isNonZeroDecimal(undefined)).toBe(false)
    expect(isNonZeroDecimal('-5000000')).toBe(true)
  })
})

/**
 * Chỉ phục vụ dòng "Thưởng MV nhận" (FSD 18.8 §3.4.1 — BE giữ tách 2 kênh, FE gộp
 * lúc hiển thị). Test khoá đúng chỗ dễ sai: `null` ≠ 0 và dư số nhị phân của float.
 */
describe('sumDecimals', () => {
  it('cộng hai chuỗi decimal, giữ số chữ số thập phân lớn nhất của hai vế', () => {
    expect(sumDecimals('25000000', '40000000')).toBe('65000000')
    expect(sumDecimals('0.25', '0.40')).toBe('0.65')
    // 0.1 + 0.2 trong float ra 0.30000000000000004 — phải cắt về đúng 1 chữ số.
    expect(sumDecimals('0.1', '0.2')).toBe('0.3')
    expect(sumDecimals('1', '0.005')).toBe('1.005')
  })

  it('cả hai vế rỗng → null để ô hiện "—", KHÔNG phải 0đ', () => {
    expect(sumDecimals(null, null)).toBeNull()
    expect(sumDecimals(undefined, '')).toBeNull()
  })

  it('chỉ một vế có số → lấy đúng số đó, không coi vế kia là 0 rồi cộng', () => {
    expect(sumDecimals('25000000', null)).toBe('25000000')
    expect(sumDecimals(null, '0.40')).toBe('0.40')
  })

  it('0 đồng vẫn là số thật, không bị nuốt thành null', () => {
    expect(sumDecimals('0', null)).toBe('0')
    expect(sumDecimals('0', '0')).toBe('0')
  })

  it('giá trị không parse được coi như rỗng thay vì NaN', () => {
    expect(sumDecimals('không-phải-số', '1000')).toBe('1000')
    expect(sumDecimals('không-phải-số', null)).toBeNull()
  })
})

/**
 * Chỉ phục vụ dòng "Phí xin thêm" (CR54 `86eyqwp4v` — `support − sale_regulated`).
 * Khác `sumDecimals` ở chỗ null: phép trừ đòi ĐỦ CẢ HAI VẾ mới có nghĩa.
 */
describe('subtractDecimals', () => {
  it('trừ hai chuỗi decimal, giữ số chữ số thập phân lớn nhất của hai vế', () => {
    expect(subtractDecimals('280000000', '266000000')).toBe('14000000')
    expect(subtractDecimals('2.80', '2.66')).toBe('0.14')
    // 0.3 - 0.1 trong float ra 0.19999999999999998 — phải cắt về đúng 1 chữ số.
    expect(subtractDecimals('0.3', '0.1')).toBe('0.2')
    expect(subtractDecimals('1', '0.005')).toBe('0.995')
  })

  /**
   * Số ÂM là dữ kiện nghiệp vụ, không phải lỗi: FSD 18.8 §3.4.1 chốt `support` đã là
   * khoản xin THÊM nên phiếu xin ít hơn mức quy định sẽ ra âm (3/6 phiếu trên dev
   * 26/08/2026, vd FSR-2026-000049). Ai kẹp `Math.max(0, …)` vào đây sẽ làm đỏ test.
   */
  it('KHÔNG kẹp sàn 0 — kết quả âm phải giữ nguyên dấu', () => {
    expect(subtractDecimals('147750000', '197000000')).toBe('-49250000')
    expect(subtractDecimals('1.50', '2.00')).toBe('-0.50')
  })

  it('thiếu BẤT KỲ vế nào → null để ô hiện "—", không coi vế thiếu là 0', () => {
    // Phiếu chỉ xin thưởng (support = null): coi là 0 rồi trừ sẽ ra "−197tr" như
    // thể sale đang trả lại tiền cho công ty.
    expect(subtractDecimals(null, '197000000')).toBeNull()
    expect(subtractDecimals('147750000', null)).toBeNull()
    expect(subtractDecimals(null, null)).toBeNull()
    expect(subtractDecimals(undefined, '')).toBeNull()
  })

  it('0 đồng vẫn là số thật ở cả hai vế, không bị nuốt thành null', () => {
    expect(subtractDecimals('0', '0')).toBe('0')
    expect(subtractDecimals('100000000', '0')).toBe('100000000')
  })

  it('giá trị không parse được coi như rỗng → null', () => {
    expect(subtractDecimals('không-phải-số', '1000')).toBeNull()
    expect(subtractDecimals('1000', 'không-phải-số')).toBeNull()
  })
})
