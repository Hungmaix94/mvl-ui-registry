import { describe, expect, it } from 'vitest'

import { dialTrackLabel, readDialSideEffects } from './dial-side-effects'

/**
 * ws176: kế toán nâng "% TT F2" lên 20, chia thực nhận, rồi hạ về 10 — phí F2 về 0 đúng,
 * nhưng thưởng F2 đứng nguyên 1.018.846 (gấp đôi 509.423) vì nó chạy theo % đối chiếu chứ
 * không theo dial vừa hạ. Không có gì trên màn nói ra, nên nó đọc y hệt một cái bug.
 */
describe('readDialSideEffects', () => {
  it('đọc track bị ghi đè từ response', () => {
    const effects = readDialSideEffects({
      side_effects: [
        { track: 'bonus_f2', before: '509423', after: '1018846', reason: 'recon_catchup' },
      ],
    })
    expect(effects).toEqual([
      { track: 'bonus_f2', before: 509423, after: 1018846, reason: 'recon_catchup' },
    ])
  })

  it('bỏ dòng không đổi tiền — không có gì để báo thì đừng báo', () => {
    expect(
      readDialSideEffects({
        side_effects: [{ track: 'bonus', before: '100', after: '100', reason: 'recon_catchup' }],
      })
    ).toEqual([])
  })

  it('payload BE cũ chưa có field thì rỗng, không nổ', () => {
    expect(readDialSideEffects({})).toEqual([])
    expect(readDialSideEffects(null)).toEqual([])
    expect(readDialSideEffects({ side_effects: 'nope' })).toEqual([])
  })
})

describe('dialTrackLabel', () => {
  it('dịch mã track sang chữ kế toán đọc được', () => {
    expect(dialTrackLabel('bonus_f2')).toBe('Thưởng F2')
    expect(dialTrackLabel('f2')).toBe('Phí hoa hồng F2')
  })

  it('track lạ thì trả nguyên mã, không nuốt mất', () => {
    expect(dialTrackLabel('something_new')).toBe('something_new')
  })
})
