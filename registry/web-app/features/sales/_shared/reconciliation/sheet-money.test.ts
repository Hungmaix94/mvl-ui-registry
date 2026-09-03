import { describe, expect, it } from 'vitest'

import { sheetAmountToCollect, sheetPrepaidAdvanceTotal } from './sheet-money'

/**
 * Ca thật: phiếu CSTN-IRS0024 sau khi nhập HĐ 881 (5 căn, một căn có số lẻ).
 * BE cộng chính xác rồi làm tròn một lần ⇒ 2.349.453.648.
 * Cộng từng căn đã tròn ⇒ 2.349.453.649. Lệch 1đ, hiện ngay dưới dòng "Tổng tiền (Gồm VAT)".
 */
const LINES = [
  { amount_to_collect: '504708939', shared_bonus_prepaid_amount: '0' },
  { amount_to_collect: '411186178', shared_bonus_prepaid_amount: '0' },
  { amount_to_collect: '411186178', shared_bonus_prepaid_amount: '0' },
  { amount_to_collect: '922372354', shared_bonus_prepaid_amount: '0' },
  { amount_to_collect: '100000000', shared_bonus_prepaid_amount: '0' },
]
const SUM_OF_LINES = 2_349_453_649
const SHEET_TOTAL = 2_349_453_648

describe('sheetAmountToCollect', () => {
  it('lấy số BE tính, không cộng từng căn', () => {
    const sheet = { amount_to_collect: String(SHEET_TOTAL), reconciliations: LINES }
    expect(sheetAmountToCollect(sheet)).toBe(SHEET_TOTAL)
  })

  it('khác hẳn kết quả cộng từng căn — đó là cả lý do có hàm này', () => {
    // Ghim luôn tiền đề: nếu fixture thôi lệch thì test trên không còn chứng minh gì.
    expect(LINES.reduce((s, l) => s + Number(l.amount_to_collect), 0)).toBe(SUM_OF_LINES)
    expect(SUM_OF_LINES).not.toBe(SHEET_TOTAL)
  })

  it('nhận cả số lẫn chuỗi', () => {
    expect(sheetAmountToCollect({ amount_to_collect: SHEET_TOTAL })).toBe(SHEET_TOTAL)
  })

  it('0 là giá trị hợp lệ, không rơi về nhánh cộng căn', () => {
    expect(sheetAmountToCollect({ amount_to_collect: '0', reconciliations: LINES })).toBe(0)
  })

  describe('fallback khi BE chưa deploy', () => {
    it('thiếu field thì cộng từng căn để không hiện 0đ', () => {
      expect(sheetAmountToCollect({ reconciliations: LINES })).toBe(SUM_OF_LINES)
    })

    it('null cũng coi như thiếu', () => {
      expect(sheetAmountToCollect({ amount_to_collect: null, reconciliations: LINES })).toBe(
        SUM_OF_LINES
      )
    })

    it('không có căn nào thì ra 0', () => {
      expect(sheetAmountToCollect({})).toBe(0)
      expect(sheetAmountToCollect({ reconciliations: null })).toBe(0)
    })

    it('không nổ với undefined', () => {
      expect(sheetAmountToCollect(undefined)).toBe(0)
    })
  })
})

describe('sheetPrepaidAdvanceTotal', () => {
  it('lấy số BE tính', () => {
    expect(
      sheetPrepaidAdvanceTotal({ total_prepaid_advance_amount: '30000000', reconciliations: LINES })
    ).toBe(30_000_000)
  })

  it('thiếu field thì cộng shared_bonus_prepaid_amount của từng căn', () => {
    const lines = [
      { shared_bonus_prepaid_amount: '20000000' },
      { shared_bonus_prepaid_amount: '10000000' },
    ]
    expect(sheetPrepaidAdvanceTotal({ reconciliations: lines })).toBe(30_000_000)
  })

  it('không có tạm ứng thì ra 0', () => {
    expect(sheetPrepaidAdvanceTotal({ reconciliations: LINES })).toBe(0)
  })
})
