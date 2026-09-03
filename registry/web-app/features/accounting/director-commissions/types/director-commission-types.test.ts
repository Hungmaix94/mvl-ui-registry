import { describe, it, expect } from 'vitest'

import { directorCommissionEditSchema } from './director-commission-types'

describe('directorCommissionEditSchema', () => {
  it('để trống pct_payout và payout_override_amount → null (dùng định mức mặc định)', () => {
    const result = directorCommissionEditSchema.parse({
      pct_payout: '',
      payout_override_amount: '',
      note: '',
    })
    expect(result.pct_payout).toBeNull()
    expect(result.payout_override_amount).toBeNull()
  })

  it('chuỗi số hợp lệ (có dấu phẩy ngăn hàng nghìn) → chuỗi số cho API', () => {
    const result = directorCommissionEditSchema.parse({
      pct_payout: '1.21',
      payout_override_amount: '1,000,000',
      note: '',
    })
    expect(result.pct_payout).toBe('1.21')
    expect(result.payout_override_amount).toBe('1000000')
  })

  // 86ey9myjk: bản cũ coi chuỗi không phải số là "để trống" một cách im lặng —
  // Lưu vẫn báo thành công dù giá trị gõ vào bị bỏ qua. Giờ phải bật lỗi validate.
  it('pct_payout không phải số → lỗi validate, không im lặng thành null', () => {
    const result = directorCommissionEditSchema.safeParse({
      pct_payout: 'abc',
      payout_override_amount: '',
      note: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'pct_payout')).toBe(true)
    }
  })

  it('payout_override_amount không phải số → lỗi validate, không im lặng thành null', () => {
    const result = directorCommissionEditSchema.safeParse({
      pct_payout: '',
      payout_override_amount: 'xyz',
      note: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'payout_override_amount')).toBe(true)
    }
  })
})
