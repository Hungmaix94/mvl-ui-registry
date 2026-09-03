import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getAccountantDashboardService } from './accountant-dashboard-service'
import { apiClient } from '@/api/client'

vi.mock('@/api/client', () => {
  return {
    apiClient: {
      GET: vi.fn(),
      POST: vi.fn(),
      PATCH: vi.fn(),
    },
    default: {
      GET: vi.fn(),
      POST: vi.fn(),
      PATCH: vi.fn(),
    },
  }
})

const COMMISSION_TREND_PATH = '/api/accounting/accountant-dashboard/commission-trend/'

describe('AccountantDashboardService.getCommissionTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the commission-trend endpoint with no query params by default', async () => {
    const mockMonths = [
      {
        year: 2026,
        month: 5,
        management: '1000000',
        sale: '2000000',
        collaborator: '3000000',
        total: '6000000',
      },
    ]
    ;(apiClient.GET as any).mockResolvedValue({
      data: { success: true, data: { months: mockMonths }, error: null },
    })

    const service = getAccountantDashboardService()
    const result = await service.getCommissionTrend()

    expect(apiClient.GET).toHaveBeenCalledTimes(1)
    expect(apiClient.GET).toHaveBeenCalledWith(COMMISSION_TREND_PATH, {
      params: { path: undefined, query: undefined },
    })
    expect(result).toEqual({ months: mockMonths })
  })

  it('forwards the year param through to the query string', async () => {
    ;(apiClient.GET as any).mockResolvedValue({
      data: { success: true, data: { months: [] }, error: null },
    })

    const service = getAccountantDashboardService()
    await service.getCommissionTrend({ year: 2025 })

    expect(apiClient.GET).toHaveBeenCalledWith(COMMISSION_TREND_PATH, {
      params: { path: undefined, query: { year: 2025 } },
    })
  })
})
