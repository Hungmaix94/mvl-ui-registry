import { describe, it, expect } from 'vitest'
import { computeRevenue, computeDeptCommission } from './promotion-distribution-calc'

describe('computeRevenue', () => {
  it('computes Doanh thu = Tiền hàng × Tỷ lệ doanh thu / 100 from decimal strings', () => {
    expect(
      computeRevenue({
        total_fee_calculation_price: '50000000000',
        snapshot_pct_promotion_revenue: '10',
      })
    ).toBe(5_000_000_000)
  })

  it('returns 0 when the percentage is zero', () => {
    expect(
      computeRevenue({
        total_fee_calculation_price: '50000000000',
        snapshot_pct_promotion_revenue: '0',
      })
    ).toBe(0)
  })

  it('treats null/undefined fields as 0 (no NaN)', () => {
    expect(
      computeRevenue({
        total_fee_calculation_price: null as unknown as string,
        snapshot_pct_promotion_revenue: undefined as unknown as string,
      })
    ).toBe(0)
  })
})

describe('computeDeptCommission', () => {
  it('sums direct employee lines when there are no department pools', () => {
    expect(
      computeDeptCommission({
        lines: [{ amount: '150000000' }, { amount: '30000000' }, { amount: '45000000' }] as never,
        department_allocations: [],
      })
    ).toBe(225_000_000)
  })

  it('sums department pool amounts plus direct lines, ignoring split members tied to a pool', () => {
    expect(
      computeDeptCommission({
        // a split member belongs to a pool -> excluded from the direct total
        lines: [{ amount: '6000000', department_allocation: 7 }] as never,
        department_allocations: [{ amount: '831668' }, { amount: '10000000' }] as never,
      })
    ).toBe(10_831_668)
  })

  it('returns 0 for empty or missing collections', () => {
    expect(computeDeptCommission({ lines: [], department_allocations: [] })).toBe(0)
    expect(
      computeDeptCommission({
        lines: undefined as never,
        department_allocations: undefined as never,
      })
    ).toBe(0)
  })
})
