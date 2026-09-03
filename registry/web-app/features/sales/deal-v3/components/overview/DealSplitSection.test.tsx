import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/firebase', () => ({
  default: {},
  app: {},
  analytics: {},
  messaging: {},
  getFCMToken: vi.fn(),
  onMessageListener: vi.fn(),
}))

vi.mock('@/services/base-api-service', () => ({
  BaseApiService: class {},
}))

vi.mock('@/api/client', () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn() },
  default: { GET: vi.fn(), POST: vi.fn() },
}))

import { getShareContribPct } from './DealSplitSection'

describe('DealSplitSection — getShareContribPct & totalParticipate', () => {
  it('đọc đúng contribution_percentage từ share details', () => {
    const share = {
      details: {
        pct_sale_commission: {
          contribution_percentage: 60,
        },
      },
    }
    expect(getShareContribPct(share)).toBe(60)
  })

  it('fallback sang participation_percentage / percentage từ revenue allocation khi details không có', () => {
    const share = {
      details: {},
    }
    const alloc = {
      participation_percentage: 40,
    }
    expect(getShareContribPct(share, alloc)).toBe(40)
  })

  it('fallback sang share.contribution_percentage khi các nguồn khác trống', () => {
    const share = {
      contribution_percentage: 100,
    }
    expect(getShareContribPct(share)).toBe(100)
  })

  it('trả về null khi không tìm thấy thông tin % tham gia', () => {
    expect(getShareContribPct(null)).toBeNull()
    expect(getShareContribPct({})).toBeNull()
  })
})
