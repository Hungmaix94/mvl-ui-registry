import { describe, it, expect } from 'vitest'
import {
  extractLinkedPaymentVouchers,
  resolveAdvanceFundingSource,
} from './CommissionAdvanceDetailPage'

describe('extractLinkedPaymentVouchers', () => {
  it('returns empty array when record has no payment vouchers or lacks valid code', () => {
    expect(extractLinkedPaymentVouchers(null)).toEqual([])
    expect(extractLinkedPaymentVouchers({})).toEqual([])
    expect(extractLinkedPaymentVouchers({ paid_payment_voucher: 202 })).toEqual([])
  })

  it('extracts payment vouchers array with valid objects', () => {
    const record = {
      payment_vouchers: [
        { id: 10, code: 'PV000000010', amount: 5000000, status: 'POSTED' },
        { id: 11, code: 'PV000000011', total_amount: 3000000, status: 'DRAFT' },
      ],
    }
    const res = extractLinkedPaymentVouchers(record)
    expect(res).toHaveLength(2)
    expect(res[0]).toEqual({
      id: 10,
      code: 'PV000000010',
      amount: 5000000,
      status: 'POSTED',
    })
    expect(res[1]).toEqual({
      id: 11,
      code: 'PV000000011',
      amount: 3000000,
      status: 'DRAFT',
    })
  })

  it('extracts payment_voucher object', () => {
    const record1 = {
      payment_voucher: { id: 101, code: 'PV000000101', amount: 15000000, status: 'POSTED' },
    }
    expect(extractLinkedPaymentVouchers(record1)).toEqual([
      { id: 101, code: 'PV000000101', amount: 15000000, status: 'POSTED' },
    ])
  })

  it('deduplicates identical payment voucher IDs across fields', () => {
    const record = {
      payment_vouchers: [{ id: 101, code: 'PV000000101', amount: 1000 }],
      recipient_lines: [{ payment_voucher_detail: { id: 101, code: 'PV000000101', amount: 1000 } }],
    }
    const res = extractLinkedPaymentVouchers(record)
    expect(res).toHaveLength(1)
    expect(res[0].id).toBe(101)
  })
})

describe('resolveAdvanceFundingSource', () => {
  it('returns unapproved when the advance has no approved_at yet', () => {
    expect(resolveAdvanceFundingSource(null)).toEqual({ kind: 'unapproved' })
    expect(resolveAdvanceFundingSource({})).toEqual({ kind: 'unapproved' })
    expect(
      resolveAdvanceFundingSource({
        approved_at: null,
        funding_investor_advance_account_detail: { id: 3, balance: '990000000' },
      })
    ).toEqual({ kind: 'unapproved' })
  })

  it('returns mv when approved with no funding wallet', () => {
    expect(resolveAdvanceFundingSource({ approved_at: '2026-08-05T14:00:00Z' })).toEqual({
      kind: 'mv',
    })
  })

  it('returns wallet with its balance when approved with a funding wallet', () => {
    expect(
      resolveAdvanceFundingSource({
        approved_at: '2026-08-05T14:00:00Z',
        funding_investor_advance_account_detail: {
          id: 3,
          investor: 1,
          project: 1,
          balance: '990000000',
        },
      })
    ).toEqual({ kind: 'wallet', walletBalance: 990000000 })
  })
})
