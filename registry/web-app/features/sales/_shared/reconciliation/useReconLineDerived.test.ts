import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'

import { CTVReconciliationPeriod_type } from '@/api/schema'

import {
  computeReconItemPreview,
  computeReconLineIssues,
  reconLineNetAmount,
  reconLineReceivableInclusive,
  resolveRetroactiveAmount,
  toReconLineComputationInput,
  useReconLineDerived,
} from './useReconLineDerived'
import { deriveReconLine } from '@/features/sales/_shared/reconciliation/recon-calculations'
import {
  createEmptyInvestorReconciliationSheetItem,
  type InvestorReconciliationSheetCreateItemValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import type { ReconMvReference } from './useReconMvReference'

// Local empty reference — mirrors EMPTY_REFERENCE from useReconMvReference WITHOUT importing that
// module (its deal-service import pulls a service chain that fails to init under vitest).
const EMPTY_REFERENCE: ReconMvReference = {
  listedPrice: null,
  feeCalculationPrice: null,
  pctAgencyFee: null,
  amtAgencyFee: null,
  baseAgencyFeeRate: null,
  baseAmtAgencyFee: null,
  isAgencyFeeIncludeVat: null,
  pctInvestorBonus: null,
  amtInvestorBonus: null,
  isInvestorBonusIncludeVat: null,
  amtSharedBonus: null,
  pctSharedBonus: null,
  isSharedBonusIncludeVat: null,
  priorReceivedTotal: null,
  deductAgreed: null,
  isLoading: false,
}

// ----------------------------------------------------------------------
// Golden-master coverage (Phase 1A) for the pure derivations + advisory issues
// that drive every reconciliation line preview. Pinned before extraction.
// ----------------------------------------------------------------------

const line = (
  overrides: Partial<InvestorReconciliationSheetCreateItemValues> = {}
): InvestorReconciliationSheetCreateItemValues => ({
  ...createEmptyInvestorReconciliationSheetItem(),
  product_inventory_id: 1,
  ...overrides,
})

const mv = (overrides: Partial<ReconMvReference> = {}): ReconMvReference => ({
  ...EMPTY_REFERENCE,
  ...overrides,
})

const computationFor = (l: InvestorReconciliationSheetCreateItemValues) =>
  deriveReconLine(toReconLineComputationInput(l))

describe('toReconLineComputationInput', () => {
  it('passes the line numbers through and resolves progress_from from prior cumulative', () => {
    const input = toReconLineComputationInput(
      line({
        fee_calculation_price: 1_000_000_000,
        progress_from_pct: null,
        progress_to_pct: 50,
        vat_rate: 10,
      }),
      0,
      { paymentProgressToPct: 15, extraProgressToPct: null }
    )
    expect(input.feeCalculationPrice).toBe(1_000_000_000)
    expect(input.progressFromPct).toBe(15) // seeded from prior cumulative
    expect(input.progressToPct).toBe(50)
    expect(input.vatRate).toBe(10)
  })

  it('honors an explicit progress_from over the prior cumulative', () => {
    const input = toReconLineComputationInput(line({ progress_from_pct: 20 }), 0, {
      paymentProgressToPct: 15,
      extraProgressToPct: null,
    })
    expect(input.progressFromPct).toBe(20)
  })
})

describe('resolveRetroactiveAmount', () => {
  it('prefers the authoritative server amount when present', () => {
    expect(resolveRetroactiveAmount(line(), { serverAmount: '330000', mv: EMPTY_REFERENCE })).toBe(
      330_000
    )
  })

  it('computes from prior confirmed terms × max-confirmed progress', () => {
    const result = resolveRetroactiveAmount(
      line({ fee_calculation_price: 3_300_000_000, pct_agency_fee: 5.15, amt_agency_fee: null }),
      {
        priorProgress: {
          paymentProgressToPct: null,
          extraProgressToPct: null,
          maxConfirmedProgressToPct: 20,
          latestConfirmedAgreedTerms: {
            feeCalculationPrice: 3_300_000_000,
            pctAgencyFee: 5.1,
            amtAgencyFee: null,
          },
        },
        mv: EMPTY_REFERENCE,
      }
    )
    // (5,15% − 5,10%) × 3,3 tỷ × 20% = 330.000
    expect(result).toBe(330_000)
  })

  it('is 0 on the first reconciliation (no confirmed prior)', () => {
    expect(
      resolveRetroactiveAmount(
        line({ fee_calculation_price: 3_300_000_000, pct_agency_fee: 5.15 }),
        {
          priorProgress: {
            paymentProgressToPct: null,
            extraProgressToPct: null,
            maxConfirmedProgressToPct: null,
            latestConfirmedAgreedTerms: null,
          },
          mv: EMPTY_REFERENCE,
        }
      )
    ).toBe(0)
  })
})

describe('reconLineNetAmount / reconLineReceivableInclusive (per-field VAT)', () => {
  it('extracts/keeps VAT per field — single all-inclusive commission', () => {
    const l = line({
      vat_rate: 10,
      is_agency_fee_include_vat: true,
      shared_bonus_period_amount: 0,
      fee_deduction: 0,
    })
    const amounts = {
      periodCommission: 110_000_000,
      retroactiveAdjustment: 0,
      extraBonusPeriodAmount: 0,
    }
    expect(reconLineNetAmount(l, amounts)).toBe(100_000_000)
    expect(reconLineReceivableInclusive(l, amounts)).toBe(110_000_000)
  })

  it('grosses up only the chưa-gồm-VAT deduction (screenshot case → 28.233.000)', () => {
    const l = line({
      vat_rate: 10,
      is_agency_fee_include_vat: true,
      is_extra_bonus_include_vat: true,
      is_shared_bonus_include_vat: true,
      is_fee_deduction_include_vat: false,
      shared_bonus_period_amount: 9_800_000,
      fee_deduction: 5_500_000,
    })
    const amounts = {
      periodCommission: 20_703_000,
      retroactiveAdjustment: 1_030_000,
      extraBonusPeriodAmount: 2_750_000,
    }
    expect(reconLineReceivableInclusive(l, amounts)).toBe(28_233_000)
    expect(reconLineReceivableInclusive(l, amounts)).toBe(
      Math.round(reconLineNetAmount(l, amounts) * 1.1)
    )
  })
})

// Shared-bonus 4-field model (BE 2026-06-23): tổng `shared_bonus_amount` chỉ là benchmark recon_check,
// KHÔNG vào tiền kỳ; chỉ `shared_bonus_period_amount` (thưởng ghi nhận kỳ) chảy vào net / sub_total.
describe('shared bonus: only period amount enters the period money', () => {
  const flatAmounts = { periodCommission: 0, retroactiveAdjustment: 0, extraBonusPeriodAmount: 0 }

  it('tổng thưởng (benchmark) KHÔNG vào net khi chưa ghi nhận kỳ (period = 0)', () => {
    const l = line({
      vat_rate: 0,
      shared_bonus_amount: 50_000_000,
      shared_bonus_period_amount: 0,
      fee_deduction: 0,
    })
    expect(reconLineNetAmount(l, flatAmounts)).toBe(0)
  })

  it('chỉ thưởng GHI NHẬN kỳ (period_amount) vào net', () => {
    const l = line({
      vat_rate: 0,
      shared_bonus_amount: 50_000_000,
      shared_bonus_period_amount: 30_000_000,
      fee_deduction: 0,
    })
    expect(reconLineNetAmount(l, flatAmounts)).toBe(30_000_000)
  })

  it('toReconLineComputationInput lấy sharedBonusPeriodAmount từ period_amount; sub_total = phí + thưởng ghi nhận (ví dụ doc §4)', () => {
    const input = toReconLineComputationInput(
      line({
        fee_calculation_price: 1_000_000_000,
        pct_agency_fee: 6,
        progress_from_pct: 0,
        progress_to_pct: 100,
        vat_rate: 0,
        shared_bonus_amount: 50_000_000, // tổng (benchmark) — không cộng vào sub_total
        shared_bonus_period_amount: 50_000_000, // ghi nhận kỳ — cộng vào sub_total
      })
    )
    expect(input.sharedBonusPeriodAmount).toBe(50_000_000)
    // 60tr phí (1 tỷ × 6%) + 50tr thưởng ghi nhận = 110tr
    expect(deriveReconLine(input).subTotalCommission).toBe(110_000_000)
  })
})

describe('computeReconLineIssues', () => {
  it('returns no issues for a clean line with no MV reference', () => {
    const l = line({
      fee_calculation_price: 1_000_000_000,
      progress_from_pct: 0,
      progress_to_pct: 20,
    })
    expect(computeReconLineIssues(l, computationFor(l), EMPTY_REFERENCE)).toEqual([])
  })

  it('D1: adjustment-only with known-empty history is a blocking error', () => {
    const l = line({ period_type: CTVReconciliationPeriod_type.adjustment_only })
    const issues = computeReconLineIssues(l, computationFor(l), EMPTY_REFERENCE, false)
    expect(issues.some((i) => i.code === 'adjustment_requires_prior' && i.severity === 'err')).toBe(
      true
    )
  })

  it('D9: adjustment-only with progress > 0 is an info hint', () => {
    const l = line({
      period_type: CTVReconciliationPeriod_type.adjustment_only,
      fee_calculation_price: 1_000_000_000,
      pct_agency_fee: 5,
      progress_from_pct: 0,
      progress_to_pct: 30,
    })
    const issues = computeReconLineIssues(l, computationFor(l), EMPTY_REFERENCE, true)
    expect(issues.some((i) => i.code === 'adjustment_has_progress' && i.severity === 'info')).toBe(
      true
    )
  })

  it('payment variance (Phần 1) warns when actual differs beyond threshold', () => {
    const l = line({
      fee_calculation_price: 1_000_000_000,
      pct_agency_fee: 5,
      progress_from_pct: 0,
      progress_to_pct: 20, // period commission 10tr
      amt_payment_this_period: 50_000_000, // far off
    })
    const issues = computeReconLineIssues(l, computationFor(l), EMPTY_REFERENCE)
    expect(issues.some((i) => i.code === 'payment_variance_base' && i.severity === 'warn')).toBe(
      true
    )
  })

  it('D15 price drift + D16 %HH mismatch warn against the MV reference', () => {
    const l = line({ fee_calculation_price: 1_100_000_000, pct_agency_fee: 6 })
    const reference = mv({ feeCalculationPrice: 1_000_000_000, pctAgencyFee: 5 })
    const issues = computeReconLineIssues(l, computationFor(l), reference)
    expect(issues.some((i) => i.code === 'price_drift')).toBe(true)
    expect(issues.some((i) => i.code === 'agency_fee_mismatch')).toBe(true)
  })
})

describe('computeReconItemPreview', () => {
  it('combines history-driven retro with the §11 computation', () => {
    const { computation, retroactiveAdjustment } = computeReconItemPreview(
      line({
        fee_calculation_price: 3_300_000_000,
        pct_agency_fee: 5.15,
        progress_from_pct: 20,
        progress_to_pct: 20,
      }),
      EMPTY_REFERENCE,
      {
        latestConfirmedAgreedTerms: {
          feeCalculationPrice: 3_300_000_000,
          pctAgencyFee: 5.1,
          amtAgencyFee: null,
        },
        latestProgressToPct: 20,
        latestExtraProgressToPct: null,
        maxConfirmedProgressToPct: 20,
      }
    )
    expect(retroactiveAdjustment).toBe(330_000)
    expect(computation.periodCommission).toBe(0) // no progress this period
  })
})

describe('includeExtraBonus = false (F2/simple preset — phí tăng thêm KHÔNG vào công thức)', () => {
  // Căn có cả phí base (HH đợt) và phí tăng thêm để chứng minh: base GIỮ NGUYÊN, extra bị LOẠI.
  const lineWithExtra = () =>
    line({
      fee_calculation_price: 1_000_000_000,
      pct_agency_fee: 5,
      progress_from_pct: 0,
      progress_to_pct: 20, // HH đợt = 1 tỷ × 5% × 20% = 10.000.000
      extra_bonus_pct: 2, // tổng phí tăng thêm = 1 tỷ × 2% = 20.000.000
      extra_bonus_progress_from_pct: 0,
      extra_bonus_progress_to_pct: 50, // phí tăng thêm đợt = 20tr × 50% = 10.000.000
    })

  it('toReconLineComputationInput nulls every extra-bonus field when excluded', () => {
    const input = toReconLineComputationInput(lineWithExtra(), 0, null, {
      includeExtraBonus: false,
    })
    expect(input.extraBonusPct).toBeNull()
    expect(input.extraBonusAmount).toBeNull()
    expect(input.extraProgressFromPct).toBeNull()
    expect(input.extraProgressToPct).toBeNull()
    // Phí base vẫn nguyên vẹn.
    expect(input.pctAgencyFee).toBe(5)
    expect(input.progressToPct).toBe(20)
  })

  it('computeReconItemPreview keeps base commission but drops extra bonus from totals', () => {
    const included = computeReconItemPreview(lineWithExtra(), EMPTY_REFERENCE)
    const excluded = computeReconItemPreview(lineWithExtra(), EMPTY_REFERENCE, null, {
      includeExtraBonus: false,
    })

    // Included: HH đợt 10tr + phí tăng thêm 10tr = subtotal/total 20tr.
    expect(included.computation.periodCommission).toBe(10_000_000)
    expect(included.computation.extraBonusPeriodAmount).toBe(10_000_000)
    expect(included.computation.totalAmount).toBe(20_000_000)

    // Excluded: HH đợt giữ nguyên 10tr; phí tăng thêm = 0 ⇒ subtotal/total chỉ còn 10tr.
    expect(excluded.computation.periodCommission).toBe(10_000_000)
    expect(excluded.computation.extraBonusPeriodAmount).toBe(0)
    expect(excluded.computation.subTotalCommission).toBe(10_000_000)
    expect(excluded.computation.totalAmount).toBe(10_000_000)
    expect(excluded.computation.payoutBasis).toBe(10_000_000)
  })

  it('suppresses the extra-fee payment-variance warning when excluded', () => {
    const l = line({
      fee_calculation_price: 1_000_000_000,
      extra_bonus_pct: 2,
      extra_bonus_progress_from_pct: 0,
      extra_bonus_progress_to_pct: 50,
      amt_extra_bonus_payment_this_period: 99_000_000, // far off the computed 10tr
    })
    const c = computationFor(l)
    expect(
      computeReconLineIssues(l, c, EMPTY_REFERENCE).some(
        (i) => i.code === 'payment_variance_extra_fee'
      )
    ).toBe(true)
    expect(
      computeReconLineIssues(l, c, EMPTY_REFERENCE, undefined, { includeExtraBonus: false }).some(
        (i) => i.code === 'payment_variance_extra_fee'
      )
    ).toBe(false)
  })
})

describe('useReconLineDerived (hook — server-frozen values win)', () => {
  it('prefers authoritative server fields when the row is saved/confirmed', () => {
    const { result } = renderHook(() =>
      useReconLineDerived(
        line({ fee_calculation_price: 1_000_000_000, pct_agency_fee: 5 }),
        EMPTY_REFERENCE,
        {
          period_commission: '10000000',
          total_amount: '17000000',
          vat_amount: '1700000',
          total_amount_with_vat: '18700000',
        }
      )
    )
    expect(result.current.isServerComputed).toBe(true)
    expect(result.current.periodCommission).toBe(10_000_000)
    expect(result.current.totalAmount).toBe(17_000_000)
    expect(result.current.totalAmountWithVat).toBe(18_700_000)
  })

  it('falls back to the local preview when no server fields are present', () => {
    const { result } = renderHook(() =>
      useReconLineDerived(
        line({
          fee_calculation_price: 1_000_000_000,
          pct_agency_fee: 5,
          progress_from_pct: 0,
          progress_to_pct: 20,
        }),
        EMPTY_REFERENCE
      )
    )
    expect(result.current.isServerComputed).toBe(false)
    expect(result.current.periodCommission).toBe(10_000_000)
  })
})
