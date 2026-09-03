import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { apiClient } from '@/api/client'
import { getEmployeeRoleService } from './employee-role-service'

// Chỉ kiểm phần dựng request — stub React Query để import module không kéo theo provider.
vi.mock('@/hooks/useApiQuery', () => ({ useApiQuery: vi.fn(), useApiMutation: vi.fn() }))
// Client thật kéo theo middleware → notification store → vòng lặp import khiến BaseApiService
// undefined lúc khởi tạo module.
vi.mock('@/api/client', () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn() },
  default: { GET: vi.fn(), POST: vi.fn() },
}))

// `apiClient.POST` generic trên mọi path trong schema — đọc call tuple qua `vi.mocked` sẽ nổ
// ngân sách type-instantiation (TS2589). Lấy handle lỏng cho assertion.
const postMock = apiClient.POST as unknown as Mock

function lastPostBody() {
  const calls = postMock.mock.calls
  return (calls[calls.length - 1][1] as { body?: Record<string, unknown> }).body
}

describe('EmployeeRoleService.bulkUpdateEmployeeRoles — namespace bắt buộc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    postMock.mockResolvedValue({ data: { success: true, data: {} } })
  })

  // `namespace` có `@default erp` ở BE nhưng openapi-typescript sinh ra là BẮT BUỘC; thiếu nó thì
  // đổi vai trò (hàng loạt lẫn từng người) không compile được và BE cũng trả 400.
  it('điền namespace mặc định `erp` khi nơi gọi không truyền', async () => {
    await getEmployeeRoleService().bulkUpdateEmployeeRoles({
      employee_ids: [11, 22],
      new_role_id: 7,
    })

    expect(lastPostBody()).toEqual({
      employee_ids: [11, 22],
      new_role_id: 7,
      namespace: 'erp',
    })
  })

  it('giữ nguyên namespace nơi gọi truyền vào (không ghi đè bằng mặc định)', async () => {
    await getEmployeeRoleService().bulkUpdateEmployeeRoles({
      employee_ids: [11],
      new_role_id: 7,
      namespace: 'other',
    })

    expect(lastPostBody()).toMatchObject({ namespace: 'other' })
  })
})
