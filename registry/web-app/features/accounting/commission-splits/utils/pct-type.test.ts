import { describe, expect, it } from 'vitest'

import {
  isF2CommissionPctType,
  isF2SharedBonusPctType,
  isReconDrivenPctType,
  isSharedBonusPctType,
  periodPctLabelFor,
} from './pct-type'

/**
 * Nhận diện pct_type phải khớp CHÍNH XÁC. Cách cũ dùng `includes('bonus')` /
 * `includes('f2')` nên `mgmt_ceo_investor_bonus` cũng lọt vào nhánh thưởng.
 */
describe('isReconDrivenPctType', () => {
  it.each([
    'pct_mv_bonus_to_sale',
    'pct_mv_bonus_to_f2',
    'pct_fee_deduction_to_sale',
    'pct_fee_deduction_to_f2',
  ])('nhận diện %s là do đối chiếu quyết định', (pctType) => {
    expect(isReconDrivenPctType(pctType)).toBe(true)
  })

  it.each(['pct_investor_bonus_to_sale', 'pct_f2_bonus'])(
    'thưởng chia sẻ %s KHÔNG còn recon-driven — kế toán dial được, BE kẹp trần',
    (pctType) => {
      expect(isReconDrivenPctType(pctType)).toBe(false)
      expect(isSharedBonusPctType(pctType)).toBe(true)
    }
  )

  it('chỉ vế thưởng F2 mới đi theo dial bonus_f2_pct', () => {
    expect(isF2SharedBonusPctType('pct_f2_bonus')).toBe(true)
    expect(isF2SharedBonusPctType('pct_investor_bonus_to_sale')).toBe(false)
  })

  it.each(['pct_sale_commission', 'pct_f2_commission', 'mgmt_ceo_agency_fee'])(
    'không nhận nhầm %s',
    (pctType) => {
      expect(isReconDrivenPctType(pctType)).toBe(false)
    }
  )

  it('KHÔNG nhận nhầm share quản lý chỉ vì tên có chữ bonus', () => {
    expect(isReconDrivenPctType('mgmt_ceo_investor_bonus')).toBe(false)
    expect(isReconDrivenPctType('mgmt_sales_director_mv_bonus')).toBe(false)
  })

  it('rỗng / null là false', () => {
    expect(isReconDrivenPctType('')).toBe(false)
    expect(isReconDrivenPctType(null)).toBe(false)
    expect(isReconDrivenPctType(undefined)).toBe(false)
  })
})

describe('isF2CommissionPctType', () => {
  it('chỉ khớp hoa hồng F2, không khớp thưởng F2', () => {
    expect(isF2CommissionPctType('pct_f2_commission')).toBe(true)
    expect(isF2CommissionPctType('amt_f2_commission')).toBe(true)
    expect(isF2CommissionPctType('pct_f2_bonus')).toBe(false)
  })
})

describe('periodPctLabelFor', () => {
  const dials = { feePct: 40, f2Pct: 25, bonusPct: 60 }

  it('phí và quản lý theo dial phí', () => {
    expect(periodPctLabelFor('pct_sale_commission', dials)).toBe(40)
    expect(periodPctLabelFor('mgmt_ceo_agency_fee', dials)).toBe(40)
  })

  it('hoa hồng F2 theo dial F2', () => {
    expect(periodPctLabelFor('pct_f2_commission', dials)).toBe(25)
  })

  it('thưởng theo % đối chiếu, KHÔNG theo dial phí', () => {
    expect(periodPctLabelFor('pct_investor_bonus_to_sale', dials)).toBe(60)
    expect(periodPctLabelFor('pct_f2_bonus', dials)).toBe(60)
  })

  it('giảm trừ không hiện % nào — nó đi theo tiền về của từng đợt, khác nhau từng đợt', () => {
    expect(periodPctLabelFor('pct_fee_deduction_to_sale', dials)).toBeNull()
    expect(periodPctLabelFor('pct_fee_deduction_to_f2', dials)).toBeNull()
  })

  it('deal không có F2 dial thì hoa hồng F2 rơi về dial phí', () => {
    expect(periodPctLabelFor('pct_f2_commission', { ...dials, f2Pct: null })).toBe(40)
  })
})
