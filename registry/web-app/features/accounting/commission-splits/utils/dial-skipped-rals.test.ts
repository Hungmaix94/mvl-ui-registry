import { describe, expect, it } from 'vitest'

import { readDialSkippedRals } from './dial-skipped-rals'

/**
 * ClickUp 86eyjxwd3: xoay số hàng loạt ghi đè âm thầm dòng đã duyệt "Chia hoa hồng thực
 * nhận" nhưng chưa chi. Quyết định: loại các dòng này khỏi lượt tính lại và báo cho kế toán
 * biết qua `skipped_approved_not_paid_ral_ids`, tách khỏi `skipped_paid_ral_ids` đã có.
 */
describe('readDialSkippedRals', () => {
  it('đếm đủ 2 lý do bị loại', () => {
    expect(
      readDialSkippedRals({
        skipped_paid_ral_ids: [1, 2],
        skipped_approved_not_paid_ral_ids: [3, 4, 5],
      })
    ).toEqual({ paidCount: 2, approvedNotPaidCount: 3 })
  })

  it('rỗng khi không có dòng nào bị loại', () => {
    expect(
      readDialSkippedRals({ skipped_paid_ral_ids: [], skipped_approved_not_paid_ral_ids: [] })
    ).toEqual({ paidCount: 0, approvedNotPaidCount: 0 })
  })

  it('payload BE cũ chưa có field thì rỗng, không nổ', () => {
    expect(readDialSkippedRals({})).toEqual({ paidCount: 0, approvedNotPaidCount: 0 })
    expect(readDialSkippedRals(null)).toEqual({ paidCount: 0, approvedNotPaidCount: 0 })
    expect(readDialSkippedRals({ skipped_approved_not_paid_ral_ids: 'nope' })).toEqual({
      paidCount: 0,
      approvedNotPaidCount: 0,
    })
  })
})
