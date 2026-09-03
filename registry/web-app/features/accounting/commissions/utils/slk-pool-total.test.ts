import { describe, it, expect } from 'vitest'
import { buildSlkPoolRows } from './slk-pool-utils'
import type { F2SourcePool } from './slk-pool-utils'
import type { LinkedExchangeMonthlyCommission } from '@/features/accounting/linked-exchange-monthly-commissions/services/linked-exchange-monthly-commission-service'
import { F2Source as F2Source } from '@/constants/api-schema-aliases'

/**
 * `buildSlkPoolRows` must stay a pure rename of `summary.pools`.
 *
 * Every figure here used to be derived in the browser — revenue summed per director off the
 * revenue-line list, `poolTotal` multiplied as `revenue × pct_total`, `poolAmount` summed from
 * `payout[]`. That is a second money path outside `distribute()`, so these tests feed numbers
 * that CANNOT be reproduced by the old arithmetic: if anyone reintroduces a multiplication,
 * the expectations below stop matching.
 */
function pool(over: Partial<F2SourcePool> = {}): F2SourcePool {
  return {
    pool_key: 'director-13762',
    source_type: F2Source.director,
    director: { id: 13762, fullname: 'GĐKD A' },
    revenue: '74229547',
    commission_rate: '6.000000',
    pool_total: '4453773',
    pool_amount: '4453773',
    ratio_state: 'entered',
    payout: [],
    ...over,
  } as unknown as F2SourcePool
}

const summaryWith = (pools: F2SourcePool[]) =>
  ({ pools }) as unknown as LinkedExchangeMonthlyCommission

describe('buildSlkPoolRows', () => {
  it('lấy nguyên doanh thu / tỷ lệ / pool của từng pool từ BE, không tự tính lại', () => {
    const [row] = buildSlkPoolRows(summaryWith([pool()]))

    expect(row.poolKey).toBe('director-13762')
    expect(row.revenue).toBe(74229547)
    expect(row.ratePct).toBe(6)
    expect(row.poolTotal).toBe(4453773)
    expect(row.poolAmount).toBe(4453773)
    expect(row.directorId).toBe(13762)
    expect(row.directorName).toBe('GĐKD A')
  })

  it('pool chưa nhập tỷ lệ vẫn hiện doanh thu và pool dự kiến, chưa chi đồng nào', () => {
    const [row] = buildSlkPoolRows(
      summaryWith([pool({ ratio_state: 'pending', pool_amount: '0', payout: [] })])
    )

    expect(row.ratioState).toBe('pending')
    expect(row.poolAmount).toBe(0)
    expect(row.poolTotal).toBe(4453773)
    expect(row.revenue).toBe(74229547)
  })

  it('KHÔNG suy pool_total ra từ revenue × rate — số của BE thắng', () => {
    // BE settle 4.453.774 (làm tròn của nó), phép nhân ở client sẽ ra 4.453.772,82 → 4.453.773.
    // Nếu ai đó nhân lại, con số hiển thị sẽ lệch một đồng so với thứ đã ghi sổ.
    const [row] = buildSlkPoolRows(
      summaryWith([pool({ pool_total: '4453774', pool_amount: '4453774' })])
    )

    expect(row.poolTotal).toBe(4453774)
    expect(row.poolAmount).toBe(4453774)
  })

  it('giữ nguyên thứ tự và số lượng pool BE trả về', () => {
    const rows = buildSlkPoolRows(
      summaryWith([
        pool({
          pool_key: 'linked',
          source_type: F2Source.linked,
          director: null,
          ratio_state: 'by-rule',
        }),
        pool({
          pool_key: 'director-107',
          director: { id: 107, fullname: 'GĐKD B' },
        } as Partial<F2SourcePool>),
      ])
    )

    expect(rows.map((r) => r.poolKey)).toEqual(['linked', 'director-107'])
    expect(rows[0].ratioState).toBe('by-rule')
    expect(rows[0].directorId).toBeNull()
    expect(rows[1].directorId).toBe(107)
  })

  it('kỳ chưa có pool nào thì trả mảng rỗng, không nổ', () => {
    expect(buildSlkPoolRows({} as unknown as LinkedExchangeMonthlyCommission)).toEqual([])
  })
})
