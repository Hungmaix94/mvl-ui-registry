import { describe, expect, it } from 'vitest'
import {
  REFUND_PAYMENT_ERROR,
  RETAINED_REASON_OPTIONS,
  TRANSFER_TO_ACCOUNT_OPTIONS,
  getRefundPaymentErrorCode,
} from './refund-payment-types'

describe('getRefundPaymentErrorCode', () => {
  // FE rẽ nhánh theo mã lỗi (mở dialog đòi tiền CĐT / hỏi lại rồi gửi kèm cờ),
  // nên đọc trượt mã = mất luôn hai luồng UI đó, im lặng.
  it('đọc được mã khi lỗi bọc trong response', () => {
    const error = { response: { error: { code: 'investor_recovery_pending' } } }

    expect(getRefundPaymentErrorCode(error)).toBe(REFUND_PAYMENT_ERROR.INVESTOR_RECOVERY_PENDING)
  })

  it('đọc được mã khi lỗi phẳng', () => {
    const error = { error: { code: 'account_mismatch' } }

    expect(getRefundPaymentErrorCode(error)).toBe(REFUND_PAYMENT_ERROR.ACCOUNT_MISMATCH)
  })

  it('trả undefined khi lỗi không có mã, thay vì ném', () => {
    expect(getRefundPaymentErrorCode(new Error('network'))).toBeUndefined()
    expect(getRefundPaymentErrorCode(undefined)).toBeUndefined()
    expect(getRefundPaymentErrorCode({})).toBeUndefined()
  })
})

describe('danh mục lựa chọn', () => {
  it('ô tài khoản nhận chỉ có đúng hai lựa chọn', () => {
    // Danh sách ĐẦY ĐỦ, không phải rút gọn: BE có CheckConstraint chốt cặp này ở tầng
    // DB (14/08/2026). `custom` bị gỡ vì ba năm không có lấy một dòng, `unknown` là cờ
    // backfill mà migration cùng đợt đã dọn sạch — gửi giá trị khác lên là 400.
    expect(TRANSFER_TO_ACCOUNT_OPTIONS.map((option) => option.value)).toEqual(['mv', 'investor'])
  })

  it('lý do giữ lại khớp đủ 5 giá trị của BE', () => {
    expect(RETAINED_REASON_OPTIONS.map((option) => option.value)).toEqual([
      'penalty',
      'fee_offset',
      'customer_agreed',
      'forfeit',
      'other',
    ])
  })
})
