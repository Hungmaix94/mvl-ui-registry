import { describe, expect, it } from 'vitest'

import { CTVReconciliationPeriod_type, CTVReconciliationReconciliation_type } from '@/api/schema'
import { INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import type { F2ReconciliationSheet } from '@/features/sales/f2-reconciliations/types/f2-reconciliation'
import { createEmptyF2ReconciliationSheetItem } from '@/features/sales/f2-reconciliations/schemas/f2-reconciliation-sheet-create-schema'
import {
  buildF2ServerComputedByProductId,
  mapF2SheetToFormValues,
  toUpdateF2ReconciliationSheetPayload,
} from '@/features/sales/f2-reconciliations/adapters/f2-reconciliation-adapter'

// Golden-master for the F2 wire contract: response (rich) → canonical form model, and canonical →
// F2 update payload (subset). The field renames (pct_commission↔pct_agency_fee,
// is_commission_include_vat↔is_agency_fee_include_vat) live ONLY here.

describe('mapF2SheetToFormValues', () => {
  it('maps a rich reconciliation row to the canonical line model (renames + inherited fields)', () => {
    const sheet = {
      exchange_detail: { id: 2 },
      sales_allocation_detail: { id: 9 },
      reconciliation_date: '2026-06-15',
      note: 'n',
      reconciliations: [
        {
          product_inventory: 4,
          product_inventory_detail: { id: 4, unit_number: 'B-3', code: 'B3' },
          deal: 1566,
          period_type: CTVReconciliationPeriod_type.progress_with_adjustment,
          progress_from_pct: '0.00',
          progress_to_pct: '50.00',
          fee_calculation_price: '500000000',
          pct_commission: '2',
          amt_agency_fee: null,
          amt_payment_this_period: '5000000',
          shared_bonus_amount: '0',
          fee_deduction: '0',
          extra_bonus_pct: null,
          extra_bonus_amount: null,
          is_commission_include_vat: false,
          is_shared_bonus_include_vat: false,
          is_extra_bonus_include_vat: true,
          is_fee_deduction_include_vat: false,
          note: 'row note',
        },
      ],
    } as unknown as F2ReconciliationSheet

    const form = mapF2SheetToFormValues(sheet)
    expect(form.exchange_id).toBe(2)
    expect(form.sales_allocation_id).toBe(9)
    expect(form.reconciliation_date).toBe('15/06/2026')
    expect(form.items).toHaveLength(1)

    const item = form.items[0]
    expect(item.product_inventory_id).toBe(4)
    expect(item.period_type).toBe(CTVReconciliationPeriod_type.progress_with_adjustment)
    expect(item.progress_from_pct).toBe(0)
    expect(item.progress_to_pct).toBe(50)
    // pct_commission → pct_agency_fee
    expect(item.pct_agency_fee).toBe(2)
    // is_commission_include_vat → is_agency_fee_include_vat
    expect(item.is_agency_fee_include_vat).toBe(false)
    expect(item.is_extra_bonus_include_vat).toBe(true)
    // F2 has no explicit vat_rate / A' — defaulted / null
    expect(item.vat_rate).toBe(INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE)
    expect(item.commission_fee_calculation_price).toBeNull()
    expect(item.note).toBe('row note')
  })

  it('falls back to writable items when no reconciliations are present', () => {
    const sheet = {
      exchange_detail: { id: 2 },
      sales_allocation_detail: { id: 9 },
      reconciliation_date: '2026-06-15',
      reconciliations: [],
      items: [
        {
          product_inventory_id: 7,
          pct_commission: '1.5',
          fee_calculation_price: '1000000000',
          amt_payment_this_period: '12000000',
        },
      ],
    } as unknown as F2ReconciliationSheet

    const form = mapF2SheetToFormValues(sheet)
    expect(form.items).toHaveLength(1)
    expect(form.items[0].product_inventory_id).toBe(7)
    expect(form.items[0].pct_agency_fee).toBe(1.5)
    expect(form.items[0].fee_calculation_price).toBe(1_000_000_000)
  })

  it('returns a single empty row when the sheet has neither reconciliations nor items', () => {
    const sheet = {
      exchange_detail: { id: 2 },
      sales_allocation_detail: { id: 9 },
      reconciliation_date: '2026-06-15',
      reconciliations: [],
    } as unknown as F2ReconciliationSheet

    const form = mapF2SheetToFormValues(sheet)
    expect(form.items).toHaveLength(1)
  })
})

describe('buildF2ServerComputedByProductId (BE-truth totals per căn)', () => {
  it('maps commission_before_vat → period_commission and keys by product_inventory (real #138)', () => {
    const sheet = {
      reconciliations: [
        {
          product_inventory: 2130,
          commission_before_vat: '44966999',
          sub_total_commission: '66558708',
          total_amount: '63558708',
          vat_amount: '6355871',
          total_amount_with_vat: '69914579',
          retroactive_adjustment_amount: '0',
        },
      ],
    } as unknown as F2ReconciliationSheet

    const map = buildF2ServerComputedByProductId(sheet)
    const sc = map.get(2130)
    expect(sc).toBeDefined()
    expect(sc?.period_commission).toBe('44966999') // ← commission_before_vat
    expect(sc?.sub_total_commission).toBe('66558708')
    expect(sc?.total_amount).toBe('63558708') // NET (BE) — không phải per-field FE
    expect(sc?.total_amount_with_vat).toBe('69914579') // Phải thu gồm VAT (BE)
    expect(sc?.retroactive_adjustment_amount).toBe('0')
  })

  it('falls back to product_inventory_detail.id and skips rows without a căn', () => {
    const sheet = {
      reconciliations: [
        { product_inventory_detail: { id: 5 }, total_amount_with_vat: '100' },
        { total_amount_with_vat: '999' },
      ],
    } as unknown as F2ReconciliationSheet

    const map = buildF2ServerComputedByProductId(sheet)
    expect(map.get(5)?.total_amount_with_vat).toBe('100')
    expect(map.size).toBe(1)
  })
})

describe('toUpdateF2ReconciliationSheetPayload (wire contract subset)', () => {
  it('serializes only the F2-editable subset, renaming pct_agency_fee → pct_commission', () => {
    const payload = toUpdateF2ReconciliationSheetPayload({
      exchange_id: 2,
      sales_allocation_id: 9,
      reconciliation_date: '15/06/2026',
      note: 'ghi chú',
      items: [
        {
          ...createEmptyF2ReconciliationSheetItem(),
          product_inventory_id: 1,
          reconciliation_type: CTVReconciliationReconciliation_type.advance,
          fee_calculation_price: 1_000_000_000,
          pct_agency_fee: 1.5,
          amt_agency_fee: null,
          amt_payment_this_period: 12_000_000,
          shared_bonus_amount: 0,
          fee_deduction: 0,
          extra_bonus_pct: null,
          extra_bonus_amount: null,
          note: '',
        },
      ],
    })

    expect(payload.exchange_id).toBe(2)
    expect(payload.sales_allocation_id).toBe(9)
    expect(payload.reconciliation_date).toBe('2026-06-15')
    expect(payload.note).toBe('ghi chú')
    // `status` KHÔNG còn nằm trong body PUT — BE chỉ đổi trạng thái qua endpoint transition riêng.
    expect('status' in payload).toBe(false)

    const item = payload.items[0]
    expect(item.product_inventory_id).toBe(1)
    expect(item.fee_calculation_price).toBe('1000000000')
    expect(item.pct_commission).toBe('1.5')
    expect(item.amt_agency_fee).toBeNull()
    expect(item.amt_payment_this_period).toBe('12000000')
    expect(item.shared_bonus_amount).toBe('0')
    expect(item.fee_deduction).toBe('0')
    expect(item.extra_bonus_pct).toBeNull()
    expect(item.extra_bonus_amount).toBeNull()
    // period_type / progress / VAT flags are BE-managed — never in the payload.
    expect('period_type' in item).toBe(false)
    expect('progress_from_pct' in item).toBe(false)
  })
})
