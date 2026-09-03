import { describe, expect, it } from 'vitest'
import { summarizeCreateForMonthResults } from './payout-batch-outcome'

describe('summarizeCreateForMonthResults', () => {
  it('reports created count and navigates for an all-created response', () => {
    const res = [{ outcome: 'CREATED' }, { outcome: 'CREATED' }]
    expect(summarizeCreateForMonthResults(res)).toEqual({
      message: 'Đã tạo 2 đợt chi',
      tone: 'success',
      navigate: true,
    })
  })

  it('surfaces blocked waves alongside created ones (partial fan-out)', () => {
    const res = [{ outcome: 'CREATED' }, { outcome: 'BLOCKED' }]
    const summary = summarizeCreateForMonthResults(res)
    expect(summary.tone).toBe('success')
    expect(summary.navigate).toBe(true)
    expect(summary.message).toContain('Đã tạo 1 đợt chi')
    expect(summary.message).toContain('1 đợt đã tồn tại')
  })

  it('returns an info message without navigating for an empty result list', () => {
    expect(summarizeCreateForMonthResults([])).toEqual({
      message: 'Không có khoản nào cần chi cho tháng/đợt đã chọn',
      tone: 'info',
      navigate: false,
    })
  })

  it('unwraps a paginated envelope shape', () => {
    const res = { count: 1, results: [{ outcome: 'CREATED' }] }
    expect(summarizeCreateForMonthResults(res)).toMatchObject({
      tone: 'success',
      navigate: true,
    })
  })

  it('treats a null / unexpected payload as nothing created', () => {
    expect(summarizeCreateForMonthResults(null)).toMatchObject({
      tone: 'info',
      navigate: false,
    })
    expect(summarizeCreateForMonthResults(undefined)).toMatchObject({
      tone: 'info',
      navigate: false,
    })
  })
})
