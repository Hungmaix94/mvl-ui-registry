import { describe, expect, it } from 'vitest'

import { ReconciliationStatus as Status } from '@/constants/api-schema-aliases'

import { computeReconSettlement, type ReconSettlementInput } from './recon-settlement'
import { EMPTY_MV_REFERENCE } from './recon-empty-reference'
import {
  createEmptyInvestorReconciliationSheetItem,
  type InvestorReconciliationSheetCreateItemValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'

type PriorRows = ReconSettlementInput['priorRows']

const item = (
  overrides: Partial<InvestorReconciliationSheetCreateItemValues>
): InvestorReconciliationSheetCreateItemValues => ({
  ...createEmptyInvestorReconciliationSheetItem(),
  product_inventory_id: 1,
  ...overrides,
})

describe('computeReconSettlement', () => {
  it('progress state — below 100% shows remaining receivable, no settlement verdict', () => {
    const result = computeReconSettlement({
      item: item({
        fee_calculation_price: 1_000_000_000,
        pct_agency_fee: 5,
        progress_from_pct: 0,
        progress_to_pct: 20,
        vat_rate: 10,
        is_agency_fee_include_vat: true,
      }),
      mv: EMPTY_MV_REFERENCE,
      priorRows: [],
      periodCommission: 10_000_000,
      retroactiveAdjustment: 0,
      extraBonusPeriodAmount: 0,
    })
    expect(result.isSettlement).toBe(false)
    expect(result.state).toBe('progress')
    expect(result.hasExtra).toBe(false)
    expect(result.rows).toHaveLength(3) // phí đại lý + thưởng + khấu trừ
    expect(result.totalActual).toBe(10_000_000)
    // settlement intermediates are NOT rounded (only formatted) → 50tr × 1.1 = 55000000.00000001
    expect(result.totalExpected).toBeCloseTo(55_000_000)
    expect(result.remainingReceivable).toBeCloseTo(45_000_000)
  })

  it('ready state — settlement reached and totals match (no VAT)', () => {
    const result = computeReconSettlement({
      item: item({
        fee_calculation_price: 1_000_000_000,
        pct_agency_fee: 5,
        progress_from_pct: 0,
        progress_to_pct: 100,
        vat_rate: 0,
      }),
      mv: EMPTY_MV_REFERENCE,
      priorRows: [],
      periodCommission: 50_000_000,
      retroactiveAdjustment: 0,
      extraBonusPeriodAmount: 0,
    })
    expect(result.isSettlement).toBe(true)
    expect(result.diff).toBe(0)
    expect(result.state).toBe('ready')
  })

  it('shortfall state — settlement reached but cumulative below expected', () => {
    const result = computeReconSettlement({
      item: item({
        fee_calculation_price: 1_000_000_000,
        pct_agency_fee: 5,
        progress_from_pct: 0,
        progress_to_pct: 100,
        vat_rate: 0,
      }),
      mv: EMPTY_MV_REFERENCE,
      priorRows: [],
      periodCommission: 40_000_000, // 10tr short of the 50tr full fee
      retroactiveAdjustment: 0,
      extraBonusPeriodAmount: 0,
    })
    expect(result.state).toBe('shortfall')
    expect(result.diff).toBe(-10_000_000)
  })

  it('rolls prior confirmed periods into the cumulative fee', () => {
    const priorRows = [
      {
        status: Status.confirmed,
        fee_calculation_price: '1000000000',
        pct_agency_fee: '5',
        amt_agency_fee: null,
        progress_from_pct: '0',
        progress_to_pct: '80',
        is_agency_fee_include_vat: true,
        vat_rate: '0',
      },
    ] as PriorRows

    const result = computeReconSettlement({
      item: item({
        fee_calculation_price: 1_000_000_000,
        pct_agency_fee: 5,
        progress_from_pct: 80,
        progress_to_pct: 100,
        vat_rate: 0,
        is_agency_fee_include_vat: true,
      }),
      mv: EMPTY_MV_REFERENCE,
      priorRows,
      periodCommission: 10_000_000, // this period (80→100%)
      retroactiveAdjustment: 0,
      extraBonusPeriodAmount: 0,
    })
    // prior 40tr (0→80%) + this 10tr = 50tr cumulative = full fee → ready
    expect(result.cumulativeFee).toBe(50_000_000)
    expect(result.state).toBe('ready')
  })

  // HIGH-1 (Phase 1 review): phí tăng thêm + khấu trừ cùng lúc — đường tài chính rủi ro nhất, trước
  // chưa phủ. VAT=0 ⇒ toInclusive là no-op ⇒ số nguyên sạch (toBe). Pin hành vi hiện tại.
  it('settlement with extra bonus AND deduction together — over state + remainingReceivable', () => {
    const result = computeReconSettlement({
      item: item({
        fee_calculation_price: 1_000_000_000,
        pct_agency_fee: 5, // full fee = 50tr
        extra_bonus_pct: 2, // extra full = 20tr
        shared_bonus_period_amount: 5_000_000, // thưởng kỳ này
        fee_deduction: 3_000_000, // khấu trừ kỳ này
        progress_from_pct: 0,
        progress_to_pct: 100,
        vat_rate: 0,
      }),
      mv: EMPTY_MV_REFERENCE,
      priorRows: [],
      periodCommission: 50_000_000,
      retroactiveAdjustment: 0,
      extraBonusPeriodAmount: 20_000_000,
    })

    expect(result.isSettlement).toBe(true)
    expect(result.hasExtra).toBe(true)
    expect(result.rows).toHaveLength(4) // phí đại lý + phí tăng thêm + thưởng + khấu trừ
    expect(result.cumulativeFee).toBe(50_000_000)
    expect(result.cumulativeExtra).toBe(20_000_000)
    expect(result.extraActualForFormula).toBe(20_000_000)
    expect(result.cumulativeBonus).toBe(5_000_000)
    expect(result.cumulativeDeduct).toBe(3_000_000)
    // Actual = 50 + 20 + 5 − 3 = 72tr; Expected = 50 + 20 + 0 − 0 = 70tr ⇒ dư 2tr.
    expect(result.totalActual).toBe(72_000_000)
    expect(result.totalExpected).toBe(70_000_000)
    expect(result.diff).toBe(2_000_000)
    expect(result.state).toBe('over')
    expect(result.bonusOverMv).toBe(5_000_000)
    // Còn phải thu = 70 − (50 + 20 + 5 − 3) = −2tr (đã thu dư).
    expect(result.remainingReceivable).toBe(-2_000_000)
  })

  // deductAgreed (deal.total_fee_deduction, PRE-VAT): expected của dòng "Khấu trừ" — null ⇒ 0 (hành vi
  // cũ, các case trên dùng EMPTY_MV_REFERENCE nên không đổi); có giá trị ⇒ quy GỒM VAT theo vat_rate kỳ.
  it('uses mv.deductAgreed (grossed to VAT-inclusive) as the expected Khấu trừ', () => {
    const result = computeReconSettlement({
      item: item({
        fee_calculation_price: 1_000_000_000,
        pct_agency_fee: 5, // full fee = 50tr
        fee_deduction: 3_000_000,
        progress_from_pct: 0,
        progress_to_pct: 100,
        vat_rate: 10,
        is_agency_fee_include_vat: true,
        is_fee_deduction_include_vat: true,
      }),
      mv: { ...EMPTY_MV_REFERENCE, deductAgreed: 3_000_000 },
      priorRows: [],
      periodCommission: 50_000_000,
      retroactiveAdjustment: 0,
      extraBonusPeriodAmount: 0,
    })

    const deductRow = result.rows.find((row) => row.label === 'Khấu trừ')
    // PRE-VAT 3tr → gồm VAT 10% = 3,3tr (cùng gross-up như các dòng expected khác).
    expect(deductRow?.expected).toBeCloseTo(3_300_000)
    expect(deductRow?.negative).toBe(true)
    // Expected fee fallback = phí ĐL của dòng 50tr, mv.isAgencyFeeIncludeVat=null ⇒ gross ×1,1 = 55tr
    // (same as the "progress" case above) ⇒ totalExpected = 55 − 3,3 = 51,7tr.
    expect(result.totalExpected).toBeCloseTo(51_700_000)
    // Actual: 50tr − 3tr (khấu trừ nhập ĐÃ gồm VAT, giữ nguyên) = 47tr.
    expect(result.totalActual).toBeCloseTo(47_000_000)
  })

  it('deductAgreed null keeps the legacy expected = 0 for Khấu trừ', () => {
    const result = computeReconSettlement({
      item: item({
        fee_calculation_price: 1_000_000_000,
        pct_agency_fee: 5,
        fee_deduction: 3_000_000,
        progress_from_pct: 0,
        progress_to_pct: 100,
        vat_rate: 0,
      }),
      mv: EMPTY_MV_REFERENCE, // deductAgreed: null
      priorRows: [],
      periodCommission: 50_000_000,
      retroactiveAdjustment: 0,
      extraBonusPeriodAmount: 0,
    })
    const deductRow = result.rows.find((row) => row.label === 'Khấu trừ')
    expect(deductRow?.expected).toBe(0)
  })

  // F2 (includeExtraBonus=false): dòng "Phí tăng thêm" bị ẩn + loại khỏi Σ tổng & "còn phải thu".
  it('excludes the extra-bonus row from rows + totals when includeExtraBonus = false (F2)', () => {
    const base = {
      item: item({
        fee_calculation_price: 1_000_000_000,
        pct_agency_fee: 5, // full fee = 50tr
        extra_bonus_pct: 2, // extra full = 20tr (sẽ bị loại khi tắt)
        shared_bonus_period_amount: 5_000_000,
        fee_deduction: 3_000_000,
        progress_from_pct: 0,
        progress_to_pct: 100,
        vat_rate: 0,
      }),
      mv: EMPTY_MV_REFERENCE,
      priorRows: [] as PriorRows,
      periodCommission: 50_000_000,
      retroactiveAdjustment: 0,
      extraBonusPeriodAmount: 20_000_000,
    }

    const off = computeReconSettlement({ ...base, includeExtraBonus: false })
    expect(off.hasExtra).toBe(false)
    expect(off.rows).toHaveLength(3) // phí đại lý + thưởng + khấu trừ (KHÔNG có phí tăng thêm)
    expect(off.extraActualForFormula).toBe(0)
    // Tổng loại phí tăng thêm: actual 50 + 5 − 3 = 52tr; expected 50tr ⇒ dư 2tr (do thưởng).
    expect(off.totalActual).toBe(52_000_000)
    expect(off.totalExpected).toBe(50_000_000)

    // Cùng input nhưng bật lại ⇒ có dòng phí tăng thêm (đối chứng).
    const on = computeReconSettlement({ ...base, includeExtraBonus: true })
    expect(on.hasExtra).toBe(true)
    expect(on.rows).toHaveLength(4)
    expect(on.totalActual).toBe(72_000_000)
  })
})
