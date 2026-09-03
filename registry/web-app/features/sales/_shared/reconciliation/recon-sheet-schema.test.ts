import { describe, expect, it } from 'vitest'

import { CTVReconciliationPeriod_type, CTVReconciliationReconciliation_type } from '@/api/schema'
import { ReconciliationSourceType as SourceType } from '@/constants/api-schema-aliases'

import {
  INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE,
  createEmptyInvestorReconciliationSheetItem,
  hasInvestorReconciliationDetailUserData,
  investorReconciliationSheetCreateItemSchema,
  investorReconciliationSheetCreateSchema,
  isDefaultInvestorReconciliationSheetItem,
  type InvestorReconciliationSheetCreateItemValues,
  type InvestorReconciliationSheetCreateValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import {
  mapSheetToFormValues,
  toCreateInvestorReconciliationSheetPayload,
  toUpdateInvestorReconciliationSheetPayload,
} from '@/features/sales/investor-reconciliations/adapters/investor-reconciliation-adapter'
import type { InvestorReconciliationSheetFormSource } from '@/features/sales/investor-reconciliations/types/investor-reconciliation'

// Golden-master coverage (Phase 1A) for the Zod validation + payload adapters — the wire contract
// that MUST stay byte-identical after the schema is lifted into the shared engine.

const rawItem = (overrides: Partial<InvestorReconciliationSheetCreateItemValues> = {}) => ({
  ...createEmptyInvestorReconciliationSheetItem(),
  product_inventory_id: 1,
  ...overrides,
})

const parseItem = (overrides: Partial<InvestorReconciliationSheetCreateItemValues> = {}) =>
  investorReconciliationSheetCreateItemSchema.safeParse(rawItem(overrides))

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues.map((i) => i.message) ?? [])

describe('item schema — superRefine', () => {
  it('accepts a plain normal-payment line', () => {
    expect(parseItem().success).toBe(true)
  })

  it('accepts a cancellation period carrying only a deduction and a note', () => {
    const r = parseItem({
      period_type: CTVReconciliationPeriod_type.cancellation,
      pct_period_commission: null,
      amt_period_commission: null,
      fee_deduction: 20_000_000,
      note: 'Khách hủy cọc',
    })
    expect(r.success).toBe(true)
  })

  it('requires a note on a cancellation period', () => {
    const r = parseItem({
      period_type: CTVReconciliationPeriod_type.cancellation,
      pct_period_commission: null,
      amt_period_commission: null,
      note: '   ',
    })
    expect(r.success).toBe(false)
    expect(messages(r)).toContain('Vui lòng nhập ghi chú lý do hủy cọc')
  })

  // Chốt 04/08/2026: kỳ hủy cọc VẪN ghi nhận khoản của kỳ — chỉ không đẩy tiến độ (BE lo, qua
  // resolve_period_progress). Form không được chặn, nếu không sửa một dòng kỳ thường sang kỳ hủy
  // sẽ vướng lỗi trỏ vào ô người dùng không nhìn thấy.
  it('allows an agency-fee recognition on a cancellation period', () => {
    const r = parseItem({
      period_type: CTVReconciliationPeriod_type.cancellation,
      pct_period_commission: 30,
      note: 'Khách hủy cọc',
    })
    expect(r.success).toBe(true)
  })

  it('forbids both % and ₫ for period commission (XOR)', () => {
    const r = parseItem({ pct_period_commission: 10, amt_period_commission: 50_000_000 })
    expect(r.success).toBe(false)
    expect(messages(r)).toContain('Chỉ nhập % hoặc số tiền đối chiếu đợt này')
  })

  it('allows period commission % alone', () => {
    expect(parseItem({ pct_period_commission: 20 }).success).toBe(true)
  })

  it('forbids both % and ₫ for agency fee', () => {
    const r = parseItem({ pct_agency_fee: 5, amt_agency_fee: 100_000_000 })
    expect(r.success).toBe(false)
    expect(messages(r)).toContain('Chỉ nhập % hoặc số tiền hoa hồng đại lý')
  })

  it('forbids both % and ₫ for the extra bonus', () => {
    const r = parseItem({ extra_bonus_pct: 1, extra_bonus_amount: 5_000_000 })
    expect(r.success).toBe(false)
    expect(messages(r)).toContain('Chỉ nhập % hoặc số tiền phí tăng thêm')
  })

  it('forbids both % and ₫ for the shared bonus (XOR), allows either alone', () => {
    const both = parseItem({ shared_bonus_pct: 2, shared_bonus_amount: 50_000_000 })
    expect(both.success).toBe(false)
    expect(messages(both)).toContain('Chỉ nhập % hoặc số tiền thưởng đại lý')

    expect(parseItem({ shared_bonus_pct: 2, shared_bonus_amount: 0 }).success).toBe(true)
    expect(parseItem({ shared_bonus_amount: 50_000_000 }).success).toBe(true)
  })

  it('requires both extra-bonus progress bounds together', () => {
    const r = parseItem({ extra_bonus_progress_from_pct: 0, extra_bonus_progress_to_pct: null })
    expect(r.success).toBe(false)
    expect(messages(r)).toContain('Vui lòng nhập đủ tiến độ phí tăng thêm từ và đến')
  })

  // Mirror BE: `fee_deduction_to_sale_amount ∈ [0, fee_deduction]` (400 keyed on the field).
  it('allows fee_deduction_to_sale_amount null / 0 / == fee_deduction', () => {
    expect(
      parseItem({ fee_deduction: 5_000_000, fee_deduction_to_sale_amount: null }).success
    ).toBe(true)
    expect(parseItem({ fee_deduction: 5_000_000, fee_deduction_to_sale_amount: 0 }).success).toBe(
      true
    )
    expect(
      parseItem({ fee_deduction: 5_000_000, fee_deduction_to_sale_amount: 5_000_000 }).success
    ).toBe(true)
  })

  it('rejects fee_deduction_to_sale_amount above fee_deduction (path on the sale field)', () => {
    const r = parseItem({ fee_deduction: 5_000_000, fee_deduction_to_sale_amount: 5_000_001 })
    expect(r.success).toBe(false)
    expect(messages(r)).toContain('Phần trừ từ lương Sale không được vượt quá Giảm trừ khác')
    if (!r.success) {
      const issue = r.error.issues.find(
        (i) => i.message === 'Phần trừ từ lương Sale không được vượt quá Giảm trừ khác'
      )
      expect(issue?.path).toEqual(['fee_deduction_to_sale_amount'])
    }
  })

  it('rejects any sale deduction when fee_deduction is 0 (default)', () => {
    const r = parseItem({ fee_deduction: 0, fee_deduction_to_sale_amount: 1 })
    expect(r.success).toBe(false)
    expect(messages(r)).toContain('Phần trừ từ lương Sale không được vượt quá Giảm trừ khác')
  })

  it('settlement no longer validates progress_to_pct on FE (BE-owned)', () => {
    const r = parseItem({
      reconciliation_type: CTVReconciliationReconciliation_type.settlement,
      progress_to_pct: 80,
    })
    expect(r.success).toBe(true)
  })
})

describe('sheet schema — superRefine', () => {
  const baseSheet = (items: ReturnType<typeof rawItem>[]) => ({
    project_id: 1,
    source_type: SourceType.F0,
    source_exchange_id: 1,
    reconciliation_date: '15/06/2026',
    note: '',
    items,
  })

  it('accepts a valid F0 sheet with an exchange', () => {
    expect(investorReconciliationSheetCreateSchema.safeParse(baseSheet([rawItem()])).success).toBe(
      true
    )
  })

  it('requires source_exchange_id when source is F0', () => {
    const r = investorReconciliationSheetCreateSchema.safeParse({
      ...baseSheet([rawItem()]),
      source_exchange_id: undefined,
    })
    expect(r.success).toBe(false)
    expect(messages(r)).toContain('Vui lòng chọn nguồn hàng')
  })

  it('D1 — first period cannot be adjustment-only', () => {
    const r = investorReconciliationSheetCreateSchema.safeParse(
      baseSheet([rawItem({ period_type: CTVReconciliationPeriod_type.adjustment_only })])
    )
    expect(r.success).toBe(false)
    expect(messages(r)).toContain('Đợt đầu tiên không thể là Kỳ điều chỉnh thuần')
  })

  it('allows an empty detail list (sheet-first: lines added on the edit screen)', () => {
    const r = investorReconciliationSheetCreateSchema.safeParse(baseSheet([]))
    expect(r.success).toBe(true)
  })
})

describe('pristine-row detection', () => {
  it('createEmpty is pristine; setting an inventory makes it dirty', () => {
    expect(
      isDefaultInvestorReconciliationSheetItem(createEmptyInvestorReconciliationSheetItem())
    ).toBe(true)
    expect(
      isDefaultInvestorReconciliationSheetItem({
        ...createEmptyInvestorReconciliationSheetItem(),
        product_inventory_id: 1,
      })
    ).toBe(false)
  })

  it('hasUserData: empty single row false; >1 row or a filled row true', () => {
    expect(
      hasInvestorReconciliationDetailUserData([createEmptyInvestorReconciliationSheetItem()])
    ).toBe(false)
    expect(
      hasInvestorReconciliationDetailUserData([
        createEmptyInvestorReconciliationSheetItem(),
        createEmptyInvestorReconciliationSheetItem(),
      ])
    ).toBe(true)
    expect(
      hasInvestorReconciliationDetailUserData([
        { ...createEmptyInvestorReconciliationSheetItem(), product_inventory_id: 9 },
      ])
    ).toBe(true)
  })
})

describe('payload adapters — wire contract', () => {
  const values: InvestorReconciliationSheetCreateValues = {
    project_id: 7,
    source_type: SourceType.F0,
    source_exchange_id: 3,
    reconciliation_date: '15/06/2026',
    note: 'ghi chú',
    items: [
      {
        ...createEmptyInvestorReconciliationSheetItem(),
        product_inventory_id: 5,
        fee_calculation_price: 1_000_000_000,
        pct_agency_fee: 5,
        amt_agency_fee: null,
        vat_rate: 10,
        shared_bonus_amount: 0,
        amt_payment_this_period: null,
      },
    ],
  }

  it('serialises money to decimal strings, dates to server format, omits optional empties', () => {
    const payload = toCreateInvestorReconciliationSheetPayload(values)
    expect(payload.project_id).toBe(7)
    expect(payload.source_type).toBe(SourceType.F0)
    expect(payload.source_exchange_id).toBe(3)
    expect(payload.reconciliation_date).toBe('2026-06-15')
    const item = payload.items![0]
    expect(item.fee_calculation_price).toBe('1000000000')
    expect(item.pct_agency_fee).toBe('5')
    expect(item.amt_agency_fee).toBeNull() // nullable decimal string
    expect(item.vat_rate).toBe('10')
    expect(item.shared_bonus_amount).toBe('0')
    // amt_payment_this_period is an extra FE field absent from the generated request type → cast to read it.
    expect((item as Record<string, unknown>).amt_payment_this_period).toBeUndefined() // optional omitted when null
  })

  it('update payload mirrors the create payload shape', () => {
    const create = toCreateInvestorReconciliationSheetPayload(values)
    const update = toUpdateInvestorReconciliationSheetPayload(values)
    expect(update.items![0].fee_calculation_price).toBe(create.items![0].fee_calculation_price)
    expect(update.reconciliation_date).toBe(create.reconciliation_date)
  })
})

describe('mapSheetToFormValues', () => {
  it('maps the writable `items` payload back to form numbers (vat null → default)', () => {
    const sheet: InvestorReconciliationSheetFormSource = {
      project_detail: { id: 7 },
      source_type: SourceType.F0,
      source_exchange_detail: { id: 3 },
      reconciliation_date: '2026-06-15',
      note: 'hi',
      reconciliations: [],
      items: [
        {
          product_inventory_id: 5,
          fee_calculation_price: '1000000000',
          pct_agency_fee: '5',
          amt_agency_fee: undefined,
          vat_rate: undefined,
          pct_period_commission: '20',
          shared_bonus_amount: '0',
          fee_deduction: '0',
          is_agency_fee_include_vat: false,
          is_extra_bonus_include_vat: false,
          is_shared_bonus_include_vat: false,
          is_fee_deduction_include_vat: false,
          retroactive_adjustment_amount: '0',
          // BE đã đổi field này sang read-only + required, nên fixture phải mang nó. Giá trị do
          // BE suy ra từ tiến độ đã đối chiếu; ở đây chỉ cần một mốc hợp lệ để dựng đúng shape.
          extra_bonus_progress_from_pct: '0',
        },
      ],
    }

    const form = mapSheetToFormValues(sheet)
    expect(form.project_id).toBe(7)
    expect(form.source_exchange_id).toBe(3)
    expect(form.reconciliation_date).toBe('15/06/2026')
    expect(form.items[0].product_inventory_id).toBe(5)
    expect(form.items[0].fee_calculation_price).toBe(1_000_000_000)
    expect(form.items[0].pct_agency_fee).toBe(5)
    expect(form.items[0].vat_rate).toBe(INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE)
    expect(form.items[0].pct_period_commission).toBe(20)
    expect(form.items[0].progress_to_pct).toBeNull()
  })

  it('falls back to the read-only `reconciliations` when there are no writable items', () => {
    const sheet: InvestorReconciliationSheetFormSource = {
      project_detail: { id: 1 },
      source_type: SourceType.F0,
      source_exchange_detail: { id: 1 },
      reconciliation_date: '2026-06-15',
      note: '',
      reconciliations: [
        {
          product_inventory: 9,
          fee_calculation_price: '2000000000',
          pct_agency_fee: '3',
          vat_rate: '8',
          pct_period_commission: '15',
          progress_from_pct: '0',
          progress_to_pct: '15',
        },
      ],
    }

    const form = mapSheetToFormValues(sheet)
    expect(form.items[0].product_inventory_id).toBe(9)
    expect(form.items[0].fee_calculation_price).toBe(2_000_000_000)
    expect(form.items[0].vat_rate).toBe(8)
    expect(form.items[0].pct_period_commission).toBe(15)
    expect(form.items[0].progress_to_pct).toBe(15)
  })
})
