import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock openapi-fetch client trước khi import service (deal-service → base-service → @/api/client).
const getMock = vi.fn()
vi.mock('@/api/client', () => ({
  apiClient: { GET: (...args: unknown[]) => getMock(...args) },
  default: { GET: (...args: unknown[]) => getMock(...args) },
}))

import { getDealService } from '../deal-service'

describe('DealService.exportDeals', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('bóc envelope { success, data } → trả inner data để useExport đọc được task_id (bật polling)', async () => {
    // BE trả nguyên envelope; nếu KHÔNG bóc, task_id nằm ở .data.task_id → useExport đọc
    // .task_id = undefined → không setTaskId → không polling. Đây chính là bug đã fix.
    getMock.mockResolvedValue({ data: { success: true, data: { task_id: 'task-123' } } })

    const res = await getDealService().exportDeals({ async: true, delivery: 'link' })

    expect(res).toEqual({ task_id: 'task-123' })
    expect((res as { task_id?: string }).task_id).toBe('task-123')
  })

  it('nhánh delivery=link đồng bộ: trả { file_url } ở cấp cao nhất', async () => {
    getMock.mockResolvedValue({
      data: { success: true, data: { file_url: 'https://s3/report.xlsx' } },
    })

    const res = await getDealService().exportDeals({ delivery: 'link' })

    expect(res).toEqual({ file_url: 'https://s3/report.xlsx' })
  })

  it('gọi đúng endpoint /api/sales/deals/export/ với query params đang chọn', async () => {
    getMock.mockResolvedValue({ data: { success: true, data: { task_id: 't' } } })

    await getDealService().exportDeals({ async: true, delivery: 'link', deposit_year: 2025 })

    expect(getMock).toHaveBeenCalledWith('/api/sales/deals/export/', {
      params: { query: { async: true, delivery: 'link', deposit_year: 2025 } },
    })
  })

  it('ném lỗi khi response.error — không nuốt lỗi export', async () => {
    getMock.mockResolvedValue({ error: { message: 'boom' }, response: { status: 500 } })

    await expect(getDealService().exportDeals({})).rejects.toBeTruthy()
  })
})
