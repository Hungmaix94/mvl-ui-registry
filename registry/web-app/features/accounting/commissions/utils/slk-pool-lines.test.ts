import { describe, it, expect } from 'vitest'
import { linesForPool, parsePoolKey, buildSlkPoolRows } from './slk-pool-utils'
import type {
  LinkedExchangeMonthlyCommission,
  SlkRevenueLine,
} from '@/features/accounting/linked-exchange-monthly-commissions/services/linked-exchange-monthly-commission-service'
import { F2Source as F2Source } from '@/constants/api-schema-aliases'

/** One line per pool track, so every predicate branch has something to reject. */
const LINES = [
  { f2_source: F2Source.linked, f2_source_director: null, slk_revenue: '10' },
  { f2_source: F2Source.company, f2_source_director: null, slk_revenue: '20' },
  {
    f2_source: F2Source.director,
    f2_source_director: 13762,
    f2_source_director_detail: { fullname: 'GĐKD A' },
    slk_revenue: '30',
  },
  {
    f2_source: F2Source.director,
    f2_source_director: 999,
    f2_source_director_detail: { fullname: 'GĐKD B' },
    slk_revenue: '40',
  },
] as unknown as SlkRevenueLine[]

const revenueOf = (lines: SlkRevenueLine[]) =>
  lines.reduce((sum, l) => sum + Number(l.slk_revenue), 0)

describe('linesForPool', () => {
  it('keeps only the director being viewed, not every director line', () => {
    const lines = linesForPool(LINES, parsePoolKey('director-13762'))

    expect(lines).toHaveLength(1)
    expect(lines[0].f2_source_director).toBe(13762)
  })

  it('keeps the linked track without leaking the company or director lines', () => {
    expect(linesForPool(LINES, parsePoolKey('linked'))).toHaveLength(1)
    expect(revenueOf(linesForPool(LINES, parsePoolKey('linked')))).toBe(10)
  })

  it('keeps the company track only', () => {
    expect(revenueOf(linesForPool(LINES, parsePoolKey('company')))).toBe(20)
  })

  it('returns nothing for an unparseable pool key instead of showing every transaction', () => {
    expect(linesForPool(LINES, parsePoolKey('director-0'))).toEqual([])
    expect(linesForPool(LINES, null)).toEqual([])
  })

  it('sums to the same revenue the pool row shows — the invariant the screen relies on', () => {
    // The pool figures now come from the BE while this table still filters the raw lines, so
    // the two groupings have to agree. That is exactly what this asserts: BE `split_revenue_tracks`
    // (NULL source counts as LINKED, director lines group by director) vs `linesForPool` here.
    const summary = {
      pools: [
        { pool_key: 'linked', source_type: F2Source.linked, director: null, revenue: '10', commission_rate: '6.000000', pool_total: '1', pool_amount: '1', ratio_state: 'by-rule', payout: [] },
        { pool_key: 'company', source_type: F2Source.company, director: null, revenue: '20', commission_rate: '6.000000', pool_total: '1', pool_amount: '1', ratio_state: 'entered', payout: [] },
        { pool_key: 'director-13762', source_type: F2Source.director, director: { id: 13762, fullname: 'GĐKD A' }, revenue: '30', commission_rate: '6.000000', pool_total: '2', pool_amount: '2', ratio_state: 'entered', payout: [] },
        { pool_key: 'director-999', source_type: F2Source.director, director: { id: 999, fullname: 'GĐKD B' }, revenue: '40', commission_rate: '6.000000', pool_total: '2', pool_amount: '2', ratio_state: 'entered', payout: [] },
      ],
    } as unknown as LinkedExchangeMonthlyCommission

    const rows = buildSlkPoolRows(summary)

    for (const row of rows) {
      expect(revenueOf(linesForPool(LINES, parsePoolKey(row.poolKey)))).toBe(row.revenue)
    }
  })
})
