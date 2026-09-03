import { describe, expect, it, vi } from 'vitest'

// deal-service pulls a service chain that fails to initialise under vitest — stub it so the pure
// reference assemblers (the unit under test) can be imported in isolation.
vi.mock('@/features/sales/deals/services/deal-service', () => ({
  useDealCommissionConfigList: () => ({ data: undefined, isLoading: false }),
}))

import {
  buildReference,
  extractCurrentCommissionConfig,
  toRefNumber,
  type ReconMvCommissionConfig,
} from './useReconMvReference'

describe('toRefNumber', () => {
  it('maps empty/invalid to null, parses valid numbers (incl explicit 0)', () => {
    expect(toRefNumber(null)).toBeNull()
    expect(toRefNumber(undefined)).toBeNull()
    expect(toRefNumber('')).toBeNull()
    expect(toRefNumber('abc')).toBeNull()
    expect(toRefNumber('5')).toBe(5)
    expect(toRefNumber(0)).toBe(0)
  })
})

describe('extractCurrentCommissionConfig', () => {
  const current = { pct_agency_fee: '5' } as ReconMvCommissionConfig

  it('reads `current` from an array envelope', () => {
    expect(extractCurrentCommissionConfig([{ current }])).toBe(current)
  })

  it('reads `current` from a single envelope object', () => {
    expect(extractCurrentCommissionConfig({ current })).toBe(current)
  })

  it('is undefined for shapes without `current` / null', () => {
    expect(extractCurrentCommissionConfig([{}])).toBeUndefined()
    expect(extractCurrentCommissionConfig(null)).toBeUndefined()
  })
})

describe('buildReference', () => {
  it('maps the deal commission config + deal price into the MV reference', () => {
    const config = {
      pct_agency_fee: '5',
      amt_agency_fee: '0', // "0" means "no fixed fee" → null (toRefAmount)
      is_agency_fee_include_vat: true,
      pct_investor_bonus: '1',
      amt_investor_bonus: '2000000',
      is_investor_bonus_include_vat: false,
      amt_shared_bonus: '500000',
      is_shared_bonus_include_vat: null,
    } as unknown as ReconMvCommissionConfig

    const ref = buildReference(
      config,
      { listedPrice: 3_000_000_000, feeCalculationPrice: 2_800_000_000 },
      false
    )

    expect(ref.listedPrice).toBe(3_000_000_000)
    expect(ref.feeCalculationPrice).toBe(2_800_000_000)
    expect(ref.pctAgencyFee).toBe(5)
    expect(ref.amtAgencyFee).toBeNull() // "0" treated as not-set
    expect(ref.isAgencyFeeIncludeVat).toBe(true)
    expect(ref.pctInvestorBonus).toBe(1)
    expect(ref.amtInvestorBonus).toBe(2_000_000)
    expect(ref.isInvestorBonusIncludeVat).toBe(false)
    expect(ref.amtSharedBonus).toBe(500_000)
    expect(ref.isSharedBonusIncludeVat).toBeNull()
    expect(ref.priorReceivedTotal).toBeNull()
    expect(ref.isLoading).toBe(false)
  })

  it('degrades to all-null when config and price are absent', () => {
    const ref = buildReference(null, null, true)
    expect(ref.pctAgencyFee).toBeNull()
    expect(ref.amtAgencyFee).toBeNull()
    expect(ref.isAgencyFeeIncludeVat).toBeNull()
    expect(ref.listedPrice).toBeNull()
    expect(ref.isLoading).toBe(true)
  })
})
