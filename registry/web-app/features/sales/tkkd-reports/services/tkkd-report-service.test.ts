import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useApiQuery } from '@/hooks/useApiQuery'
import {
  useTkkdProjectBlockMatrix,
  useTkkdRevenueGoodsByProject,
  type TkkdRevenueGoodsParams,
} from './tkkd-report-service'

// The hooks are exercised for their `enabled` gate only, so React Query is stubbed out
// and the hook bodies run as plain functions (no renderer / provider needed).
vi.mock('@/hooks/useApiQuery', () => ({ useApiQuery: vi.fn() }))
// The real client pulls in middlewares → notification store → a service-class import
// cycle that leaves BaseApiService undefined at module init. The query function is never
// called here, so a stub client is enough.
vi.mock('@/api/client', () => ({ apiClient: { GET: vi.fn() }, default: { GET: vi.fn() } }))

/** Third argument (the query options) of the last `useApiQuery` call. */
function lastQueryOptions() {
  const calls = vi.mocked(useApiQuery).mock.calls
  return calls[calls.length - 1][2]
}

const WEEK_PARAMS = { period_type: 'week', week: '2026-07-06' } as TkkdRevenueGoodsParams
const MONTH_PARAMS = { year: 2026, month: 7 } as TkkdRevenueGoodsParams

describe('TKKD report query hooks — enabled gate (86euvmaba)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Regression: gating on year+month disabled every query in week mode, so the
  // matrix page never fetched and showed an empty table.
  it('enables the matrix query in week mode (no year/month)', () => {
    useTkkdProjectBlockMatrix(WEEK_PARAMS)
    expect(lastQueryOptions()?.enabled).toBe(true)
  })

  it('enables the matrix query in month mode', () => {
    useTkkdProjectBlockMatrix(MONTH_PARAMS)
    expect(lastQueryOptions()?.enabled).toBe(true)
  })

  it('disables the query when params are not resolved yet', () => {
    useTkkdProjectBlockMatrix(undefined)
    expect(lastQueryOptions()?.enabled).toBe(false)
  })

  it('still honours an explicit enabled: false from the caller', () => {
    useTkkdProjectBlockMatrix(WEEK_PARAMS, { enabled: false })
    expect(lastQueryOptions()?.enabled).toBe(false)
  })

  it('applies the same gate to the revenue-goods reports', () => {
    useTkkdRevenueGoodsByProject(WEEK_PARAMS)
    expect(lastQueryOptions()?.enabled).toBe(true)

    useTkkdRevenueGoodsByProject(undefined)
    expect(lastQueryOptions()?.enabled).toBe(false)
  })
})
