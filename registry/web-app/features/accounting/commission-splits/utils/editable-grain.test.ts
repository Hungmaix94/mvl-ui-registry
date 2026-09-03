import { describe, expect, it } from 'vitest'

import { buildGroups } from './build-groups'
import {
  editableAmountOf,
  feeAnchorAmounts,
  isBucketFullyLocked,
  isBucketPartiallyLocked,
  scaleAmountsToEditable,
} from './editable-grain'

/**
 * Kỳ có đợt đã chi (worksheet 176 trên dev): bảng chia hiển thị tiền CẢ kỳ, còn BE chỉ ghi
 * lên đợt chưa khoá. Trước khi có `scaleAmountsToEditable`, gửi thẳng số trên màn hình là
 * 400 "Sum of split amounts (0) must equal ... (509423)" — và không có % nào cứu được, vì %
 * chỉ nhân lên cái gốc đang hiển thị.
 */

const isMgmt = () => false

const position = (over: Partial<Parameters<typeof buildGroups>[0][number]> = {}) => ({
  commission_share_id: 1,
  payable_id: null,
  pct_type: 'pct_f2_commission',
  recipient_type: 'exchange' as const,
  recipient_id: 1896,
  recipients: [
    { exchange_id: '1896', amount: '5294520', pct_of_parent: '40.00' },
    { collaborator_id: '152', amount: '7941780', pct_of_parent: '60.00' },
  ],
  ...over,
})

describe('scaleAmountsToEditable', () => {
  it('giữ nguyên khi kỳ không có đợt nào bị khoá', () => {
    expect(scaleAmountsToEditable([5_294_520, 7_941_780], 13_236_300)).toEqual([
      5_294_520, 7_941_780,
    ])
  })

  it('giữ tỉ lệ 40/60 khi đổi gốc về phần còn mở', () => {
    expect(scaleAmountsToEditable([5_294_520, 7_941_780], 1_000_000)).toEqual([400_000, 600_000])
  })

  it('dòng cuối ôm phần lẻ để tổng khớp tuyệt đối', () => {
    const scaled = scaleAmountsToEditable([1, 1, 1], 100)
    expect(scaled.reduce((acc: number, a: number) => acc + a, 0)).toBe(100)
    expect(scaled).toEqual([33, 33, 34])
  })

  it('xô đã chi hết ở đợt trước quy về 0, không còn 400', () => {
    expect(scaleAmountsToEditable([5_294_520, 7_941_780], 0)).toEqual([0, 0])
  })

  it('xô giảm trừ (tiền âm) giữ đúng dấu và tỉ lệ', () => {
    expect(scaleAmountsToEditable([-70_293, -105_440], -175_733)).toEqual([-70_293, -105_440])
    expect(scaleAmountsToEditable([-40, -60], -50)).toEqual([-20, -30])
  })

  it('màn hình 0đ mà đợt mở vẫn còn tiền thì chia đều, không gửi tổng sai', () => {
    const scaled = scaleAmountsToEditable([0, 0], 509_423)
    expect(scaled.reduce((acc: number, a: number) => acc + a, 0)).toBe(509_423)
  })
})

describe('editableAmountOf', () => {
  it('payload BE cũ chưa có cột thì coi cả dòng còn sửa được', () => {
    expect(editableAmountOf(position())).toBe(13_236_300)
  })

  it('đọc 0 là "không còn đồng nào", khác hẳn với thiếu cột', () => {
    expect(editableAmountOf(position({ editable_amount: '0' }))).toBe(0)
  })
})

describe('buildGroups', () => {
  it('gửi lên phần còn mở chứ không phải số đang hiển thị', () => {
    const groups = buildGroups([position({ editable_amount: '1000000' })], isMgmt)
    const amounts = groups![0].splits.map((s) => Number(s.amount))
    expect(amounts).toEqual([400_000, 600_000])
    expect(amounts.reduce((acc: number, a: number) => acc + a, 0)).toBe(1_000_000)
  })

  it('vẫn ghi % theo tỉ lệ kế toán chọn sau khi đổi gốc', () => {
    const groups = buildGroups([position({ editable_amount: '1000000' })], isMgmt)
    expect(groups![0].splits.map((s) => s.pct_of_parent)).toEqual(['40.00', '60.00'])
  })

  it('kỳ bình thường (không có đợt khoá) giữ payload y như cũ', () => {
    const groups = buildGroups([position({ editable_amount: '13236300' })], isMgmt)
    expect(groups![0].splits.map((s) => Number(s.amount))).toEqual([5_294_520, 7_941_780])
  })

  it('xô đã chi xong gửi tổng 0 — BE nhận, không chặn cả lượt lưu', () => {
    const groups = buildGroups(
      [position({ editable_amount: '0', locked_amount: '13236300' })],
      isMgmt
    )
    expect(groups![0].splits.map((s) => Number(s.amount))).toEqual([0, 0])
  })
})

/**
 * Xô đã chi hết + giảm trừ đi theo phí — bug 07/08 trên ws176: kế toán chia 50% cho CTV,
 * lưu xong CTV nhận 0đ phí (xô phí đã PAID hết ở đợt trước) nhưng vẫn gánh −87.867đ giảm
 * trừ, vì giảm trừ neo vào SỐ HIỂN THỊ (13.236.300 chia 50/50) còn phí neo vào phần ghi
 * được (0đ). Hai gốc khác nhau trên cùng một dòng.
 */
describe('isBucketFullyLocked / isBucketPartiallyLocked', () => {
  const bucket = (locked: string, editable: string) => ({
    locked_amount: locked,
    editable_amount: editable,
    recipients: [{ amount: '0' }],
  })

  it('xô phí F2 của ws176: đã chốt 13.236.300, còn chia được 0 → đóng băng', () => {
    expect(isBucketFullyLocked(bucket('13236300', '0'))).toBe(true)
    expect(isBucketPartiallyLocked(bucket('13236300', '0'))).toBe(false)
  })

  it('kỳ bình thường (không có đợt khoá) không bao giờ đóng băng', () => {
    expect(isBucketFullyLocked(bucket('0', '509423'))).toBe(false)
    expect(isBucketPartiallyLocked(bucket('0', '509423'))).toBe(false)
  })

  it('chốt một phần thì vẫn sửa được', () => {
    expect(isBucketFullyLocked(bucket('100', '200'))).toBe(false)
    expect(isBucketPartiallyLocked(bucket('100', '200'))).toBe(true)
  })
})

describe('feeAnchorAmounts', () => {
  const exch = { exchange_id: '1896', amount: '5294520' }
  const ctv = { collaborator_id: '152', amount: '7941780' }

  it('xô phí còn mở: neo vào phần ghi được, không vào số hiển thị', () => {
    const pos = { locked_amount: '0', editable_amount: '1000000', recipients: [exch, ctv] }
    expect(feeAnchorAmounts(pos, [exch, ctv])).toEqual([400_000, 600_000])
  })

  it('xô phí đã chi hết: neo vào NGƯỜI ĐÃ NHẬN phần đã chi', () => {
    const pos = { locked_amount: '13236300', editable_amount: '0', recipients: [exch, ctv] }
    const locked = [{ exchange_id: 1896, amount: '13236300' }]
    // CTV không có trong phần đã chi -> 0 -> không gánh giảm trừ. Đúng ws176.
    expect(feeAnchorAmounts(pos, [exch, ctv], locked)).toEqual([13_236_300, 0])
  })

  it('xô phí đã chi hết mà BE chưa trả locked_recipients: không bịa tỉ lệ', () => {
    const pos = { locked_amount: '13236300', editable_amount: '0', recipients: [exch, ctv] }
    expect(feeAnchorAmounts(pos, [exch, ctv], [])).toEqual([0, 0])
  })

  it('phần đã chi chia cho nhiều người thì giảm trừ theo đúng thế đó', () => {
    const pos = { locked_amount: '1000', editable_amount: '0', recipients: [exch, ctv] }
    const locked = [
      { exchange_id: 1896, amount: '400' },
      { collaborator_id: 152, amount: '600' },
    ]
    expect(feeAnchorAmounts(pos, [exch, ctv], locked)).toEqual([400, 600])
  })
})
