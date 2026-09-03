import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { apiClient } from '@/api/client'
import { getReceiptVoucherService } from './receipt-voucher-service'

vi.mock('@/hooks/useApiQuery', () => ({ useApiQuery: vi.fn(), useApiMutation: vi.fn() }))
vi.mock('@/api/client', () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  default: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}))

const postMock = apiClient.POST as unknown as Mock

function lastPostPayload() {
  const calls = postMock.mock.calls
  return calls[calls.length - 1][1] as {
    body?: Record<string, unknown>
    params?: { path?: { id?: number } }
  }
}

describe('ReceiptVoucherService.postReceiptVoucher — acknowledge_large_variance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    postMock.mockResolvedValue({ data: { success: true, data: {} } })
  })

  // BE khai field này BẮT BUỘC trong body ghi sổ. Lần bấm ĐẦU phải gửi `false` tường minh (không
  // phải body rỗng) để BE còn bắn được 400 `collection_variance_exceeds_limit` hỏi lại kế toán.
  it('gửi false tường minh khi nơi gọi không truyền gì', async () => {
    await getReceiptVoucherService().postReceiptVoucher(42)

    expect(lastPostPayload().body).toEqual({ acknowledge_large_variance: false })
    expect(lastPostPayload().params?.path).toEqual({ id: 42 })
  })

  it('gửi true khi kế toán đã xác nhận chênh lệch lớn (lần bấm thứ hai)', async () => {
    await getReceiptVoucherService().postReceiptVoucher(42, { acknowledge_large_variance: true })

    expect(lastPostPayload().body).toEqual({ acknowledge_large_variance: true })
  })
})
