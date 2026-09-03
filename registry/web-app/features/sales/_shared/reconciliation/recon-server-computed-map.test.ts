import { describe, expect, it } from 'vitest'

import type { components } from '@/api/schema'
import {
  toReconCheckByProductId,
  toReconServerComputedByProductId,
} from './recon-server-computed-map'

type Row = components['schemas']['InvestorReconciliation']

const baseRow = (over: Partial<Row>): Row =>
  ({
    id: 1,
    product_inventory: 10,
    total_amount: '100',
    period_commission: '120',
    sub_total_commission: '120',
    vat_amount: '10',
    total_amount_with_vat: '110',
    retroactive_adjustment_amount: '0',
    prior_received_total: '0',
    recon_check: null,
    ...over,
  }) as unknown as Row

describe('toReconServerComputedByProductId', () => {
  it('map theo product_inventory, bỏ căn không có product_inventory', () => {
    const rows = [baseRow({ product_inventory: 10 }), baseRow({ product_inventory: 0, id: 2 })]
    const map = toReconServerComputedByProductId(rows)
    expect(Object.keys(map)).toEqual(['10'])
    expect(map[10].total_amount).toBe('100')
    expect(map[10].period_commission).toBe('120')
  })
})

describe('toReconCheckByProductId', () => {
  it('chỉ lấy căn có recon_check', () => {
    const rows = [
      baseRow({ product_inventory: 10, recon_check: { fee_calculation_price: { match: true } } }),
      baseRow({ product_inventory: 11, id: 2, recon_check: null }),
    ]
    const map = toReconCheckByProductId(rows)
    expect(Object.keys(map)).toEqual(['10'])
  })
})
