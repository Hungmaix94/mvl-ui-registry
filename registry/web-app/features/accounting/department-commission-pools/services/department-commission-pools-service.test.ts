import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getDepartmentCommissionPoolsService } from './department-commission-pools-service'
import { apiClient } from '@/api/client'

vi.mock('@/api/client', () => {
  return {
    apiClient: {
      GET: vi.fn(),
      POST: vi.fn(),
    },
    default: {
      GET: vi.fn(),
      POST: vi.fn(),
    },
  }
})

describe('rebuildPools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts year/month to the rebuild path and returns the result envelope', async () => {
    const result = { rebuilt: 2, pool_ids: [7, 9] }
    ;(apiClient.POST as any).mockResolvedValue({
      data: { success: true, data: result, error: null },
    })

    const service = getDepartmentCommissionPoolsService()
    const out = await service.rebuildPools({ year: 2026, month: 5 })

    expect(apiClient.POST).toHaveBeenCalledTimes(1)
    const [path, payload] = (apiClient.POST as any).mock.calls[0]
    expect(path).toBe('/api/accounting/department-commission-pools/rebuild/')
    expect(payload.body).toEqual({ year: 2026, month: 5 })
    expect(out).toEqual(result)
  })

  it('surfaces the API error (e.g. period locked) instead of returning data', async () => {
    ;(apiClient.POST as any).mockResolvedValue({
      data: undefined,
      error: { success: false, data: null, error: { message: 'Kỳ đã đóng' } },
    })

    const service = getDepartmentCommissionPoolsService()
    await expect(service.rebuildPools({ year: 2026, month: 5 })).rejects.toThrow('Kỳ đã đóng')
  })
})
