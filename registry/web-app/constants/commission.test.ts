import { describe, expect, it } from 'vitest'

import { HIDDEN_COMMISSION_FIELD_KEYS, isHiddenCommissionField } from './commission'

describe('isHiddenCommissionField', () => {
  it('ẩn field mv_bonus_to_f2 (pct + amt) — "Thưởng cho sàn LK từ MV"', () => {
    expect(isHiddenCommissionField('pct_mv_bonus_to_f2')).toBe(true)
    expect(isHiddenCommissionField('amt_mv_bonus_to_f2')).toBe(true)
  })

  it('KHÔNG ẩn các field commission khác', () => {
    expect(isHiddenCommissionField('pct_f2_commission')).toBe(false)
    expect(isHiddenCommissionField('pct_mv_bonus_to_sale')).toBe(false)
    expect(isHiddenCommissionField('pct_agency_fee')).toBe(false)
  })

  it('an toàn với null / undefined / chuỗi rỗng', () => {
    expect(isHiddenCommissionField(null)).toBe(false)
    expect(isHiddenCommissionField(undefined)).toBe(false)
    expect(isHiddenCommissionField('')).toBe(false)
  })

  it('chỉ chứa đúng 2 key mv_bonus_to_f2', () => {
    expect(HIDDEN_COMMISSION_FIELD_KEYS.size).toBe(2)
  })
})
