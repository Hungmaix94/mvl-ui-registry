import { describe, it, expect } from 'vitest'
import {
  buildPayeeRows,
  holdChipLabel,
  certChipLabel,
  manualChipLabel,
} from './RecipientPayoutTable'

const isCommissionType = (t: string) => t === 'pct_sale_commission'

const basePosition = (over: Record<string, unknown> = {}) => ({
  posIdx: 0,
  posData: {
    pct_type: 'pct_sale_commission',
    percentage: '2.00',
    recipients: [],
    payee_holds: [],
    ...over,
  },
})

const ctvRecipient = (amount: string) => ({
  collaborator_id: 136,
  recipient_name: 'CTV B',
  pct_of_parent: '52.85',
  amount,
})

describe('buildPayeeRows — WS2 payee_holds', () => {
  it('PENDING directive (hold_amount null, PBTV DRAFT): row held, amount previews the payee allocation', () => {
    const rows = buildPayeeRows(
      [
        basePosition({
          recipients: [ctvRecipient('20000000')],
          payee_holds: [
            {
              id: 1,
              payee_type: 'collaborator',
              payee_id: 136,
              payee_name: 'CTV B',
              status: 'PENDING',
              hold_reason: 'CARRYOVER',
              tax_base: 'PRE_TAX',
              hold_amount: null,
            },
          ],
        }),
      ],
      { isCommissionType, ownerType: 'employee', ownerId: 13766 }
    )
    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.isHeld).toBe(true)
    expect(row.holdPending).toBe(true)
    expect(row.hold).toBe(20000000)
    expect(row.preTaxHold).toBe(20000000)
    expect(row.isProxy).toBe(true)
  })

  it('MATERIALIZED directive with voided splits (payee gone from recipients): stub row still shows the hold', () => {
    const rows = buildPayeeRows(
      [
        basePosition({
          payee_holds: [
            {
              id: 2,
              payee_type: 'collaborator',
              payee_id: 136,
              payee_name: 'CTV B',
              status: 'MATERIALIZED',
              hold_reason: 'CARRYOVER',
              tax_base: 'PRE_TAX',
              hold_amount: '20000000',
            },
          ],
        }),
      ],
      { isCommissionType, ownerType: 'employee', ownerId: 13766 }
    )
    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.name).toBe('CTV B')
    expect(row.isHeld).toBe(true)
    expect(row.holdPending).toBeUndefined()
    expect(row.hold).toBe(20000000)
    expect(row.preTaxHold).toBe(20000000)
  })

  it('deduplicates the same directive appearing on multiple positions of the share', () => {
    const directive = {
      id: 3,
      payee_type: 'collaborator',
      payee_id: 136,
      payee_name: 'CTV B',
      status: 'MATERIALIZED',
      hold_reason: 'MANUAL',
      tax_base: 'POST_TAX',
      hold_amount: '5000000',
    }
    const rows = buildPayeeRows(
      [
        basePosition({ recipients: [ctvRecipient('4000000')], payee_holds: [directive] }),
        basePosition({ pct_type: 'pct_mv_bonus_to_sale', payee_holds: [directive] }),
      ],
      { isCommissionType, ownerType: 'employee', ownerId: 13766 }
    )
    const row = rows.find((r) => r.key === 'collaborator-136')
    expect(row?.hold).toBe(5000000)
    expect(row?.postTaxHold).toBe(5000000)
  })

  it('auto broker-cert hold is flagged and labelled — never a silent number', () => {
    const rows = buildPayeeRows(
      [
        basePosition({
          recipients: [ctvRecipient('10570000')],
          payee_holds: [
            {
              id: null, // auto cert hold — not a directive
              payee_type: 'collaborator',
              payee_id: 136,
              payee_name: 'CTV B',
              status: 'MATERIALIZED',
              hold_reason: 'MISSING_BROKER_CERT',
              origin: 'auto_cert',
              tax_base: 'POST_TAX',
              hold_amount: '9513000',
            },
          ],
        }),
      ],
      { isCommissionType, ownerType: 'employee', ownerId: 13766 }
    )
    const row = rows[0]
    expect(row.isHeld).toBe(true)
    expect(row.holdAutoCert).toBe(true)
    expect(row.postTaxHold).toBe(9513000)
    expect(holdChipLabel(row)).toBe('Tự động giữ · thiếu CCMG')
  })

  it('manual materialized hold chip carries its reason', () => {
    const rows = buildPayeeRows(
      [
        basePosition({
          payee_holds: [
            {
              id: 9,
              payee_type: 'collaborator',
              payee_id: 136,
              payee_name: 'CTV B',
              status: 'MATERIALIZED',
              hold_reason: 'CARRYOVER',
              origin: 'manual',
              tax_base: 'PRE_TAX',
              hold_amount: '20000000',
            },
          ],
        }),
      ],
      { isCommissionType, ownerType: 'employee', ownerId: 13766 }
    )
    expect(holdChipLabel(rows[0])).toBe('Tạm giữ · chưa nhận kỳ này')
  })

  it('auto-cert-only row is NOT flagged manual; a directive row is', () => {
    const certOnly = buildPayeeRows(
      [
        basePosition({
          recipients: [ctvRecipient('10570000')],
          payee_holds: [
            {
              id: null,
              payee_type: 'collaborator',
              payee_id: 136,
              payee_name: 'CTV B',
              status: 'MATERIALIZED',
              hold_reason: 'MISSING_BROKER_CERT',
              origin: 'auto_cert',
              tax_base: 'POST_TAX',
              hold_amount: '9513000',
            },
          ],
        }),
      ],
      { isCommissionType, ownerType: 'employee', ownerId: 13766 }
    )[0]
    expect(certOnly.holdAutoCert).toBe(true)
    expect(certOnly.holdManual).toBeUndefined() // release action must not offer to lift it

    const manual = buildPayeeRows(
      [
        basePosition({
          recipients: [ctvRecipient('10570000')],
          payee_holds: [
            {
              id: 5,
              payee_type: 'collaborator',
              payee_id: 136,
              payee_name: 'CTV B',
              status: 'PENDING',
              hold_reason: 'CARRYOVER',
              origin: 'manual',
              tax_base: 'PRE_TAX',
              hold_amount: null,
            },
          ],
        }),
      ],
      { isCommissionType, ownerType: 'employee', ownerId: 13766 }
    )[0]
    expect(manual.holdManual).toBe(true)
  })

  it('manual PENDING hold coexisting with an auto cert hold: both chips + post-approve preview', () => {
    // The user's exact case: sale auto-held 20% (cert) then presses "giữ toàn bộ" while
    // the PBTV is DRAFT — the FE must SHOW the pending manual hold, not swallow it.
    const rows = buildPayeeRows(
      [
        basePosition({
          recipients: [
            {
              employee_id: 13766,
              recipient_name: 'Sale MV',
              pct_of_parent: '7.5',
              amount: '1500000',
              account_hold_amount: '270000',
              account_post_tax_hold_amount: '270000',
            },
          ],
          payee_holds: [
            {
              id: null,
              payee_type: 'employee',
              payee_id: 13766,
              payee_name: 'Sale MV',
              status: 'MATERIALIZED',
              hold_reason: 'MISSING_BROKER_CERT',
              origin: 'auto_cert',
              tax_base: 'POST_TAX',
              hold_amount: '270000',
            },
            {
              id: 6,
              payee_type: 'employee',
              payee_id: 13766,
              payee_name: 'Sale MV',
              status: 'PENDING',
              hold_reason: 'CARRYOVER',
              origin: 'manual',
              tax_base: 'PRE_TAX',
              hold_amount: null,
            },
          ],
        }),
      ],
      { isCommissionType, ownerType: 'employee', ownerId: 13766 }
    )
    const row = rows[0]
    expect(row.holdAutoCert).toBe(true)
    expect(row.holdManual).toBe(true)
    expect(row.holdPending).toBe(true)
    // Post-approve preview: manual full hold supersedes the 270k cert figure.
    expect(row.hold).toBe(1500000)
    expect(row.preTaxHold).toBe(1500000)
    expect(row.postTaxHold).toBe(0)
    expect(certChipLabel(row)).toBe('Tự động giữ · thiếu CCMG')
    expect(manualChipLabel(row)).toBe('Giữ theo người · chờ duyệt chi')
  })

  it('rows without any directive keep the previous behavior', () => {
    const rows = buildPayeeRows([basePosition({ recipients: [ctvRecipient('1000')] })], {
      isCommissionType,
      ownerType: 'employee',
      ownerId: 13766,
    })
    expect(rows[0].isHeld).toBe(false)
    expect(rows[0].hold).toBe(0)
  })

  it('scales feePct by multiplying position percentage with participationPct', () => {
    const position = basePosition({
      percentage: '3.50',
      recipients: [
        {
          collaborator_id: 136,
          recipient_name: 'CTV B',
          pct_of_parent: '100.00',
          amount: '27493200',
        },
      ],
    })

    const rows60 = buildPayeeRows([position], {
      isCommissionType,
      ownerType: 'employee',
      ownerId: 13766,
      participationPct: 60,
    })
    expect(rows60[0].feePct).toBeCloseTo(2.1, 4)

    const rows40 = buildPayeeRows([position], {
      isCommissionType,
      ownerType: 'employee',
      ownerId: 13766,
      participationPct: 40,
    })
    expect(rows40[0].feePct).toBeCloseTo(1.4, 4)
  })
})
