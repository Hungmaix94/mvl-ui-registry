import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useEmployeeMonthlyKpis } from './employee-monthly-kpi-service'

vi.mock('@/hooks/useApiQuery', () => ({ useApiQuery: vi.fn() }))
vi.mock('@/api/client', () => ({ apiClient: { GET: vi.fn() }, default: { GET: vi.fn() } }))

function lastQueryCall() {
  const calls = vi.mocked(useApiQuery).mock.calls
  return calls[calls.length - 1]
}

describe('useEmployeeMonthlyKpis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes employee query parameter into query key', () => {
    const params = {
      department_monthly_kpi: 1,
      page: 1,
      page_size: 20,
      employee: 123,
    }

    useEmployeeMonthlyKpis(params, { enabled: true })

    const [queryKey, _queryFn, options] = lastQueryCall()
    expect(queryKey[3]).toBe(JSON.stringify(params))
    expect(options?.enabled).toBe(true)
  })
})
