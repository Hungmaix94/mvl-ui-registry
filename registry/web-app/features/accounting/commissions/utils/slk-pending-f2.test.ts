import { describe, it, expect } from 'vitest'
import { pendingF2Deals, pendingF2ForPool, parsePoolKey } from './slk-pool-utils'
import type { LinkedExchangeMonthlyCommission } from '@/features/accounting/linked-exchange-monthly-commissions/services/linked-exchange-monthly-commission-service'
import { F2Source as F2Source } from '@/constants/api-schema-aliases'

/** Two directors pending in the same period — so a pool filter has something to reject. */
const SUMMARY = {
  director_deals_pending_f2: [
    {
      deal_id: 2898,
      deal_code: 'HD06-2026-001781',
      exchange_id: 1933,
      exchange_name: 'EX000001933 - Sàn Vũ Hoàng',
      f2_reconciliation_id: 224,
      f2_status: 'draft',
      director_id: 107,
    },
    {
      deal_id: 2856,
      deal_code: 'HD06-2026-001752',
      exchange_id: 1896,
      exchange_name: 'EX000001896 - Sàn T123',
      f2_reconciliation_id: 205,
      f2_status: 'draft',
      director_id: 13762,
    },
  ],
} as unknown as LinkedExchangeMonthlyCommission

describe('pendingF2Deals', () => {
  it('returns the advisory rows of the statement', () => {
    expect(pendingF2Deals(SUMMARY)).toHaveLength(2)
  })

  it('returns an empty array when the field is absent (list responses skip it)', () => {
    expect(pendingF2Deals({} as LinkedExchangeMonthlyCommission)).toEqual([])
  })
})

describe('pendingF2ForPool', () => {
  it('keeps only the director being viewed', () => {
    const rows = pendingF2ForPool(SUMMARY, parsePoolKey('director-107'))

    expect(rows).toHaveLength(1)
    expect(rows[0].f2_reconciliation_id).toBe(224)
  })

  it('returns nothing for a director with no pending deal', () => {
    expect(pendingF2ForPool(SUMMARY, parsePoolKey('director-999'))).toEqual([])
  })

  it('returns nothing for the LINKED and COMPANY tracks — the advisory is director-only', () => {
    expect(pendingF2ForPool(SUMMARY, parsePoolKey('linked'))).toEqual([])
    expect(pendingF2ForPool(SUMMARY, parsePoolKey('company'))).toEqual([])
  })

  it('returns nothing for an unparseable pool key', () => {
    expect(pendingF2ForPool(SUMMARY, parsePoolKey('director-'))).toEqual([])
    expect(pendingF2ForPool(SUMMARY, null)).toEqual([])
  })

  it('does not treat a director pool as matching a row with a null director', () => {
    const summary = {
      director_deals_pending_f2: [{ ...SUMMARY.director_deals_pending_f2[0], director_id: null }],
    } as unknown as LinkedExchangeMonthlyCommission

    expect(pendingF2ForPool(summary, { sourceType: F2Source.director, directorId: 107 })).toEqual(
      []
    )
  })
})
