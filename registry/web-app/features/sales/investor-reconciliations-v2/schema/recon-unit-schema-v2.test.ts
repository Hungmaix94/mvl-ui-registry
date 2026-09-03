import { describe, expect, it } from 'vitest'

import { ReconciliationSourceType as SourceType } from '@/constants/api-schema-aliases'
import {
  createEmptyInvestorReconciliationSheetItem,
  investorReconciliationSheetCreateSchema,
  type InvestorReconciliationSheetCreateItemValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'

import { investorReconUnitSchemaV2 } from './recon-unit-schema-v2'

const baseItem = (overrides: Partial<InvestorReconciliationSheetCreateItemValues> = {}) => ({
  ...createEmptyInvestorReconciliationSheetItem(),
  product_inventory_id: 1,
  ...overrides,
})

const baseSheet = (items: ReturnType<typeof baseItem>[]) => ({
  project_id: 1,
  source_type: SourceType.direct,
  reconciliation_date: '01/07/2026',
  note: '',
  items,
})

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues.map((i) => i.message) ?? [])

describe('investorReconUnitSchemaV2 — progress fix (v2 only)', () => {
  it('accepts a line whose BE-computed progress_to_pct exceeds 100 (the silent-block bug)', () => {
    const r = investorReconUnitSchemaV2.safeParse(
      baseSheet([baseItem({ progress_from_pct: 20, progress_to_pct: 120 })])
    )
    expect(r.success).toBe(true)
  })

  it('accepts a normal line unchanged', () => {
    expect(investorReconUnitSchemaV2.safeParse(baseSheet([baseItem()])).success).toBe(true)
  })

  it('still enforces the item cross-field rules (agency-fee XOR)', () => {
    const r = investorReconUnitSchemaV2.safeParse(
      baseSheet([baseItem({ pct_agency_fee: 5, amt_agency_fee: 100_000_000 })])
    )
    expect(r.success).toBe(false)
    expect(messages(r)).toContain('Chỉ nhập % hoặc số tiền hoa hồng đại lý')
  })

  it('still enforces the shared-bonus XOR rule', () => {
    const r = investorReconUnitSchemaV2.safeParse(
      baseSheet([baseItem({ shared_bonus_pct: 2, shared_bonus_amount: 50_000_000 })])
    )
    expect(r.success).toBe(false)
    expect(messages(r)).toContain('Chỉ nhập % hoặc số tiền thưởng đại lý')
  })

  // Kế thừa từ refineInvestorReconItem (schema v2 rebuild từ base): sale ≤ tổng giảm trừ (mirror BE).
  it('inherits the fee_deduction_to_sale ≤ fee_deduction rule (valid null / 0 / == total)', () => {
    expect(
      investorReconUnitSchemaV2.safeParse(
        baseSheet([baseItem({ fee_deduction: 5_000_000, fee_deduction_to_sale_amount: null })])
      ).success
    ).toBe(true)
    expect(
      investorReconUnitSchemaV2.safeParse(
        baseSheet([baseItem({ fee_deduction: 5_000_000, fee_deduction_to_sale_amount: 0 })])
      ).success
    ).toBe(true)
    expect(
      investorReconUnitSchemaV2.safeParse(
        baseSheet([baseItem({ fee_deduction: 5_000_000, fee_deduction_to_sale_amount: 5_000_000 })])
      ).success
    ).toBe(true)
  })

  it('inherits the rejection when the sale portion exceeds fee_deduction', () => {
    const r = investorReconUnitSchemaV2.safeParse(
      baseSheet([baseItem({ fee_deduction: 5_000_000, fee_deduction_to_sale_amount: 5_000_001 })])
    )
    expect(r.success).toBe(false)
    expect(messages(r)).toContain('Phần trừ từ lương Sale không được vượt quá Giảm trừ khác')
  })
})

describe('v1 schema stays unchanged (fix is v2-only)', () => {
  it('v1 still rejects progress_to_pct > 100', () => {
    const r = investorReconciliationSheetCreateSchema.safeParse(
      baseSheet([baseItem({ progress_from_pct: 20, progress_to_pct: 120 })])
    )
    expect(r.success).toBe(false)
    expect(messages(r)).toContain('Tiến độ đến (%) phải từ 0 đến 100')
  })
})
