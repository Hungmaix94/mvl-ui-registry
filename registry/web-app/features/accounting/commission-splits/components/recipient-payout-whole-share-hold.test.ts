import { describe, it, expect } from 'vitest'
import { buildPayeeRows } from './RecipientPayoutTable'

/**
 * Whole-share holds (BE `payee_holds[].scope === 'share'`).
 *
 * Prod worksheet 151, share 8664 (deal 1734, period 07/2026): the share is held, spans two
 * receipts, and the materialized CommissionHold covers the period's whole held allocation
 * (8,600,000). The BE reports it twice over — once as the position's RAL-level
 * `held_amount` flag, once as a `payee_holds` row of scope 'share'. They are the SAME money:
 * `held_amount` is the "held, pre-approve" flag, the row is what the payment gate enforces.
 * Adding both double-counts the hold and drives "thực nhận" negative.
 */

const isCommissionType = (t: string) => t === 'pct_sale_commission'

/** The share-8664 shape: CTV standing on the share, whole line held, no splits. */
const heldSharePosition = (over: Record<string, unknown> = {}) => ({
  posIdx: 0,
  posData: {
    pct_type: 'pct_sale_commission',
    percentage: '1.00',
    is_held: true,
    held_amount: '8600000',
    // BE derives this from the RAL hold_reason ('' -> MANUAL -> POST_TAX).
    tax_base: 'POST_TAX',
    recipients: [
      {
        collaborator_id: 130,
        recipient_name: 'Nguyen Van CTV',
        pct_of_parent: '100',
        amount: '8600000',
      },
    ],
    payee_holds: [],
    ...over,
  },
})

const wholeShareHoldRow = (over: Record<string, unknown> = {}) => ({
  id: null,
  payee_type: 'collaborator',
  payee_id: 130,
  payee_name: 'Nguyen Van CTV',
  status: 'MATERIALIZED',
  hold_reason: 'MISSING_BROKER_CERT',
  origin: 'auto_cert',
  scope: 'share',
  tax_base: 'POST_TAX',
  hold_amount: '8600000',
  ...over,
})

const build = (position: ReturnType<typeof heldSharePosition>) =>
  buildPayeeRows([position], { isCommissionType, ownerType: 'collaborator', ownerId: 130 })

describe('buildPayeeRows — whole-share hold (scope="share")', () => {
  it('counts the held money ONCE when the same hold arrives as held_amount and as a scope=share row', () => {
    const rows = build(heldSharePosition({ payee_holds: [wholeShareHoldRow()] }))

    expect(rows).toHaveLength(1)
    expect(rows[0].hold).toBe(8600000)
    expect(rows[0].isHeld).toBe(true)
  })

  it('puts a POST_TAX whole-share hold in the post-tax column, not the pre-tax one', () => {
    const rows = build(heldSharePosition({ payee_holds: [wholeShareHoldRow()] }))

    expect(rows[0].postTaxHold).toBe(8600000)
    expect(rows[0].preTaxHold).toBe(0)
  })

  it('still honours held_amount alone (legacy payload, BE not yet deployed)', () => {
    const rows = build(heldSharePosition())

    expect(rows[0].hold).toBe(8600000)
    expect(rows[0].isHeld).toBe(true)
  })

  it('keeps a payee-scoped hold additive — it is a different withhold, not the same money', () => {
    const rows = buildPayeeRows(
      [
        {
          posIdx: 0,
          posData: {
            pct_type: 'pct_sale_commission',
            percentage: '2.00',
            is_held: false,
            held_amount: '0',
            tax_base: '',
            recipients: [
              {
                collaborator_id: 136,
                recipient_name: 'Ha Bich Ngoc',
                pct_of_parent: '93.02',
                amount: '20000000',
              },
            ],
            payee_holds: [
              wholeShareHoldRow({
                scope: 'payee',
                payee_id: 136,
                payee_name: 'Ha Bich Ngoc',
                hold_amount: '9513000',
              }),
            ],
          },
        },
      ],
      { isCommissionType, ownerType: 'employee', ownerId: 13766 }
    )

    expect(rows[0].hold).toBe(9513000)
    expect(rows[0].postTaxHold).toBe(9513000)
  })
})
