import { describe, it, expect } from 'vitest'
import { bandHoldInfo, buildPayeeRows } from './RecipientPayoutTable'

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

describe('buildPayeeRows — fee % column', () => {
  it('amount-based share (percentage null, e.g. F2 exchange): feePct stays null so the cell renders "—", money still summed', () => {
    const rows = buildPayeeRows(
      [
        position({
          pct_type: 'pct_f2_commission',
          percentage: null,
          recipients: [
            {
              exchange_id: 1936,
              recipient_name: 'San F2',
              pct_of_parent: '100.00',
              amount: '20000000',
            },
          ],
        }),
      ],
      // participation 30% must NOT leak into the fee-% column
      { isCommissionType, ownerType: 'exchange', ownerId: 1936, participationPct: 30 }
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].feePct).toBeNull()
    expect(rows[0].fee).toBe(20000000)
  })

  it('pct-based share: feePct = pct_of_parent × share percentage', () => {
    const rows = buildPayeeRows(
      [
        position({
          recipients: [
            {
              employee_id: 13766,
              recipient_name: 'Sale A',
              pct_of_parent: '50.00',
              amount: '10750000',
            },
          ],
        }),
      ],
      { isCommissionType, ownerType: 'employee', ownerId: 13766 }
    )
    expect(rows[0].feePct).toBeCloseTo(1.0, 10) // 50% × 2.00%
  })

  // CR STT16: cột "% Phí từng sale" từng hiển thị 2% cho CẢ BA sale dù tỷ lệ tham gia khác
  // nhau (33/34/33). Con số phải là phí THỰC của từng người = % phí pool × % tham gia.
  it.each([
    [33, 0.66],
    [34, 0.68],
  ])(
    'CR STT16 — sale tham gia %i%%: feePct = 2.00%% × tỷ lệ tham gia = %f%%',
    (participationPct, expected) => {
      const rows = buildPayeeRows(
        [
          position({
            recipients: [
              {
                employee_id: 2906,
                recipient_name: 'Le Thi Uyen',
                pct_of_parent: '100.00',
                amount: '35717311',
              },
            ],
          }),
        ],
        { isCommissionType, ownerType: 'employee', ownerId: 2906, participationPct }
      )
      expect(rows[0].feePct).toBeCloseTo(expected, 10)
    }
  )

  it('excludePooled hides rows tagged with pooled_allocation_id, keeps untagged rows', () => {
    const recipients = [
      { employee_id: 13766, recipient_name: 'Sale A', pct_of_parent: '60.00', amount: '12900000' },
      {
        collaborator_id: 136,
        recipient_name: 'CTV Pooled',
        pct_of_parent: '40.00',
        amount: '8600000',
        pooled_allocation_id: 7,
      },
    ]
    const hidden = buildPayeeRows([position({ recipients })], {
      isCommissionType,
      ownerType: 'employee',
      ownerId: 13766,
      excludePooled: true,
    })
    expect(hidden.map((r) => r.name)).toEqual(['Sale A'])

    const shown = buildPayeeRows([position({ recipients })], {
      isCommissionType,
      ownerType: 'employee',
      ownerId: 13766,
    })
    expect(shown.map((r) => r.name)).toEqual(['Sale A', 'CTV Pooled'])
  })

  it('excludePooled also skips the pooled payee in the payee_holds fold (no stub child row)', () => {
    // ws164 shape: pooled CTV took the whole cut, her auto cert hold arrives via
    // payee_holds — without the skip a held stub row re-appeared under every sale.
    const pos = position({
      recipients: [
        { employee_id: 13648, recipient_name: 'Sale A', pct_of_parent: '0.00', amount: '0' },
        {
          collaborator_id: 136,
          recipient_name: 'CTV Pooled',
          pct_of_parent: '100.00',
          amount: '66668000',
          pooled_allocation_id: 8,
        },
      ],
      payee_holds: [
        {
          id: null,
          payee_type: 'collaborator',
          payee_id: 136,
          payee_name: 'CTV Pooled',
          status: 'MATERIALIZED',
          origin: 'auto_cert',
          hold_reason: 'MISSING_BROKER_CERT',
          tax_base: 'POST_TAX',
          hold_amount: '60001200',
        },
      ],
    })
    const hidden = buildPayeeRows([pos], {
      isCommissionType,
      ownerType: 'employee',
      ownerId: 13648,
      excludePooled: true,
    })
    expect(hidden.map((r) => r.name)).toEqual(['Sale A'])

    // Without excludePooled the held row still folds in (admin/debug paths).
    const shown = buildPayeeRows([pos], { isCommissionType, ownerType: 'employee', ownerId: 13648 })
    expect(shown.some((r) => r.name === 'CTV Pooled' && r.isHeld)).toBe(true)
  })
})

describe('bandHoldInfo — pooled band hold aggregate', () => {
  it('sums the pooled payee holds across groups by tax base and flags auto-cert', () => {
    const mkGroup = (code: string, holdAmount: string) => ({
      code,
      name: code,
      recipient_type: 'employee',
      recipient_id: 1,
      participationPct: null,
      positions: [
        position({
          payee_holds: [
            {
              id: null,
              payee_type: 'collaborator',
              payee_id: 136,
              origin: 'auto_cert',
              hold_reason: 'MISSING_BROKER_CERT',
              tax_base: 'POST_TAX',
              hold_amount: holdAmount,
            },
          ],
        }),
      ],
    })
    const info = bandHoldInfo(
      [mkGroup('G1', '60001200'), mkGroup('G2', '15000300')] as any,
      'collaborator-136'
    )
    expect(info.postTax).toBe(75001500)
    expect(info.preTax).toBe(0)
    expect(info.autoCert).toBe(true)
    expect(info.manual).toBe(false)
  })
})

describe('buildPayeeRows + computeRow — per-share hold beats whole-deal account hold', () => {
  it('participant CTV receiving another sale split: row uses the share hold, thực nhận never negative (UAT ws151)', async () => {
    const { computeRow } = await import('./RecipientPayoutTable')
    // Sale band: CTV 130 receives the whole 21.5M; her ACCOUNT hold is the deal-wide
    // 27,090,000 (own share 7.74M + this share 19.35M) but only 19.35M belongs here.
    const rows = buildPayeeRows(
      [
        position({
          recipients: [
            { employee_id: 13766, recipient_name: 'Sale', pct_of_parent: '0.00', amount: '0' },
            {
              collaborator_id: 130,
              recipient_name: 'CTV 130',
              pct_of_parent: '100.00',
              amount: '21500000',
              account_hold_amount: '27090000',
              account_post_tax_hold_amount: '27090000',
            },
          ],
          payee_holds: [
            {
              id: null,
              payee_type: 'collaborator',
              payee_id: 130,
              payee_name: 'CTV 130',
              status: 'MATERIALIZED',
              origin: 'auto_cert',
              hold_reason: 'MISSING_BROKER_CERT',
              tax_base: 'POST_TAX',
              hold_amount: '19350000',
            },
          ],
        }),
      ],
      { isCommissionType, ownerType: 'employee', ownerId: 13766 }
    )
    const ctv = rows.map(computeRow).find((r) => r.name === 'CTV 130')!
    expect(ctv.postTaxHold).toBe(19350000) // per-share, NOT the 27,090,000 account total
    expect(ctv.thucNhan).toBeGreaterThanOrEqual(0) // 21.5M − 2.15M PIT − 19.35M = 0
    expect(ctv.thucNhan).toBe(0)
  })
})
