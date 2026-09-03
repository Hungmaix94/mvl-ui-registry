import { describe, expect, it } from 'vitest'

import { createEmptyInvestorReconciliationSheetItem } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import {
  toLineCreatePayload,
  toLinePatchPayload,
} from '@/features/sales/investor-reconciliations/adapters/investor-reconciliation-line-adapter'

describe('toLineCreatePayload', () => {
  it('serializes a canonical form item to the line create wire shape', () => {
    const item = {
      ...createEmptyInvestorReconciliationSheetItem(),
      product_inventory_id: 42,
      fee_calculation_price: 2_000_000_000,
      pct_agency_fee: 3,
      pct_period_commission: 20,
      shared_bonus_amount: 5_000_000,
    }
    const payload = toLineCreatePayload(item)
    expect(payload.product_inventory_id).toBe(42)
    expect(payload.fee_calculation_price).toBe('2000000000')
    expect(payload.pct_agency_fee).toBe('3')
    expect(payload.pct_period_commission).toBe('20')
    expect(payload.shared_bonus_amount).toBe('5000000')
    expect(payload.amt_agency_fee).toBeNull()
    expect('progress_from_pct' in payload).toBe(false)
    expect('progress_to_pct' in payload).toBe(false)
    expect(payload.commission_fee_calculation_price).toBeNull()
  })

  it('serializes the full shared-bonus 4-field set (amount/pct/period/to_sale_pct)', () => {
    const item = {
      ...createEmptyInvestorReconciliationSheetItem(),
      product_inventory_id: 7,
      shared_bonus_amount: 50_000_000,
      shared_bonus_pct: null,
      shared_bonus_period_amount: 30_000_000,
      shared_bonus_to_sale_pct: 50,
    }
    const payload = toLineCreatePayload(item)
    expect(payload.shared_bonus_amount).toBe('50000000') // tổng (benchmark)
    expect(payload.shared_bonus_pct).toBeNull()
    expect(payload.shared_bonus_period_amount).toBe('30000000') // ghi nhận kỳ
    expect(payload.shared_bonus_to_sale_pct).toBe('50') // núm % chia
  })
})

describe('toLinePatchPayload', () => {
  it('only includes fields that are present (sparse patch)', () => {
    const payload = toLinePatchPayload({ pct_period_commission: 15 })
    expect(payload).toEqual({ pct_period_commission: '15' })
  })

  it('serializes nullable money explicitly when present', () => {
    const payload = toLinePatchPayload({ shared_bonus_amount: 0, amt_agency_fee: null })
    expect(payload.shared_bonus_amount).toBe('0')
    expect(payload.amt_agency_fee).toBeNull()
  })

  it('returns an empty object for an empty patch', () => {
    expect(toLinePatchPayload({})).toEqual({})
  })
})

describe('line payloads — BE-driven (no retroactive_adjustment_amount)', () => {
  it('toLineCreatePayload KHÔNG gửi retroactive_adjustment_amount (BE tự tính)', () => {
    const item = { ...createEmptyInvestorReconciliationSheetItem(), product_inventory_id: 7 }
    const payload = toLineCreatePayload(item)
    expect('retroactive_adjustment_amount' in payload).toBe(false)
  })

  it('toLinePatchPayload KHÔNG gửi retroactive_adjustment_amount kể cả khi item có giá trị', () => {
    const item = {
      ...createEmptyInvestorReconciliationSheetItem(),
      retroactive_adjustment_amount: 5_000_000,
    }
    const payload = toLinePatchPayload(item)
    expect('retroactive_adjustment_amount' in payload).toBe(false)
  })

  it('toLineCreatePayload KHÔNG gửi progress_* (BE tính readonly)', () => {
    const item = {
      ...createEmptyInvestorReconciliationSheetItem(),
      product_inventory_id: 7,
      progress_from_pct: 0,
      progress_to_pct: 50,
    }
    const payload = toLineCreatePayload(item)
    expect('progress_from_pct' in payload).toBe(false)
    expect('progress_to_pct' in payload).toBe(false)
  })

  it('toLinePatchPayload KHÔNG gửi progress_* kể cả khi item có giá trị', () => {
    const payload = toLinePatchPayload({ progress_from_pct: 0, progress_to_pct: 50 })
    expect('progress_from_pct' in payload).toBe(false)
    expect('progress_to_pct' in payload).toBe(false)
  })

  it('toLineCreatePayload và toLinePatchPayload KHÔNG gửi fee_calculation_price khi nó là null', () => {
    const item = {
      ...createEmptyInvestorReconciliationSheetItem(),
      product_inventory_id: 7,
      fee_calculation_price: null,
    }
    const createPayload = toLineCreatePayload(item)
    expect('fee_calculation_price' in createPayload).toBe(false)

    const patchPayload = toLinePatchPayload({ fee_calculation_price: null })
    expect('fee_calculation_price' in patchPayload).toBe(false)
  })
})
