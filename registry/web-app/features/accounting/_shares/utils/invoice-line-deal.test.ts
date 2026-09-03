import { describe, it, expect } from 'vitest'

import { dealLabel } from './invoice-line-deal'

describe('dealLabel — ô "Giao dịch / Deal" ở bảng dòng hoá đơn', () => {
  it('in MÃ giao dịch khi BE trả về mã', () => {
    expect(dealLabel({ deal: 1566, deal_code: 'HD06-2026-001565' })).toBe('HD06-2026-001565')
  })

  it('lùi về "#<id>" khi BE chưa trả mã — link còn nhãn để bấm', () => {
    expect(dealLabel({ deal: 1566, deal_code: null })).toBe('#1566')
    expect(dealLabel({ deal: 1566 })).toBe('#1566')
  })

  // Ca này là lý do hàm không viết thành `line.deal_code ?? ...`: `??` chỉ chặn null/undefined,
  // nên chuỗi rỗng lọt qua và ô hiện trắng trơn — mất luôn nhãn của link, đúng thứ nhánh id
  // sinh ra để tránh.
  it('coi chuỗi rỗng như KHÔNG có mã, không in ra ô trống', () => {
    expect(dealLabel({ deal: 1566, deal_code: '' })).toBe('#1566')
  })

  it('trả null khi dòng không gắn giao dịch — để nơi gọi tự quyết hiện "N/A"', () => {
    expect(dealLabel({ deal: null })).toBeNull()
    expect(dealLabel({})).toBeNull()
    expect(dealLabel({ deal: null, deal_code: null })).toBeNull()
  })

  // Dòng không gắn deal nhưng BE vẫn trả mã là dữ liệu vô lý; nếu nó xảy ra thì mã vẫn là thứ
  // đáng tin hơn con số id đang thiếu, nên in mã chứ đừng nuốt mất thông tin.
  it('vẫn in mã khi có mã mà thiếu id', () => {
    expect(dealLabel({ deal: null, deal_code: 'HD06-2026-001565' })).toBe('HD06-2026-001565')
  })
})
