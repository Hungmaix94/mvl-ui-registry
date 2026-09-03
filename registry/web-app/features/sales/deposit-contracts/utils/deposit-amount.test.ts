import { describe, expect, it } from 'vitest'

import { getTotalDepositAmount } from './deposit-amount'

/**
 * Con số lấy từ dữ liệu thật trên dev (đo 24/08/2026): `DC-2026-001812` có
 * `registration_amount = "120000000"`, `supplementary_amount = "10000000"`, và từ 25/08 BE trả
 * thẳng `total_deposit_amount = "130000000"`.
 *
 * Bộ test này đổi hình sau khi BE ship field (backend PR #3370): trước đây nó ghim **phép
 * cộng** ở FE, giờ ghim việc FE **không còn cộng nữa**. Ca quan trọng nhất là ca cuối — nếu ai
 * đó thêm lại nhánh "thiếu field thì tự cộng", nó đỏ.
 */
describe('getTotalDepositAmount (ClickUp 86eyqjbtb)', () => {
  it('đọc thẳng total_deposit_amount do BE trả', () => {
    expect(
      getTotalDepositAmount({
        total_deposit_amount: '130000000',
      })
    ).toBe(130_000_000)
  })

  it('hợp đồng không có tiền bổ sung thì BE trả đúng tiền đăng ký', () => {
    // Đối chứng cho ca trên: nếu hàm lỡ nhân/cộng thêm thứ gì thì vế này lệch ngay.
    expect(getTotalDepositAmount({ total_deposit_amount: '50000000' })).toBe(50_000_000)
  })

  it('trả undefined khi chưa biết tổng cọc, KHÔNG trả 0', () => {
    // Khác biệt này quan trọng: caller dùng `maxRefundAmount || Infinity`, nên trả 0 sẽ bị hiểu
    // là "không có trần" một cách tình cờ, còn `undefined` mới là ý định thật. `null`/`undefined`
    // ở đây là hợp đồng CHƯA tải xong — `useDepositContract` trả như vậy trong lúc query chạy.
    expect(getTotalDepositAmount(undefined)).toBeUndefined()
    expect(getTotalDepositAmount(null)).toBeUndefined()
    expect(getTotalDepositAmount({ total_deposit_amount: '' })).toBeUndefined()
  })

  // Lưới an toàn chống trôi schema, không phải ca đã quan sát được: BE khai
  // `DecimalField(max_digits=20, decimal_places=0)` nên không trả chuỗi phi số. Giữ vì `NaN`
  // lọt xuống zod sẽ chặn người dùng mà không kèm thông báo nào.
  it('trả undefined thay vì NaN khi dữ liệu không phải số', () => {
    expect(getTotalDepositAmount({ total_deposit_amount: 'không-phải-số' })).toBeUndefined()
  })

  it('KHÔNG tự cộng lại từ registration_amount + supplementary_amount', () => {
    // Đây là ca giữ cho công thức ở đúng một chỗ. Một bản "phòng xa" tự cộng khi thiếu
    // `total_deposit_amount` sẽ trả 130.000.000 ở đây và làm test đỏ — đúng như mong muốn:
    // công thức đã chuyển hẳn về BE, FE chỉ đọc. Thiếu field nghĩa là CHƯA BIẾT.
    const nhuLaSerializerLong = {
      registration_amount: '120000000',
      supplementary_amount: '10000000',
    } as unknown as Parameters<typeof getTotalDepositAmount>[0]

    expect(getTotalDepositAmount(nhuLaSerializerLong)).toBeUndefined()
  })
})
