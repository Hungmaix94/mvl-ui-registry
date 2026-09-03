import { describe, expect, it } from 'vitest'

import type { ReconMvCommissionConfig } from '@/features/sales/_shared/reconciliation/useReconMvReference'
import { buildF2Reference } from '@/features/sales/f2-reconciliations/hooks/f2-mv-reference'

// Pins the F2 "MV ghi nhận" rate bug fix: the recorded %HH must be the MV-to-F2 rate
// (f2_rates_by_exchange[exchange].pct_f2_commission), NOT the investor agency fee (pct_agency_fee).

function makeConfig(overrides: Partial<ReconMvCommissionConfig>): ReconMvCommissionConfig {
  return {
    id: 1,
    version_number: 1,
    source: 'manual',
    batch_code: '',
    created_at: '',
    pct_agency_fee: '6.00', // CĐT→MV — must NOT leak into the F2 reference
    is_agency_fee_include_vat: null,
    f2_rates_by_exchange: {
      '1896': {
        pct_f2_commission: '4.00',
        amt_f2_commission: null,
        is_f2_commission_include_vat: true,
        pct_f2_bonus: '0',
        amt_f2_bonus: null,
        is_f2_bonus_include_vat: true,
        pct_f2_inventory_hold: '0',
      },
    },
    ...overrides,
  } as ReconMvCommissionConfig
}

describe('buildF2Reference', () => {
  it('uses the MV-to-F2 commission for this exchange, not pct_agency_fee', () => {
    const ref = buildF2Reference(
      makeConfig({}),
      1896,
      { listedPrice: 1, feeCalculationPrice: 1 },
      false
    )
    expect(ref.pctAgencyFee).toBe(4) // pct_f2_commission, NOT 6 (pct_agency_fee)
    expect(ref.amtAgencyFee).toBeNull()
    expect(ref.isAgencyFeeIncludeVat).toBe(true)
    expect(ref.pctInvestorBonus).toBe(0)
    // F2 has no per-exchange shared-bonus reference
    expect(ref.amtSharedBonus).toBeNull()
  })

  it('resolves a fraction-of-% F2 commission spec via display_pct, not the flat pct=0 cache', () => {
    // BE để pct_f2_commission = "0" (display cache) khi HH F2 cấu hình dạng phân số; giá trị thật nằm
    // ở pct_f2_commission_spec (1/3 của 2% ⇒ display_pct 0.6667). Trước fix, %HH hiện nhầm 0%.
    const config = makeConfig({
      f2_rates_by_exchange: {
        '1896': {
          pct_f2_commission: '0',
          amt_f2_commission: null,
          is_f2_commission_include_vat: true,
          pct_f2_commission_spec: {
            mode: 'fraction',
            num: 1,
            den: 3,
            base_value: '2',
            base_unit: 'pct',
            display_pct: '0.6667',
          },
        },
      },
    })
    const ref = buildF2Reference(config, 1896, null, false)
    // spec giữ nguyên để bề mặt read-only hiển thị công thức "1 / 3 của 2%"; pct/amt chỉ là dẫn xuất mờ.
    expect(ref.agencyFeeSpec?.mode).toBe('fraction')
    expect(ref.pctAgencyFee).toBe(0.6667)
    expect(ref.amtAgencyFee).toBeNull()
  })

  it('uses the fixed F2 commission amount when set (pct cache 0/empty, no spec)', () => {
    const config = makeConfig({
      f2_rates_by_exchange: {
        '1896': {
          pct_f2_commission: '0',
          amt_f2_commission: '33333333',
          is_f2_commission_include_vat: true,
        },
      },
    })
    const ref = buildF2Reference(config, 1896, null, false)
    expect(ref.pctAgencyFee).toBeNull()
    expect(ref.amtAgencyFee).toBe(33333333)
  })

  it('falls back to null when the exchange has no F2 rate entry', () => {
    const ref = buildF2Reference(makeConfig({}), 9999, null, false)
    expect(ref.pctAgencyFee).toBeNull()
    expect(ref.amtAgencyFee).toBeNull()
  })

  it('cascades is_f2_commission_include_vat from is_agency_fee_include_vat when null', () => {
    const config = makeConfig({
      is_agency_fee_include_vat: true,
      f2_rates_by_exchange: {
        '1896': { pct_f2_commission: '3.00', is_f2_commission_include_vat: null },
      },
    })
    const ref = buildF2Reference(config, 1896, null, false)
    expect(ref.pctAgencyFee).toBe(3)
    expect(ref.isAgencyFeeIncludeVat).toBe(true)
  })

  it('returns empty-ish reference when config is missing', () => {
    const ref = buildF2Reference(null, 1896, null, false)
    expect(ref.pctAgencyFee).toBeNull()
    expect(ref.isLoading).toBe(false)
  })
})
