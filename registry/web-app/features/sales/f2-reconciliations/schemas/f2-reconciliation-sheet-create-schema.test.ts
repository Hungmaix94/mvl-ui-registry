import { describe, expect, it } from 'vitest'

import { CTVReconciliationPeriod_type } from '@/api/schema'
import { INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import {
  createEmptyF2ReconciliationSheetItem,
  f2ReconciliationSheetItemSchema,
  f2ReconciliationSheetSchema,
} from '@/features/sales/f2-reconciliations/schemas/f2-reconciliation-sheet-create-schema'

// F2 reuses the CANONICAL line model. These tests pin the F2-specific schema seams: the lighter item
// refine (NO period/progress guards — F2 inherits those read-only) and the F2 sheet header.

describe('createEmptyF2ReconciliationSheetItem', () => {
  it('delegates to the canonical empty item (agency-fee default, VAT 10%, money fields zero/null)', () => {
    const item = createEmptyF2ReconciliationSheetItem()
    expect(item.period_type).toBe(CTVReconciliationPeriod_type.normal_payment)
    expect(item.fee_calculation_price).toBeNull()
    expect(item.amt_agency_fee).toBeNull()
    expect(item.vat_rate).toBe(INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE)
    expect(item.shared_bonus_amount).toBe(0)
    expect(item.fee_deduction).toBe(0)
    expect(item.extra_bonus_pct).toBeNull()
    expect(item.extra_bonus_amount).toBeNull()
  })
})

describe('f2ReconciliationSheetItemSchema (light refine)', () => {
  it('accepts a complete item with a positive product_inventory_id', () => {
    const ok = f2ReconciliationSheetItemSchema.safeParse({
      ...createEmptyF2ReconciliationSheetItem(),
      product_inventory_id: 3,
    })
    expect(ok.success).toBe(true)
  })

  it('rejects a non-positive product_inventory_id', () => {
    const bad = f2ReconciliationSheetItemSchema.safeParse({
      ...createEmptyF2ReconciliationSheetItem(),
      product_inventory_id: 0,
    })
    expect(bad.success).toBe(false)
  })

  it('rejects both % and ₫ agency fee together (XOR)', () => {
    const bad = f2ReconciliationSheetItemSchema.safeParse({
      ...createEmptyF2ReconciliationSheetItem(),
      product_inventory_id: 3,
      pct_agency_fee: 1.5,
      amt_agency_fee: 5_000_000,
    })
    expect(bad.success).toBe(false)
  })

  it('does NOT reject inherited read-only period_types (unlike the investor schema)', () => {
    // F2 period_type comes from the parent CĐT and is not user-editable — the investor guards
    // (cancellation unsupported / adjustment_only-first) must NOT block valid F2 rows.
    for (const period_type of [
      CTVReconciliationPeriod_type.adjustment_only,
      CTVReconciliationPeriod_type.cancellation,
    ]) {
      const result = f2ReconciliationSheetItemSchema.safeParse({
        ...createEmptyF2ReconciliationSheetItem(),
        product_inventory_id: 3,
        period_type,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('f2ReconciliationSheetSchema', () => {
  const base = {
    reconciliation_date: '15/06/2026',
    items: [{ ...createEmptyF2ReconciliationSheetItem(), product_inventory_id: 1 }],
  }

  it('requires exchange_id and sales_allocation_id', () => {
    expect(
      f2ReconciliationSheetSchema.safeParse({ ...base, exchange_id: 2, sales_allocation_id: 9 })
        .success
    ).toBe(true)
    expect(f2ReconciliationSheetSchema.safeParse({ ...base, sales_allocation_id: 9 }).success).toBe(
      false
    )
    expect(f2ReconciliationSheetSchema.safeParse({ ...base, exchange_id: 2 }).success).toBe(false)
  })

  it('requires at least one detail row', () => {
    expect(
      f2ReconciliationSheetSchema.safeParse({
        ...base,
        exchange_id: 2,
        sales_allocation_id: 9,
        items: [],
      }).success
    ).toBe(false)
  })
})
