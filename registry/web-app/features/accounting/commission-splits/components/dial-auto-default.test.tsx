// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Chỉ test helper thuần + badge. Module cha kéo theo service/store (BaseApiService
// vòng import) nên stub cho gọn — mạng không nằm trong phạm vi test này.
vi.mock('../services/commission-splits-service', () => ({
  useSetPeriodProgress: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/services/toast-service', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import { dialDeviates2dp } from './PaymentProgressTimeline'
import RevenueRecomputeBadge from '@/features/accounting/accounting-periods/components/RevenueRecomputeBadge'

/** Cap thật của một căn có thật — BE lưu numeric(14,10). */
const DEFAULT_10DP = 21.8181818182

describe('dialDeviates2dp — so lệch dial vs auto-default ở 2dp (khớp BE dial_deviates)', () => {
  it('gõ tay 21,82 khi default 21,8181818182 KHÔNG tính là lệch (kế toán chỉ nhập được 2dp)', () => {
    expect(dialDeviates2dp(21.82, DEFAULT_10DP)).toBe(false)
  })

  it('dial đúng bằng default 10dp (prefill nguyên vẹn) không lệch', () => {
    expect(dialDeviates2dp(DEFAULT_10DP, DEFAULT_10DP)).toBe(false)
  })

  it('hạ dial xuống 10 khi default 21,82 là lệch — sẽ đòi giải trình', () => {
    expect(dialDeviates2dp(10, DEFAULT_10DP)).toBe(true)
  })

  it('lệch đúng 1 đơn vị 2dp (21,81 vs 21,82) vẫn tính là lệch', () => {
    expect(dialDeviates2dp(21.81, DEFAULT_10DP)).toBe(true)
  })

  it('thiếu default (BE chưa trả / không có trần) thì không có mốc để lệch', () => {
    expect(dialDeviates2dp(10, null)).toBe(false)
    expect(dialDeviates2dp(null, DEFAULT_10DP)).toBe(false)
  })
})

describe('RevenueRecomputeBadge — cờ dirty doanh thu/KPI của kỳ', () => {
  it('kỳ dirty hiện chip "Cần tính lại"', () => {
    render(<RevenueRecomputeBadge period={{ revenue_recompute_needed: true }} />)
    expect(screen.getByText('Cần tính lại')).toBeTruthy()
  })

  it('kỳ sạch / thiếu field (BE chưa deploy) không render gì', () => {
    render(<RevenueRecomputeBadge period={{}} />)
    render(<RevenueRecomputeBadge period={null} />)
    expect(screen.queryByText('Cần tính lại')).toBeNull()
  })
})
