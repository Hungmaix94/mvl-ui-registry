import { describe, it, expect } from 'vitest'
import { bandHoldInfo, buildPayeeRows, computeRow } from './RecipientPayoutTable'

const isCommissionType = (t: string) => t === 'pct_sale_commission' || t === 'pct_f2_commission'

const position = (over: Record<string, unknown> = {}) => ({
  posIdx: 0,
  posData: {
    pct_type: 'pct_sale_commission',
    percentage: '2.00',
    recipients: [],
    payee_holds: [],
    ...over,
  },
})

const group = (code: string, positions: any[]) => ({
  code,
  name: code,
  recipient_type: 'employee',
  recipient_id: 1,
  participationPct: null,
  positions,
})

const manualHold = (over: Record<string, unknown> = {}) => ({
  id: 77,
  payee_type: 'collaborator',
  payee_id: 99,
  payee_name: 'CTV X',
  status: 'MATERIALIZED',
  origin: 'manual',
  hold_reason: 'CARRYOVER',
  tax_base: 'PRE_TAX',
  hold_amount: '30000000',
  ...over,
})

/**
 * A pooled payee who ALSO receives an untagged "nhận hộ" split on the same share —
 * allowed since the ws155 rule reversal (CTV participant may be both). `excludePooled`
 * is documented as a PER-ROW rule, so the untagged row stays visible and MUST keep its
 * own hold; the band must not claim it.
 */
describe('pooled band vs untagged nhận-hộ row — hold attribution', () => {
  const mixedPos = position({
    recipients: [
      { employee_id: 1, recipient_name: 'Sale A', pct_of_parent: '0.00', amount: '0' },
      // untagged nhận-hộ row for CTV X — stays visible under this sale
      {
        collaborator_id: 99,
        recipient_name: 'CTV X',
        pct_of_parent: '60.00',
        amount: '30000000',
      },
      // pooled cut for the same person — hidden, rendered once as the band
      {
        collaborator_id: 99,
        recipient_name: 'CTV X',
        pct_of_parent: '40.00',
        amount: '20000000',
        pooled_allocation_id: 3,
      },
    ],
    payee_holds: [manualHold()],
  })

  it('keeps the hold ON the visible untagged row instead of dropping it', () => {
    const rows = buildPayeeRows([mixedPos], {
      isCommissionType,
      ownerType: 'employee',
      ownerId: 1,
      excludePooled: true,
    })
    const x = rows.map(computeRow).find((r) => r.name === 'CTV X')!
    // pooled row hidden -> fee is the untagged 30M only; the directive stays on this row
    expect(x.fee).toBe(30000000)
    expect(x.hold).toBe(30000000)
    expect(x.preTaxHold).toBe(30000000)
    expect(x.isHeld).toBe(true)
  })

  it('band does NOT double-count the same directive', () => {
    const hi = bandHoldInfo([group('G1', [mixedPos])] as any, 'collaborator-99')
    expect(hi.total).toBe(0)
    expect(hi.manual).toBe(false)
  })

  it('pooled-only payee: no stub row, band owns the hold (ws164 shape preserved)', () => {
    const pooledOnly = position({
      recipients: [
        { employee_id: 1, recipient_name: 'Sale A', pct_of_parent: '0.00', amount: '0' },
        {
          collaborator_id: 99,
          recipient_name: 'CTV X',
          pct_of_parent: '100.00',
          amount: '66668000',
          pooled_allocation_id: 8,
        },
      ],
      payee_holds: [manualHold({ id: null, origin: 'auto_cert', hold_amount: '60001200' })],
    })
    const rows = buildPayeeRows([pooledOnly], {
      isCommissionType,
      ownerType: 'employee',
      ownerId: 1,
      excludePooled: true,
    })
    expect(rows.map((r) => r.name)).toEqual(['Sale A'])

    const hi = bandHoldInfo([group('G1', [pooledOnly])] as any, 'collaborator-99')
    expect(hi.total).toBe(60001200)
    expect(hi.autoCert).toBe(true)
  })

  it('sweeps only the pooled-owned shares when the payee spans both kinds of band', () => {
    // G1: pooled-only (band's money)   G2: untagged nhận-hộ row (row's money)
    const pooledOnly = position({
      recipients: [
        {
          collaborator_id: 99,
          recipient_name: 'CTV X',
          pct_of_parent: '100.00',
          amount: '20000000',
          pooled_allocation_id: 3,
        },
      ],
      payee_holds: [manualHold({ id: 51, hold_amount: '20000000' })],
    })
    const untagged = position({
      recipients: [
        {
          collaborator_id: 99,
          recipient_name: 'CTV X',
          pct_of_parent: '100.00',
          amount: '30000000',
        },
      ],
      payee_holds: [manualHold({ id: 52, hold_amount: '30000000' })],
    })
    const hi = bandHoldInfo(
      [group('G1', [pooledOnly]), group('G2', [untagged])] as any,
      'collaborator-99'
    )
    expect(hi.preTax).toBe(20000000) // NOT 50,000,000 — G2's hold belongs to G2's row
  })
})

describe('bandHoldInfo — PENDING directive preview (DRAFT PBTV)', () => {
  const pendingPos = position({
    recipients: [
      {
        collaborator_id: 99,
        recipient_name: 'CTV X',
        pct_of_parent: '100.00',
        amount: '50000000',
        pooled_allocation_id: 3,
      },
    ],
    payee_holds: [manualHold({ id: 88, status: 'PENDING', hold_amount: null })],
  })

  it('previews the post-approve figure from the band allocation instead of showing 0', () => {
    const hi = bandHoldInfo([group('G1', [pendingPos])] as any, 'collaborator-99', 50_000_000)
    expect(hi.pending).toBe(true)
    expect(hi.manual).toBe(true)
    expect(hi.preTax).toBe(50_000_000)
    expect(hi.total).toBe(50_000_000)
  })

  it('honours the directive tax base for the preview', () => {
    const postTaxPos = position({
      ...pendingPos.posData,
      payee_holds: [
        manualHold({ id: 89, status: 'PENDING', hold_amount: null, tax_base: 'POST_TAX' }),
      ],
    })
    const hi = bandHoldInfo([group('G1', [postTaxPos])] as any, 'collaborator-99', 50_000_000)
    expect(hi.postTax).toBe(50_000_000)
    expect(hi.preTax).toBe(0)
  })

  it('a pending preview SUPERSEDES a coexisting cert hold (mirrors buildPayeeRows)', () => {
    const bothPos = position({
      ...pendingPos.posData,
      payee_holds: [
        manualHold({ id: null, origin: 'auto_cert', hold_amount: '9000000' }),
        manualHold({ id: 90, status: 'PENDING', hold_amount: null }),
      ],
    })
    const hi = bandHoldInfo([group('G1', [bothPos])] as any, 'collaborator-99', 50_000_000)
    expect(hi.autoCert).toBe(true)
    expect(hi.total).toBe(50_000_000) // not 59,000,000
  })
})

describe('bandHoldInfo — recipient-level holds on the pooled rows', () => {
  it('folds a hold parked on the pooled row itself (pre-WS2 shape)', () => {
    const pos = position({
      recipients: [
        {
          collaborator_id: 99,
          recipient_name: 'CTV X',
          pct_of_parent: '100.00',
          amount: '50000000',
          pooled_allocation_id: 3,
          hold_amount: '12000000',
          tax_base: 'POST_TAX',
          is_held: true,
        },
      ],
      payee_holds: [],
    })
    const hi = bandHoldInfo([group('G1', [pos])] as any, 'collaborator-99')
    expect(hi.postTax).toBe(12000000)
    expect(hi.manual).toBe(true)
  })
})
