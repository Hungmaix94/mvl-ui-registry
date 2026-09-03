import { describe, expect, it } from 'vitest'

import { ReconciliationStatus } from '@/constants/api-schema-aliases'

import {
  INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE,
  RECON_PAYMENT_VARIANCE_THRESHOLD,
  agencyCommissionFull,
  checkPaymentVariance,
  computePeriodCommission,
  computeRetroactiveAdjustment,
  computeVatAmount,
  deriveReconLine,
  extraBonusFull,
  filterPriorHistoryRows,
  filterStrictlyPriorHistoryRows,
  historyRowExtraPeriodCommission,
  historyRowPeriodCommission,
  isCountableHistoryRow,
  latestConfirmedAgreedTerms,
  latestConfirmedHistoryRow,
  latestReconciledExtraAgreedFee,
  latestReconciledExtraProgressToPct,
  latestReconciledProgressToPct,
  maxConfirmedProgressToPct,
  progressDelta,
  reconNetFromInclusive,
  reconNetPerField,
  reconReceivableInclusive,
  reconVatPair,
  resolveEffectiveProgressToPct,
  resolvePriorAgreedTerms,
  resolveProgressBeforePct,
  resolveReconVatRate,
  roundReconVnd,
  sumReconciledHistoryBaseFee,
  sumReconciledHistoryExtraFee,
  toNum,
  type ReconLineComputationInput,
} from './recon-calculations'

import { ReconciliationStatus as Status } from '@/constants/api-schema-aliases'

type HistoryRows = Parameters<typeof sumReconciledHistoryBaseFee>[0]

const baseInput = (
  overrides: Partial<ReconLineComputationInput> = {}
): ReconLineComputationInput => ({
  feeCalculationPrice: 0,
  pctAgencyFee: null,
  amtAgencyFee: null,
  progressFromPct: null,
  progressToPct: null,
  sharedBonusPeriodAmount: 0,
  feeDeduction: 0,
  extraBonusPct: null,
  extraBonusAmount: null,
  extraProgressFromPct: null,
  extraProgressToPct: null,
  amtPaymentThisPeriod: null,
  vatRate: null,
  ...overrides,
})

describe('progressDelta', () => {
  it('returns 0 when either bound is null', () => {
    expect(progressDelta(null, 50)).toBe(0)
    expect(progressDelta(10, null)).toBe(0)
  })

  it('computes the fraction between bounds', () => {
    expect(progressDelta(40, 70)).toBeCloseTo(0.3)
  })
})

describe('computeVatAmount', () => {
  it('is 0 when vat rate is null (VAT off)', () => {
    expect(computeVatAmount(1_000_000, null)).toBe(0)
  })

  it('applies a non-10 rate', () => {
    expect(computeVatAmount(1_000_000, 8)).toBeCloseTo(80_000)
  })
})

describe('deriveReconLine', () => {
  it('computes period commission by percentage over progress', () => {
    const c = deriveReconLine(
      baseInput({
        feeCalculationPrice: 2_000_000_000,
        pctAgencyFee: 3,
        progressFromPct: 40,
        progressToPct: 70,
      })
    )
    // 2e9 × 3% = 60,000,000 ; × 0.3 = 18,000,000
    expect(c.periodCommission).toBeCloseTo(18_000_000)
    expect(c.totalAmount).toBeCloseTo(18_000_000)
  })

  it('computes period commission by fixed amount over progress', () => {
    const c = deriveReconLine(
      baseInput({ amtAgencyFee: 50_000_000, progressFromPct: 0, progressToPct: 50 })
    )
    expect(c.periodCommission).toBeCloseTo(25_000_000)
  })

  it('allows a negative total (clawback)', () => {
    const c = deriveReconLine(
      baseInput({ amtAgencyFee: 0, progressFromPct: 0, progressToPct: 0, feeDeduction: 5_000_000 })
    )
    expect(c.totalAmount).toBeCloseTo(-5_000_000)
  })

  it('applies VAT by the per-line rate', () => {
    const c = deriveReconLine(
      baseInput({ amtAgencyFee: 10_000_000, progressFromPct: 0, progressToPct: 100, vatRate: 10 })
    )
    expect(c.totalAmount).toBe(10_000_000)
    expect(c.vatAmount).toBe(1_000_000)
    expect(c.totalAmountWithVat).toBe(11_000_000)
  })

  it('sheet total equals sum of per-line with-VAT amounts (no 1đ drift)', () => {
    const lineA = deriveReconLine(
      baseInput({
        feeCalculationPrice: 2_000_000_000,
        pctAgencyFee: 3,
        progressFromPct: 0,
        progressToPct: 50,
        sharedBonusPeriodAmount: 15_000_000,
        feeDeduction: 4_000_000,
        vatRate: 8,
      })
    )
    const lineB = deriveReconLine(
      baseInput({
        feeCalculationPrice: 1_500_000_000,
        pctAgencyFee: 4,
        progressFromPct: 0,
        progressToPct: 50,
        sharedBonusPeriodAmount: 13_000_000,
        feeDeduction: 4_200_000,
        extraBonusPct: 0.5,
        extraProgressFromPct: 0,
        extraProgressToPct: 100,
        vatRate: 8,
      })
    )
    const sumWithVat = lineA.totalAmountWithVat + lineB.totalAmountWithVat
    expect(Number.isInteger(lineA.totalAmountWithVat)).toBe(true)
    expect(Number.isInteger(lineB.totalAmountWithVat)).toBe(true)
    expect(Number.isInteger(sumWithVat)).toBe(true)
  })

  it('uses an independent extra-bonus progress schedule when both bounds are set', () => {
    const c = deriveReconLine(
      baseInput({
        feeCalculationPrice: 1_000_000_000,
        amtAgencyFee: 0,
        progressFromPct: 0,
        progressToPct: 50,
        extraBonusPct: 1,
        extraProgressFromPct: 0,
        extraProgressToPct: 100, // 100% of extra, independent of base 50%
      })
    )
    // extra full = 1e9 × 1% = 10,000,000 ; × 1.0 = 10,000,000
    expect(c.extraBonusPeriodAmount).toBeCloseTo(10_000_000)
  })

  it('returns null payout ratio when basis is zero', () => {
    const c = deriveReconLine(baseInput({ amtPaymentThisPeriod: 1_000 }))
    expect(c.payoutRatio).toBeNull()
  })
})

describe('filterPriorHistoryRows', () => {
  it('excludes rows belonging to the sheet being viewed', () => {
    const rows = [
      {
        investor_sheet: 1176,
        status: ReconciliationStatus.confirmed,
        progress_to_pct: '15',
      },
      {
        investor_sheet: 900,
        status: ReconciliationStatus.confirmed,
        progress_to_pct: '30',
      },
    ] as Parameters<typeof filterPriorHistoryRows>[0]
    const prior = filterPriorHistoryRows(rows, 1176)
    expect(prior).toHaveLength(1)
    expect(prior[0].investor_sheet).toBe(900)
  })
})

describe('filterStrictlyPriorHistoryRows', () => {
  // id đồng biến thứ tự tạo (per-căn): id lớn = kỳ tạo sau.
  const rows = [
    { id: 30, investor_sheet: 903 },
    { id: 20, investor_sheet: 902 },
    { id: 10, investor_sheet: 901 },
  ] as Parameters<typeof filterStrictlyPriorHistoryRows>[0]

  it('keeps only rows created BEFORE the current sheet (drops self + later periods)', () => {
    const prior = filterStrictlyPriorHistoryRows(rows, 902)
    expect(prior.map((r) => r.investor_sheet)).toEqual([901]) // 903 (later) + 902 (self) dropped
  })

  it('returns empty for the earliest period (nothing precedes it)', () => {
    expect(filterStrictlyPriorHistoryRows(rows, 901)).toHaveLength(0)
  })

  it('returns all rows when no current sheet is given (create mode)', () => {
    expect(filterStrictlyPriorHistoryRows(rows)).toHaveLength(3)
  })

  it('excludes the current sheet even when it is not yet persisted in history', () => {
    // Create mode where a draft id is passed but no matching row exists yet ⇒ all existing are prior.
    const prior = filterStrictlyPriorHistoryRows(rows, 999)
    expect(prior).toHaveLength(3)
  })
})

describe('resolveProgressBeforePct', () => {
  it('honors explicit form from including 0', () => {
    expect(resolveProgressBeforePct(0, 15)).toBe(0)
    expect(resolveProgressBeforePct(20, 15)).toBe(20)
  })

  it('falls back to prior cumulative when form from is empty', () => {
    expect(resolveProgressBeforePct(null, 15)).toBe(15)
    expect(resolveProgressBeforePct(null, null)).toBe(0)
  })

  it('first period with from=0 and to=15 yields 15% delta commission', () => {
    const from = resolveProgressBeforePct(0, null)
    const delta = progressDelta(from, 15)
    const c = deriveReconLine(
      baseInput({
        feeCalculationPrice: 1_000_000_000,
        pctAgencyFee: 2,
        progressFromPct: from,
        progressToPct: 15,
      })
    )
    expect(from).toBe(0)
    expect(delta).toBeCloseTo(0.15)
    expect(c.periodCommission).toBeGreaterThan(0)
  })
})

describe('resolveEffectiveProgressToPct', () => {
  it('uses progress_to when set', () => {
    expect(resolveEffectiveProgressToPct({ progress_from_pct: 40, progress_to_pct: 75 }, [])).toBe(
      75
    )
  })

  it('falls back to progress_from when to is missing (seeded from prior recon)', () => {
    expect(
      resolveEffectiveProgressToPct({ progress_from_pct: 60, progress_to_pct: null }, [])
    ).toBe(60)
  })

  it('falls back to latest confirmed history when both bounds are empty', () => {
    const rows = [
      {
        status: ReconciliationStatus.confirmed,
        progress_to_pct: '55',
      },
    ] as Parameters<typeof resolveEffectiveProgressToPct>[1]
    expect(
      resolveEffectiveProgressToPct({ progress_from_pct: null, progress_to_pct: null }, rows)
    ).toBe(55)
  })
})

describe('sumReconciledHistoryExtraFee', () => {
  it('sums extra period amounts for all non-voided rows (confirmed + draft), excludes voided', () => {
    const rows = [
      {
        status: ReconciliationStatus.confirmed,
        fee_calculation_price: '1000000000',
        extra_bonus_pct: '1',
        extra_bonus_amount: null,
        extra_bonus_progress_from_pct: '0',
        extra_bonus_progress_to_pct: '50',
        progress_from_pct: '0',
        progress_to_pct: '50',
      },
      {
        status: ReconciliationStatus.draft,
        fee_calculation_price: '1000000000',
        extra_bonus_pct: '1',
        extra_bonus_amount: null,
        extra_bonus_progress_from_pct: '50',
        extra_bonus_progress_to_pct: '100',
        progress_from_pct: '50',
        progress_to_pct: '100',
      },
      {
        status: ReconciliationStatus.voided,
        fee_calculation_price: '1000000000',
        extra_bonus_pct: '1',
        extra_bonus_amount: null,
        extra_bonus_progress_from_pct: '0',
        extra_bonus_progress_to_pct: '100',
        progress_from_pct: '0',
        progress_to_pct: '100',
      },
    ] as Parameters<typeof sumReconciledHistoryExtraFee>[0]

    // confirmed (1e9×1%×50% = 5tr) + draft (5tr) = 10tr; voided (10tr) bị loại.
    expect(sumReconciledHistoryExtraFee(rows)).toBeCloseTo(10_000_000)
    expect(historyRowExtraPeriodCommission(rows[0])).toBeCloseTo(5_000_000)
  })
})

describe('checkPaymentVariance', () => {
  it('does not warn when actual is null (fallback to computed)', () => {
    expect(checkPaymentVariance(null, 100_000).warn).toBe(false)
  })

  it('warns only beyond the threshold', () => {
    expect(checkPaymentVariance(100_000 + RECON_PAYMENT_VARIANCE_THRESHOLD + 1, 100_000).warn).toBe(
      true
    )
    expect(checkPaymentVariance(100_000 + 5_000, 100_000).warn).toBe(false)
  })
})

describe('latestConfirmedAgreedTerms', () => {
  it('returns null when there is no confirmed row (first reconciliation)', () => {
    const rows = [
      {
        status: ReconciliationStatus.draft,
        fee_calculation_price: '3300000000',
        pct_agency_fee: '5.15',
        amt_agency_fee: null,
      },
    ] as Parameters<typeof latestConfirmedAgreedTerms>[0]
    expect(latestConfirmedAgreedTerms(rows)).toBeNull()
  })

  it('picks the most recent confirmed row, skipping newer drafts and voided', () => {
    // API sorts new→old: draft (newest) then the latest confirmed, then an older confirmed.
    const rows = [
      {
        status: ReconciliationStatus.draft,
        fee_calculation_price: '3300000000',
        pct_agency_fee: '9',
        amt_agency_fee: null,
      },
      {
        status: ReconciliationStatus.confirmed,
        fee_calculation_price: '3300000000',
        pct_agency_fee: '5.1',
        amt_agency_fee: null,
      },
      {
        status: ReconciliationStatus.confirmed,
        fee_calculation_price: '3000000000',
        pct_agency_fee: '5',
        amt_agency_fee: null,
      },
    ] as Parameters<typeof latestConfirmedAgreedTerms>[0]
    expect(latestConfirmedAgreedTerms(rows)).toEqual({
      feeCalculationPrice: 3_300_000_000,
      pctAgencyFee: 5.1,
      amtAgencyFee: null,
    })
  })
})

describe('latestConfirmedHistoryRow', () => {
  it('returns null when no confirmed row exists (only draft/pending/voided)', () => {
    const rows = [
      { id: 3, status: ReconciliationStatus.draft },
      { id: 2, status: ReconciliationStatus.pending },
      { id: 1, status: ReconciliationStatus.voided },
    ] as Parameters<typeof latestConfirmedHistoryRow>[0]
    expect(latestConfirmedHistoryRow(rows)).toBeNull()
  })

  it('picks the latest CONFIRMED row, skipping a newer draft (rows sorted new→old)', () => {
    // Mirrors the căn at recon 1384: a newer DRAFT (22%) must NOT win over the confirmed 10%.
    const rows = [
      {
        id: 3,
        status: ReconciliationStatus.draft,
        progress_to_pct: '22',
        base_progress_to_pct: '22.02',
      },
      {
        id: 2,
        status: ReconciliationStatus.confirmed,
        progress_to_pct: '10',
        base_progress_to_pct: '10',
      },
    ] as Parameters<typeof latestConfirmedHistoryRow>[0]
    expect(latestConfirmedHistoryRow(rows)?.progress_to_pct).toBe('10')
    expect(latestConfirmedHistoryRow(rows)?.base_progress_to_pct).toBe('10')
  })

  it('returns the newest confirmed row when several are confirmed (e.g. căn at recon 1360)', () => {
    // 3 confirmed periods 20 / 40 / 50 — newest (50%, base 50.49) must win, even if it is the
    // currently-viewed sheet (no exclusion applied at this layer).
    const rows = [
      {
        id: 1393,
        status: ReconciliationStatus.confirmed,
        progress_to_pct: '50.00',
        base_progress_to_pct: '50.49',
      },
      {
        id: 1170,
        status: ReconciliationStatus.confirmed,
        progress_to_pct: '40.00',
        base_progress_to_pct: '40.39',
      },
      {
        id: 1168,
        status: ReconciliationStatus.confirmed,
        progress_to_pct: '20.00',
        base_progress_to_pct: '20.20',
      },
    ] as Parameters<typeof latestConfirmedHistoryRow>[0]
    expect(latestConfirmedHistoryRow(rows)?.id).toBe(1393)
  })
})

describe('computeRetroactiveAdjustment', () => {
  const terms = (pct: number) => ({
    feeCalculationPrice: 3_300_000_000,
    pctAgencyFee: pct,
    amtAgencyFee: null,
  })

  it('is 0 on the first reconciliation (no confirmed prior progress)', () => {
    expect(
      computeRetroactiveAdjustment({
        progressFromPct: null,
        newTerms: terms(5.15),
        priorTerms: null,
      })
    ).toBe(0)
    expect(
      computeRetroactiveAdjustment({
        progressFromPct: 0,
        newTerms: terms(5.15),
        priorTerms: terms(5.1),
      })
    ).toBe(0)
  })

  it('is 0 when terms are unchanged vs the prior confirmed reconciliation', () => {
    expect(
      computeRetroactiveAdjustment({
        progressFromPct: 20,
        newTerms: terms(5.1),
        priorTerms: terms(5.1),
      })
    ).toBe(0)
  })

  it('uses the prior confirmed terms as the old fee: (5,15% − 5,10%) × 3,3 tỷ × 20% = 330.000', () => {
    expect(
      computeRetroactiveAdjustment({
        progressFromPct: 20,
        newTerms: terms(5.15),
        priorTerms: terms(5.1),
      })
    ).toBe(330_000)
  })
})

describe('resolveReconVatRate', () => {
  it('falls back to the default 10% when vat_rate is null/undefined/empty (VAT always applies)', () => {
    expect(resolveReconVatRate(null)).toBe(INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE)
    expect(resolveReconVatRate(undefined)).toBe(INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE)
    expect(resolveReconVatRate('')).toBe(INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE)
  })

  it('keeps an explicit rate, including explicit 0 (kỳ không VAT tường minh)', () => {
    expect(resolveReconVatRate(8)).toBe(8)
    expect(resolveReconVatRate('8.50')).toBe(8.5)
    expect(resolveReconVatRate(0)).toBe(0)
    expect(resolveReconVatRate('0.00')).toBe(0)
  })
})

describe('reconNetPerField', () => {
  it('returns the raw sum when vatRate is null (no VAT on any field)', () => {
    expect(
      reconNetPerField(
        [
          { amount: 100_000_000, includeVat: false },
          { amount: 20_000_000, includeVat: false },
          { amount: -10_000_000, includeVat: false },
        ],
        null
      )
    ).toBe(110_000_000)
  })

  it('extracts VAT only from fields flagged includeVat (per-field)', () => {
    // HH 110tr gồm VAT → /1.1 = 100tr; Thưởng 20tr KHÔNG VAT → giữ; Khấu trừ -11tr gồm VAT → -10tr.
    expect(
      reconNetPerField(
        [
          { amount: 110_000_000, includeVat: true },
          { amount: 20_000_000, includeVat: false },
          { amount: -11_000_000, includeVat: true },
        ],
        10
      )
    ).toBe(110_000_000)
  })

  it('matches the single-rate inclusive model when every field includes VAT', () => {
    // Tất cả gồm VAT ⇒ NET = Σ / 1.1 (đồng nhất reconNetFromInclusive(totalAmount, rate)).
    expect(
      reconNetPerField(
        [
          { amount: 33_000_000, includeVat: true },
          { amount: 22_000_000, includeVat: true },
          { amount: -11_000_000, includeVat: true },
        ],
        10
      )
    ).toBe(40_000_000)
  })
})

describe('reconReceivableInclusive', () => {
  it('returns the raw sum when vatRate is null (no VAT context)', () => {
    expect(
      reconReceivableInclusive(
        [
          { amount: 100_000_000, includeVat: false },
          { amount: -10_000_000, includeVat: false },
        ],
        null
      )
    ).toBe(90_000_000)
  })

  it('grosses up ONLY the chưa-gồm-VAT fields (×1.1), keeps gồm-VAT fields as-is', () => {
    // HH 110tr gồm VAT → giữ; Thưởng 20tr KHÔNG VAT → ×1,1 = 22tr; Khấu trừ -11tr gồm VAT → giữ.
    expect(
      reconReceivableInclusive(
        [
          { amount: 110_000_000, includeVat: true },
          { amount: 20_000_000, includeVat: false },
          { amount: -11_000_000, includeVat: true },
        ],
        10
      )
    ).toBe(121_000_000)
  })

  it('matches the screenshot case: Khấu trừ chưa gồm VAT ×1,1 ⇒ Phải thu 28.233.000', () => {
    const components = [
      { amount: 20_703_000, includeVat: true }, // Hoa hồng
      { amount: 2_750_000, includeVat: true }, // Phí tăng thêm
      { amount: 1_030_000, includeVat: true }, // Truy hồi
      { amount: 9_800_000, includeVat: true }, // Thưởng
      { amount: -5_500_000, includeVat: false }, // Khấu trừ (chưa gồm VAT) → ×1,1
    ]
    expect(reconReceivableInclusive(components, 10)).toBe(28_233_000)
    // Bất biến: Phải thu = NET × (1 + rate/100).
    expect(reconReceivableInclusive(components, 10)).toBe(
      Math.round(reconNetPerField(components, 10) * 1.1)
    )
  })
})

// ----------------------------------------------------------------------
// Golden-master coverage added Phase 1A — pin the remaining pure helpers
// before extracting them into the shared reconciliation engine.
// ----------------------------------------------------------------------

describe('toNum', () => {
  it('maps null/undefined/empty to 0', () => {
    expect(toNum(null)).toBe(0)
    expect(toNum(undefined)).toBe(0)
    expect(toNum('')).toBe(0)
  })

  it('parses numeric strings and keeps numbers; non-finite → 0', () => {
    expect(toNum('1000')).toBe(1000)
    expect(toNum('1.5')).toBe(1.5)
    expect(toNum(5)).toBe(5)
    expect(toNum('abc')).toBe(0)
  })
})

describe('roundReconVnd', () => {
  it('rounds to the nearest đồng (half up)', () => {
    expect(roundReconVnd(1.4)).toBe(1)
    expect(roundReconVnd(1.5)).toBe(2)
    expect(roundReconVnd(2.6)).toBe(3)
  })
})

describe('agencyCommissionFull', () => {
  it('prefers the fixed amount when present', () => {
    expect(
      agencyCommissionFull({
        feeCalculationPrice: 1_000_000_000,
        pctAgencyFee: 3,
        amtAgencyFee: 50_000_000,
      })
    ).toBe(50_000_000)
  })

  it('falls back to pct × price', () => {
    expect(
      agencyCommissionFull({
        feeCalculationPrice: 2_000_000_000,
        pctAgencyFee: 3,
        amtAgencyFee: null,
      })
    ).toBe(60_000_000)
  })

  it('is 0 when neither pct nor amount set', () => {
    expect(
      agencyCommissionFull({
        feeCalculationPrice: 1_000_000_000,
        pctAgencyFee: null,
        amtAgencyFee: null,
      })
    ).toBe(0)
  })
})

describe('computePeriodCommission', () => {
  it('scales the full agency commission by the progress delta', () => {
    expect(
      computePeriodCommission({
        feeCalculationPrice: 1_000_000_000,
        pctAgencyFee: 5,
        amtAgencyFee: null,
        progressDelta: 0.2,
      })
    ).toBe(10_000_000)
  })
})

describe('extraBonusFull', () => {
  it('prefers flat amount, then pct × price, else 0', () => {
    expect(
      extraBonusFull({
        feeCalculationPrice: 1_000_000_000,
        extraBonusPct: null,
        extraBonusAmount: 7_000_000,
      })
    ).toBe(7_000_000)
    expect(
      extraBonusFull({
        feeCalculationPrice: 1_000_000_000,
        extraBonusPct: 1,
        extraBonusAmount: null,
      })
    ).toBe(10_000_000)
    expect(
      extraBonusFull({
        feeCalculationPrice: 1_000_000_000,
        extraBonusPct: null,
        extraBonusAmount: null,
      })
    ).toBe(0)
  })
})

describe('reconNetFromInclusive', () => {
  it('returns the amount unchanged when vatRate is null', () => {
    expect(reconNetFromInclusive(110_000_000, null)).toBe(110_000_000)
  })

  it('divides out the VAT factor for a positive rate', () => {
    expect(reconNetFromInclusive(110_000_000, 10)).toBe(100_000_000)
  })

  it('keeps the amount for an explicit 0 rate (factor = 1)', () => {
    expect(reconNetFromInclusive(110_000_000, 0)).toBe(110_000_000)
  })
})

describe('reconVatPair', () => {
  it('grosses UP when the amount does NOT include VAT (includeVat=false)', () => {
    // Số BE là số thuần ⇒ noVat = số BE, vat = số BE × 1.1.
    expect(reconVatPair(100_000_000, false, 10)).toEqual({ noVat: 100_000_000, vat: 110_000_000 })
  })

  it('nets DOWN when the amount already includes VAT (includeVat=true)', () => {
    // Số BE đã gồm VAT ⇒ vat = số BE, noVat = số BE ÷ 1.1 (nghịch đảo reconNetFromInclusive).
    expect(reconVatPair(110_000_000, true, 10)).toEqual({ noVat: 100_000_000, vat: 110_000_000 })
  })

  it('returns equal values when vatRate is null (không quy đổi)', () => {
    expect(reconVatPair(40_500_000, false, null)).toEqual({ noVat: 40_500_000, vat: 40_500_000 })
    expect(reconVatPair(40_500_000, true, null)).toEqual({ noVat: 40_500_000, vat: 40_500_000 })
  })

  it('returns equal values for an explicit 0 rate (factor = 1)', () => {
    expect(reconVatPair(40_500_000, false, 0)).toEqual({ noVat: 40_500_000, vat: 40_500_000 })
  })

  it('preserves the sign for a giảm-trừ (negative) amount', () => {
    // Mục khấu trừ truyền số ÂM; đã gồm VAT ⇒ noVat = −5.500.000 ÷ 1.1 = −5.000.000.
    expect(reconVatPair(-5_500_000, true, 10)).toEqual({ noVat: -5_000_000, vat: -5_500_000 })
  })
})

describe('resolvePriorAgreedTerms', () => {
  it('returns the history terms when present', () => {
    const fromHistory = {
      feeCalculationPrice: 3_300_000_000,
      pctAgencyFee: 5.1,
      amtAgencyFee: null,
    }
    expect(
      resolvePriorAgreedTerms(fromHistory, {
        feeCalculationPrice: 9,
        pctAgencyFee: 9,
        amtAgencyFee: 9,
      })
    ).toBe(fromHistory)
  })

  it('falls back to MV terms, or null when MV has no price', () => {
    expect(
      resolvePriorAgreedTerms(null, {
        feeCalculationPrice: 1_000_000_000,
        pctAgencyFee: 5,
        amtAgencyFee: null,
      })
    ).toEqual({ feeCalculationPrice: 1_000_000_000, pctAgencyFee: 5, amtAgencyFee: null })
    expect(
      resolvePriorAgreedTerms(null, {
        feeCalculationPrice: null,
        pctAgencyFee: 5,
        amtAgencyFee: null,
      })
    ).toBeNull()
  })
})

describe('isCountableHistoryRow', () => {
  it('counts everything except voided', () => {
    expect(isCountableHistoryRow({ status: Status.confirmed } as HistoryRows[number])).toBe(true)
    expect(isCountableHistoryRow({ status: Status.draft } as HistoryRows[number])).toBe(true)
    expect(isCountableHistoryRow({ status: Status.voided } as HistoryRows[number])).toBe(false)
  })
})

describe('historyRowPeriodCommission', () => {
  it('computes base commission from price × %HH × Δprogress', () => {
    const row = {
      fee_calculation_price: '1000000000',
      pct_agency_fee: '2',
      amt_agency_fee: null,
      progress_from_pct: '0',
      progress_to_pct: '25',
    } as HistoryRows[number]
    // 1e9 × 2% = 20tr ; × 0.25 = 5tr
    expect(historyRowPeriodCommission(row)).toBe(5_000_000)
  })
})

describe('historyRowExtraPeriodCommission', () => {
  it('mirrors the base progress when no independent extra schedule is set', () => {
    const row = {
      fee_calculation_price: '1000000000',
      extra_bonus_pct: '1',
      extra_bonus_amount: null,
      extra_bonus_progress_from_pct: null,
      extra_bonus_progress_to_pct: null,
      progress_from_pct: '0',
      progress_to_pct: '40',
    } as HistoryRows[number]
    // ebFull 1e9×1% = 10tr ; mirror base Δ 0.4 = 4tr
    expect(historyRowExtraPeriodCommission(row)).toBe(4_000_000)
  })
})

describe('sumReconciledHistoryBaseFee', () => {
  it('sums base commission for countable rows, excluding voided', () => {
    const rows = [
      {
        status: Status.confirmed,
        fee_calculation_price: '1000000000',
        pct_agency_fee: '2',
        amt_agency_fee: null,
        progress_from_pct: '0',
        progress_to_pct: '25',
      },
      {
        status: Status.draft,
        fee_calculation_price: '1000000000',
        pct_agency_fee: '2',
        amt_agency_fee: null,
        progress_from_pct: '25',
        progress_to_pct: '50',
      },
      {
        status: Status.voided,
        fee_calculation_price: '1000000000',
        pct_agency_fee: '2',
        amt_agency_fee: null,
        progress_from_pct: '0',
        progress_to_pct: '100',
      },
    ] as HistoryRows
    // confirmed 5tr + draft 5tr = 10tr ; voided 20tr loại.
    expect(sumReconciledHistoryBaseFee(rows)).toBe(10_000_000)
  })
})

describe('latestReconciledProgressToPct', () => {
  it('returns the first countable row progress (new→old), skipping voided', () => {
    const rows = [
      { status: Status.voided, progress_to_pct: '90' },
      { status: Status.confirmed, progress_to_pct: '60' },
      { status: Status.draft, progress_to_pct: '30' },
    ] as HistoryRows
    expect(latestReconciledProgressToPct(rows)).toBe(60)
  })

  it('returns null when no countable row has a progress', () => {
    expect(latestReconciledProgressToPct([])).toBeNull()
  })
})

describe('maxConfirmedProgressToPct', () => {
  it('returns the MAX progress among confirmed rows only', () => {
    const rows = [
      { status: Status.confirmed, progress_to_pct: '30' },
      { status: Status.confirmed, progress_to_pct: '55' },
      { status: Status.draft, progress_to_pct: '80' },
      { status: Status.voided, progress_to_pct: '100' },
    ] as HistoryRows
    expect(maxConfirmedProgressToPct(rows)).toBe(55)
  })

  it('returns null when there is no confirmed row', () => {
    const rows = [{ status: Status.draft, progress_to_pct: '80' }] as HistoryRows
    expect(maxConfirmedProgressToPct(rows)).toBeNull()
  })
})

describe('latestReconciledExtraProgressToPct', () => {
  it('returns the first countable extra-bonus progress, skipping voided', () => {
    const rows = [
      { status: Status.voided, extra_bonus_progress_to_pct: '100' },
      { status: Status.confirmed, extra_bonus_progress_to_pct: '40' },
    ] as HistoryRows
    expect(latestReconciledExtraProgressToPct(rows)).toBe(40)
  })
})

describe('latestReconciledExtraAgreedFee', () => {
  it('returns the first CONFIRMED row that carries an extra fee (skips drafts)', () => {
    const rows = [
      { status: Status.draft, extra_bonus_amount: '9000000', extra_bonus_pct: null },
      {
        status: Status.confirmed,
        extra_bonus_amount: null,
        extra_bonus_pct: '2',
        is_extra_bonus_include_vat: true,
      },
    ] as HistoryRows
    expect(latestReconciledExtraAgreedFee(rows)).toEqual({
      extraBonusAmount: null,
      extraBonusPct: 2,
      isExtraBonusIncludeVat: true,
    })
  })

  it('returns null when no confirmed row carries an extra fee', () => {
    const rows = [
      { status: Status.draft, extra_bonus_amount: '9', extra_bonus_pct: null },
    ] as HistoryRows
    expect(latestReconciledExtraAgreedFee(rows)).toBeNull()
  })
})

describe('deriveReconLine — full combination', () => {
  it('combines commission + retro + supplementary + extra − deduction + VAT', () => {
    const c = deriveReconLine(
      baseInput({
        feeCalculationPrice: 1_000_000_000,
        pctAgencyFee: 5, // full = 50tr
        progressFromPct: 0,
        progressToPct: 20, // Δ0.2 → period 10tr
        extraBonusPct: 1, // ebFull 10tr
        extraProgressFromPct: 0,
        extraProgressToPct: 50, // Δ0.5 → extra 5tr
        sharedBonusPeriodAmount: 3_000_000,
        feeDeduction: 2_000_000,
        retroactiveAdjustment: 1_000_000,
        amtPaymentThisPeriod: 17_000_000,
        vatRate: 10,
      })
    )
    expect(c.periodCommission).toBe(10_000_000)
    expect(c.extraBonusFull).toBe(10_000_000)
    expect(c.extraBonusPeriodAmount).toBe(5_000_000)
    expect(c.subTotalCommission).toBe(19_000_000) // 10 + 1 + 3 + 5
    expect(c.totalAmount).toBe(17_000_000) // 19 − 2
    expect(c.vatAmount).toBe(1_700_000)
    expect(c.totalAmountWithVat).toBe(18_700_000)
    expect(c.payoutBasis).toBe(14_000_000) // 10 + 5 + 1 − 2
    expect(c.payoutRatio).toBeCloseTo(1) // (17 − 3) / 14
  })

  it('extra bonus period amount is 0 when no extra fee configured even with a schedule', () => {
    const c = deriveReconLine(
      baseInput({
        feeCalculationPrice: 1_000_000_000,
        amtAgencyFee: 0,
        progressFromPct: 0,
        progressToPct: 50,
        extraProgressFromPct: 0,
        extraProgressToPct: 100, // schedule present but no extra pct/amount
      })
    )
    expect(c.extraBonusPeriodAmount).toBe(0)
  })

  it('adjustment-only style (Δprogress = 0) yields only the retro amount', () => {
    const c = deriveReconLine(
      baseInput({
        feeCalculationPrice: 3_300_000_000,
        pctAgencyFee: 5.15,
        progressFromPct: 20,
        progressToPct: 20, // no progress this period
        retroactiveAdjustment: 330_000,
      })
    )
    expect(c.periodCommission).toBe(0)
    expect(c.subTotalCommission).toBe(330_000)
    expect(c.totalAmount).toBe(330_000)
  })
})
