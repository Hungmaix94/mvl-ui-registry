import { describe, expect, it } from 'vitest'
import { buildPayeeRows, computeRow } from './RecipientPayoutTable'

const isCommissionType = (t: string) => t === 'pct_sale_commission'

const OPTS = { isCommissionType, ownerType: 'employee', ownerId: 1 }

const payee = (extra: Record<string, unknown> = {}) => ({
  employee_id: 1,
  recipient_name: 'Sale A',
  ...extra,
})

const position = (posIdx: number, posData: Record<string, unknown>) =>
  ({ posIdx, posData }) as never

/**
 * Field case behind the BE fix (cert hold nets the giảm-trừ share): sale A with no CCMG
 * gets 20% of the PIT-net of EACH share, and the deduction share's hold is NEGATIVE.
 *
 *   thưởng      720.000 -> 129.600
 *   phí      36.909.091 -> 6.643.636
 *   giảm trừ   -580.000 -> -104.400
 *                   Σ  =  6.668.836
 */
const BONUS_HOLD = 129_600
const FEE_HOLD = 6_643_636
const DEDUCTION_HOLD = -104_400

describe('buildPayeeRows — hold có dấu (giảm trừ)', () => {
  const positions = [
    position(0, {
      pct_type: 'pct_mv_bonus_to_sale',
      recipients: [payee({ amount: 720_000 })],
      payee_holds: [
        {
          id: 1,
          payee_type: 'employee',
          payee_id: 1,
          hold_amount: BONUS_HOLD,
          tax_base: 'POST_TAX',
          origin: 'auto_cert',
        },
      ],
    }),
    position(1, {
      pct_type: 'pct_sale_commission',
      recipients: [payee({ amount: 36_909_091 })],
      payee_holds: [
        {
          id: 2,
          payee_type: 'employee',
          payee_id: 1,
          hold_amount: FEE_HOLD,
          tax_base: 'POST_TAX',
          origin: 'auto_cert',
        },
      ],
    }),
    position(2, {
      pct_type: 'pct_fee_deduction_to_sale',
      is_deduction: true,
      recipients: [payee({ amount: -580_000 })],
      payee_holds: [
        {
          id: 3,
          payee_type: 'employee',
          payee_id: 1,
          hold_amount: DEDUCTION_HOLD,
          tax_base: 'POST_TAX',
          origin: 'auto_cert',
        },
      ],
    }),
  ]

  it('nets the negative deduction hold into the payee total', () => {
    const [row] = buildPayeeRows(positions, OPTS)
    expect(row.postTaxHold).toBe(6_668_836)
    expect(row.hold).toBe(6_668_836)
    expect(row.bonus).toBe(720_000)
    expect(row.fee).toBe(36_909_091)
    expect(row.deduction).toBe(580_000) // FE keeps the positive-magnitude convention
  })

  it('leaves thực nhận above the 0 floor once the hold is netted', () => {
    const [row] = buildPayeeRows(positions, OPTS)
    const computed = computeRow(row)
    // 37.049.091 gross, no PIT for an employee on the FE preview, minus the netted hold.
    expect(computed.tongTra).toBe(37_049_091)
    expect(computed.thucNhan).toBe(37_049_091 - 6_668_836)
  })

  it('keeps a RAL-level negative hold that carries no tax_base', () => {
    // Untagged hold_amount (no tax_base) used to be dropped by a `> 0` guard.
    const rows = buildPayeeRows(
      [
        position(0, {
          pct_type: 'pct_fee_deduction_to_sale',
          is_deduction: true,
          recipients: [payee({ amount: -580_000, hold_amount: DEDUCTION_HOLD })],
        }),
      ],
      OPTS
    )
    expect(rows[0].ralHold).toBe(DEDUCTION_HOLD)
    expect(rows[0].preTaxHold).toBe(DEDUCTION_HOLD)
    expect(rows[0].isHeld).toBe(true)
  })
})
