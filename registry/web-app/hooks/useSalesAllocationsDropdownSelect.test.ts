import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('@/lib/firebase', () => ({
  getFCMToken: vi.fn().mockResolvedValue(''),
  messaging: null,
}))

const mockGetSalesAllocationsDropdown = vi.fn()
const mockGetSalesAllocation = vi.fn()

vi.mock('@/services/realestate-service', () => ({
  getRealEstateService: () => ({
    getSalesAllocationsDropdown: mockGetSalesAllocationsDropdown,
    getSalesAllocation: mockGetSalesAllocation,
  }),
}))

// `fetchQuery` thật cần QueryClientProvider; test này chỉ quan tâm tầng map nhãn nên
// cho nó gọi thẳng queryFn.
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    fetchQuery: ({ queryFn }: { queryFn: () => Promise<unknown> }) => queryFn(),
  }),
}))

import { useSalesAllocationsDropdownSelect } from './useSalesAllocationsDropdownSelect'

/**
 * ClickUp 86eyqwr9u — loader thứ ba của "Thông tin bán hàng" (dùng bởi
 * `CascadeSelectGroupSalesScope` → bộ lọc màn Đối chiếu CĐT/F2). Trước CR này repo có ba
 * loader SA và chỉ một cái in mã; gom hết về `formatCodeNameLabel` để không trôi lại.
 */
describe('useSalesAllocationsDropdownSelect — nhãn "Mã - Tên" (86eyqwr9u)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('danh sách dropdown in "Mã - Tên", value vẫn là id', async () => {
    mockGetSalesAllocationsDropdown.mockResolvedValueOnce({
      results: [
        { id: 2176, code: 'SA-2026-002093', name: 'Bảng hàng - Dự án Vinaconex7' },
        { id: 2175, code: 'SA-2026-002092', name: 'Bảng hàng - Dự án Vinaconex7' },
      ],
      next: null,
    })

    // Hook trả về mảng rỗng khi KHÔNG có scope nào — phải truyền project để nó thực sự gọi API.
    const { result } = renderHook(() => useSalesAllocationsDropdownSelect({ project: 42 }))
    const res = await result.current.loadSalesAllocationsDropdownOptions({
      page: 1,
      pageSize: 25,
      query: '',
    })

    expect(res.items.map((i) => i.label)).toEqual([
      'SA-2026-002093 - Bảng hàng - Dự án Vinaconex7',
      'SA-2026-002092 - Bảng hàng - Dự án Vinaconex7',
    ])
    expect(res.items.map((i) => i.value)).toEqual([2176, 2175])
  })

  it('SA thiếu tên → in mỗi mã; thiếu cả hai → rơi về nhãn "#id"', async () => {
    mockGetSalesAllocationsDropdown.mockResolvedValueOnce({
      results: [
        { id: 9, code: 'SA-2026-000009', name: '' },
        { id: 10, code: '', name: '' },
      ],
      next: null,
    })

    const { result } = renderHook(() => useSalesAllocationsDropdownSelect({ project: 42 }))
    const res = await result.current.loadSalesAllocationsDropdownOptions({
      page: 1,
      pageSize: 25,
      query: '',
    })

    expect(res.items.map((i) => i.label)).toEqual(['SA-2026-000009', 'Thông tin bán hàng #10'])
  })

  it('hydrate giá trị đã chọn cũng ra "Mã - Tên"', async () => {
    mockGetSalesAllocation.mockResolvedValueOnce({
      id: 2176,
      code: 'SA-2026-002093',
      name: 'Bảng hàng Dự án A',
    })

    const { result } = renderHook(() => useSalesAllocationsDropdownSelect({ project: 42 }))
    const items = await result.current.loadInitialSalesAllocationsDropdownOptions([2176])

    expect(items).toEqual([{ label: 'SA-2026-002093 - Bảng hàng Dự án A', value: 2176 }])
  })

  it('không có scope nào (chưa chọn dự án/nguồn hàng) thì KHÔNG gọi API', async () => {
    // Tiền đề của 3 test trên: chúng phải truyền `project`, nếu không phép đo chạy trên
    // nhánh trả rỗng và mọi assert nhãn thành vô nghĩa.
    const { result } = renderHook(() => useSalesAllocationsDropdownSelect({}))
    const res = await result.current.loadSalesAllocationsDropdownOptions({
      page: 1,
      pageSize: 25,
      query: '',
    })

    expect(res.items).toEqual([])
    expect(mockGetSalesAllocationsDropdown).not.toHaveBeenCalled()
  })
})
