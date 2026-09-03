import { describe, expect, it } from 'vitest'

import { CTVReconciliationPeriod_type } from '@/api/schema'
import { INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import type { CTVReconciliationSheet } from '@/features/sales/ctv-reconciliations/services/ctv-reconciliation-sheet-service'
import { createEmptyCTVReconciliationSheetItem } from '@/features/sales/ctv-reconciliations/schemas/ctv-reconciliation-sheet-schema'
import {
  buildCTVServerComputedByProductId,
  mapCTVSheetToFormValues,
  toPatchCTVReconciliationSheetPayload,
} from '@/features/sales/ctv-reconciliations/adapters/ctv-reconciliation-adapter'

// Golden-master for the CTV wire contract. CTV theo model THUẾ TNCN (PIT) — KHÔNG VAT: BE trả
// total_amount (trước thuế) + pit_rate + pit_amount + total_amount_after_pit. Field renames
// (pct_commission↔pct_agency_fee, shared_bonus_amount→period_amount) sống ở đây.

describe('mapCTVSheetToFormValues', () => {
  it('maps a rich CTV reconciliation row to the canonical line model (renames + inherited fields)', () => {
    const sheet = {
      reconciliation_date: '2026-06-15',
      note: 'n',
      reconciliations: [
        {
          product_inventory: 4,
          product_inventory_detail: { id: 4, unit_number: 'B-3', code: 'B3' },
          deal: 1566,
          period_type: CTVReconciliationPeriod_type.normal_payment,
          progress_from_pct: '0.00',
          progress_to_pct: '50.00',
          fee_calculation_price: '500000000',
          pct_commission: '2',
          amt_agency_fee: null,
          amt_payment_this_period: '5000000',
          shared_bonus_amount: '1000000',
          fee_deduction: '0',
          extra_bonus_pct: null,
          extra_bonus_amount: null,
          note: 'row note',
        },
      ],
    } as unknown as CTVReconciliationSheet

    const form = mapCTVSheetToFormValues(sheet)
    expect(form.reconciliation_date).toBe('15/06/2026')
    expect(form.items).toHaveLength(1)

    const item = form.items[0]
    expect(item.product_inventory_id).toBe(4)
    expect(item.period_type).toBe(CTVReconciliationPeriod_type.normal_payment)
    expect(item.progress_from_pct).toBe(0)
    expect(item.progress_to_pct).toBe(50)
    // pct_commission → pct_agency_fee
    expect(item.pct_agency_fee).toBe(2)
    // shared_bonus_amount → both benchmark + period_amount (vào net/footer kỳ)
    expect(item.shared_bonus_amount).toBe(1_000_000)
    expect(item.shared_bonus_period_amount).toBe(1_000_000)
    // CTV has no explicit vat_rate / A' — defaulted / null
    expect(item.vat_rate).toBe(INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE)
    expect(item.commission_fee_calculation_price).toBeNull()
    expect(item.note).toBe('row note')
  })

  it('returns a single empty row when the sheet has no reconciliations', () => {
    const sheet = {
      reconciliation_date: '2026-06-15',
      reconciliations: [],
    } as unknown as CTVReconciliationSheet

    const form = mapCTVSheetToFormValues(sheet)
    expect(form.items).toHaveLength(1)
  })
})

describe('buildCTVServerComputedByProductId (BE-truth totals per căn — PIT, không VAT)', () => {
  it('maps commission_before_vat → period_commission + PIT fields, keys by product_inventory', () => {
    const sheet = {
      reconciliations: [
        {
          product_inventory: 2322,
          commission_before_vat: '0',
          sub_total_commission: '427500',
          total_amount: '152500',
          pit_rate: '10.00',
          pit_amount: '15250',
          total_amount_after_pit: '137250',
          retroactive_adjustment_amount: '0',
        },
      ],
    } as unknown as CTVReconciliationSheet

    const map = buildCTVServerComputedByProductId(sheet)
    const sc = map.get(2322)
    expect(sc).toBeDefined()
    expect(sc?.period_commission).toBe('0') // ← commission_before_vat
    expect(sc?.sub_total_commission).toBe('427500')
    expect(sc?.total_amount).toBe('152500') // trước thuế (BE)
    expect(sc?.pit_amount).toBe('15250') // thuế TNCN (BE)
    expect(sc?.total_amount_after_pit).toBe('137250') // thực nhận sau thuế (BE)
    expect(sc?.pit_rate).toBe('10.00')
    expect(sc?.retroactive_adjustment_amount).toBe('0')
    // PIT model — KHÔNG còn map VAT.
    expect(sc?.vat_amount).toBeUndefined()
    expect(sc?.total_amount_with_vat).toBeUndefined()
  })

  it('falls back to product_inventory_detail.id and skips rows without a căn', () => {
    const sheet = {
      reconciliations: [
        { product_inventory_detail: { id: 5 }, total_amount_after_pit: '100' },
        { total_amount_after_pit: '999' },
      ],
    } as unknown as CTVReconciliationSheet

    const map = buildCTVServerComputedByProductId(sheet)
    expect(map.get(5)?.total_amount_after_pit).toBe('100')
    expect(map.size).toBe(1)
  })
})

describe('toPatchCTVReconciliationSheetPayload (wire contract subset)', () => {
  it('serializes only the CTV-editable subset and KHÔNG gửi kèm `status`', () => {
    const payload = toPatchCTVReconciliationSheetPayload({
      reconciliation_date: '15/06/2026',
      note: 'ghi chú',
      items: [
        {
          ...createEmptyCTVReconciliationSheetItem(),
          product_inventory_id: 1,
          fee_calculation_price: 1_000_000_000,
          pct_agency_fee: 1.5,
        },
      ],
    })

    expect(payload.reconciliation_date).toBe('2026-06-15')
    expect(payload.note).toBe('ghi chú')
    expect(payload.items?.[0]?.pct_commission).toBe('1.5')
    // `status` KHÔNG còn nằm trong body PATCH — BE chỉ đổi trạng thái qua endpoint transition riêng.
    // Gửi kèm sẽ bị BE từ chối là field lạ, nên đây là chốt chặn hồi quy cho hợp đồng wire.
    expect('status' in payload).toBe(false)
  })
})
