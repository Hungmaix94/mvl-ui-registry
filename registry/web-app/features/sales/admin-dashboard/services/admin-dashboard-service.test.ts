import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Chặn ở LỚP CHA, không chặn ở export của chính module.
 *
 * `useAdminDashboardAllTransactionsByProject` gọi `getAdminDashboardService()` trong cùng
 * module, nên `vi.mock` lên chính module đó không xen vào được — nó chỉ đổi thứ mà file khác
 * import. Chặn `BaseApiService` thì bắt được đúng lượt gọi HTTP thật sự, và cũng tránh luôn
 * lỗi "Class extends value undefined" (base-service kéo theo openapi-fetch client + env).
 */
const stub = vi.hoisted(() => ({ calls: [] as { path: string; query: unknown }[] }))

vi.mock('@/api/base-service', () => ({
  BaseApiService: class {
    async get(path: string, init?: { query?: unknown }) {
      stub.calls.push({ path, query: init?.query })
      return undefined
    }
  },
}))

/** `useApiQuery` thật cần React + QueryClient; ở đây chỉ cần giữ lại queryFn để gọi thẳng. */
vi.mock('@/hooks/useApiQuery', () => ({
  useApiQuery: (queryKey: unknown[], queryFn: () => unknown) => ({ queryKey, queryFn }),
}))

// Imported after the mocks above are registered.
import {
  useAdminDashboardAllPerformance,
  useAdminDashboardAllTransactionsByProject,
} from './admin-dashboard-service'

const lastQuery = () => stub.calls.at(-1)?.query as Record<string, unknown> | undefined

/**
 * `useApiQuery` bị mock ở trên nên lúc CHẠY hook trả về `{ queryKey, queryFn }`, còn TypeScript
 * vẫn thấy chữ ký thật (`UseQueryResult`). Ép kiểu đúng một chỗ ở đây thay vì rải `as any` khắp
 * từng test — và ép ở hàm này thì nếu mock đổi hình dạng, mọi test đều đỏ cùng lúc.
 */
const callHook = (params: Parameters<typeof useAdminDashboardAllTransactionsByProject>[0]) =>
  useAdminDashboardAllTransactionsByProject(params) as unknown as {
    queryFn: () => Promise<unknown>
  }

const callPerformanceHook = (params: Parameters<typeof useAdminDashboardAllPerformance>[0]) =>
  useAdminDashboardAllPerformance(params) as unknown as { queryFn: () => Promise<unknown> }

describe('useAdminDashboardAllPerformance', () => {
  beforeEach(() => {
    stub.calls.length = 0
  })

  it('gửi page_size=0 — hợp đồng "trả hết" của BE, không phân trang', async () => {
    // Khối "Hiệu suất theo tổ chức" cũng là biểu đồ XẾP HẠNG: cắt trang là xếp hạng sai, vì
    // tổ chức đứng đầu hoàn toàn có thể nằm ở trang 2 mà biểu đồ vẫn nhìn như đầy đủ.
    const { queryFn } = callPerformanceHook({ from: '2026-08-01', to: '2026-08-31' })
    await queryFn()

    expect(stub.calls).toHaveLength(1)
    expect(lastQuery()).toMatchObject({ from: '2026-08-01', page_size: 0 })
    expect(lastQuery()).not.toHaveProperty('page')
  })
})

describe('useAdminDashboardAllTransactionsByProject', () => {
  beforeEach(() => {
    stub.calls.length = 0
  })

  it('gửi page_size=0 — hợp đồng "trả hết" của BE, không phân trang', async () => {
    // Khối "Giao dịch theo dự án" là biểu đồ XẾP HẠNG: cắt trang là xếp hạng sai, vì dự án
    // lớn nhất hoàn toàn có thể nằm ở trang 2. Thiếu `page_size` thì BE trả 10 dòng đầu và
    // biểu đồ nhìn vẫn như đầy đủ — hỏng im lặng, không có gì trên màn hình báo.
    const { queryFn } = callHook({ from: '2026-01-01' })
    await queryFn()

    expect(stub.calls).toHaveLength(1)
    expect(lastQuery()).toMatchObject({ from: '2026-01-01', page_size: 0 })
  })

  it('không gửi `page` — một request duy nhất, không đi vòng từng trang như bản cũ', async () => {
    const { queryFn } = callHook({ from: '2026-01-01' })
    await queryFn()

    expect(stub.calls).toHaveLength(1)
    expect(lastQuery()).not.toHaveProperty('page')
  })

  it('chuyển tiếp nguyên vẹn bộ lọc nhiều dự án', async () => {
    const { queryFn } = callHook({ project__in: [7, 9] })
    await queryFn()

    expect(lastQuery()).toMatchObject({ project__in: [7, 9] })
  })
})
