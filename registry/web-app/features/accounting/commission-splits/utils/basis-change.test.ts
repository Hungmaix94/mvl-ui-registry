import { describe, expect, it } from 'vitest'

import { resolveBasisChange } from './basis-change'

/**
 * CR STT34 (`86eyf8grj`) — hàm dựng cảnh báo "giá tính phí đổi so với kỳ liền kề trước".
 *
 * Vì sao đáng test riêng: cảnh báo sai ở màn chia hoa hồng không phải lỗi hiển thị vặt — kế toán
 * thấy nó sẽ dừng lại đối chiếu tay cả căn, hoặc tệ hơn là bỏ qua vì "màn nào cũng sáng". Ba cái
 * bẫy đều nằm ở ép kiểu: `Number(null)` ra **0** (kỳ đầu tiên hoá ra "giảm cả tỷ"),
 * `Number(undefined)` ra **NaN** mà `NaN !== 0` là **true** (payload cũ → mọi dòng đều cảnh báo),
 * và chuỗi rác cũng ra NaN.
 */
describe('resolveBasisChange', () => {
  it('kỳ đầu tiên (BE trả null) → không cảnh báo', () => {
    expect(resolveBasisChange({ previous_basis: null, basis_delta: null })).toBeNull()
  })

  it('giá không đổi (delta = 0) → không cảnh báo', () => {
    expect(resolveBasisChange({ previous_basis: '1000000000', basis_delta: '0' })).toBeNull()
  })

  it('giá tăng → hướng tăng kèm đúng số chênh lệch và giá hai kỳ', () => {
    expect(resolveBasisChange({ previous_basis: '1000000000', basis_delta: '200000000' })).toEqual({
      direction: 'increase',
      amount: 200000000,
      previous: 1000000000,
      current: 1200000000,
    })
  })

  it('giá giảm → hướng giảm, `amount` là trị tuyệt đối để hiển thị', () => {
    expect(resolveBasisChange({ previous_basis: '1000000000', basis_delta: '-200000000' })).toEqual(
      {
        direction: 'decrease',
        amount: 200000000,
        previous: 1000000000,
        current: 800000000,
      }
    )
  })

  it('payload cũ thiếu hẳn hai field → không cảnh báo (chốt NaN)', () => {
    // Đây là dạng payload chạy được trước khi BE deploy: thiếu field, KHÔNG phải null.
    expect(resolveBasisChange({} as Parameters<typeof resolveBasisChange>[0])).toBeNull()
  })

  it('chuỗi không phải số → không cảnh báo', () => {
    expect(resolveBasisChange({ previous_basis: 'n/a', basis_delta: '200000000' })).toBeNull()
    expect(resolveBasisChange({ previous_basis: '1000000000', basis_delta: 'n/a' })).toBeNull()
  })

  it('kỳ trước giá 0 vẫn là một phép so hợp lệ, không bị nhầm với null', () => {
    expect(resolveBasisChange({ previous_basis: '0', basis_delta: '1000000000' })).toEqual({
      direction: 'increase',
      amount: 1000000000,
      previous: 0,
      current: 1000000000,
    })
  })
})
