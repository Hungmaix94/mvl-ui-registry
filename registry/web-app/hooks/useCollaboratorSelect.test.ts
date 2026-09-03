import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCollaboratorSelect } from './useCollaboratorSelect'

const { getCollaboratorsDropdownMock, fetchQueryMock } = vi.hoisted(() => ({
  getCollaboratorsDropdownMock: vi.fn(),
  fetchQueryMock: vi.fn(),
}))

vi.mock('@/features/accounting/collaborators/services/collaborator-service.ts', () => ({
  collaboratorService: { getCollaboratorsDropdown: getCollaboratorsDropdownMock },
}))

// `fetchQuery` chỉ là lớp cache quanh queryFn — cho chạy thẳng queryFn để test đúng params gửi đi.
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ fetchQuery: fetchQueryMock }),
}))

const HOANG = {
  id: 1,
  code: 'CTV000000001',
  name: 'Nguyễn Văn Hoàng',
  phone: '0901234567',
  id_number: '079123456789',
}

const LOAD_PARAMS = { page: 1, pageSize: 20 }

/** Params thực sự gửi lên API, lấy từ queryFn mà hook truyền vào `fetchQuery`. */
function lastRequestParams() {
  const calls = getCollaboratorsDropdownMock.mock.calls
  return calls.at(-1)?.[0]
}

/** `staleTime` mà hook yêu cầu react-query dùng cho lần fetch gần nhất. */
function lastStaleTime() {
  return fetchQueryMock.mock.calls.at(-1)?.[0]?.staleTime
}

function setup() {
  fetchQueryMock.mockImplementation(({ queryFn }: { queryFn: () => unknown }) => queryFn())
  return renderHook(() => useCollaboratorSelect()).result
}

describe('useCollaboratorSelect — nguồn options CTV qua endpoint dropdown', () => {
  beforeEach(() => {
    getCollaboratorsDropdownMock.mockReset()
    fetchQueryMock.mockReset()
  })

  // Endpoint dropdown trả payload gọn và `search` của nó khớp cả mã / họ tên / CCCD, nên không
  // cần gọi endpoint list nặng (trước đây còn kèm một query page_size=100 không ai dùng).
  it('gọi endpoint dropdown với `search` và dựng nhãn kèm CCCD cho dòng dropdown', async () => {
    getCollaboratorsDropdownMock.mockResolvedValue({ results: [HOANG], next: null })

    const result = setup()
    const loaded = await result.current.loadCollaboratorOptions({
      ...LOAD_PARAMS,
      query: 'Nguyễn Văn Hoàng',
    })

    expect(getCollaboratorsDropdownMock).toHaveBeenCalledTimes(1)
    expect(lastRequestParams()).toEqual({
      search: 'Nguyễn Văn Hoàng',
      page: 1,
      page_size: 20,
    })
    expect(loaded.items).toEqual([
      {
        value: '1',
        label: 'CTV000000001 - Nguyễn Văn Hoàng',
        optionLabel: 'CTV000000001 - Nguyễn Văn Hoàng - CCCD: 079123456789',
      },
    ])
    expect(loaded.hasNextPage).toBe(false)
    expect(loaded.nextPage).toBeNull()
  })

  it('tìm theo CCCD chỉ cần một request `search` duy nhất', async () => {
    getCollaboratorsDropdownMock.mockResolvedValue({ results: [HOANG], next: null })

    const result = setup()
    const loaded = await result.current.loadCollaboratorOptions({
      ...LOAD_PARAMS,
      query: '079123456789',
    })

    expect(getCollaboratorsDropdownMock).toHaveBeenCalledTimes(1)
    expect(lastRequestParams()).toEqual({ search: '079123456789', page: 1, page_size: 20 })
    expect(loaded.items).toHaveLength(1)
  })

  // Người dùng tạo CTV mới ở tab khác rồi quay lại mở dropdown với CÙNG từ khoá: còn cache "tươi"
  // thì `fetchQuery` trả cache và CTV vừa tạo không xuất hiện — hỏng đúng luồng CR STT26.
  it('nhánh tìm kiếm KHÔNG được dùng cache cũ (staleTime = 0)', async () => {
    getCollaboratorsDropdownMock.mockResolvedValue({ results: [HOANG], next: null })

    const result = setup()
    await result.current.loadCollaboratorOptions({ ...LOAD_PARAMS, query: 'Hoàng' })

    expect(lastStaleTime()).toBe(0)
  })

  it('nạp nhãn theo id vẫn được cache (nhãn CTV gần như không đổi)', async () => {
    getCollaboratorsDropdownMock.mockResolvedValue({ results: [HOANG], next: null })

    const result = setup()
    await result.current.loadInitialCollaboratorOptions([1])

    expect(lastStaleTime()).toBeGreaterThan(0)
  })

  it('không gửi `search` khi chưa gõ gì (tránh `search=` rỗng)', async () => {
    getCollaboratorsDropdownMock.mockResolvedValue({ results: [HOANG], next: null })

    const result = setup()
    await result.current.loadCollaboratorOptions({ ...LOAD_PARAMS, query: '' })

    expect(lastRequestParams()).toEqual({ page: 1, page_size: 20 })
  })

  it('còn trang sau thì trả `nextPage` để cuộn vô hạn chạy tiếp', async () => {
    getCollaboratorsDropdownMock.mockResolvedValue({ results: [HOANG], next: 'http://api/next' })

    const result = setup()
    const loaded = await result.current.loadCollaboratorOptions({ ...LOAD_PARAMS, query: 'a' })

    expect(loaded.hasNextPage).toBe(true)
    expect(loaded.nextPage).toBe(2)
  })

  it('trả danh sách rỗng khi API lỗi (dropdown không vỡ)', async () => {
    getCollaboratorsDropdownMock.mockRejectedValue(new Error('500'))

    const result = setup()
    const loaded = await result.current.loadCollaboratorOptions({ ...LOAD_PARAMS, query: 'abc' })

    expect(loaded).toEqual({ items: [], hasNextPage: false, nextPage: null })
  })

  // Rỗng-vì-lỗi và rỗng-vì-không-có phải phân biệt được, nếu không empty-state sẽ mời tạo mới và
  // người dùng tạo trùng một CTV đã tồn tại.
  it('ghi cờ `hasLoadFailed` khi tải lỗi và xoá cờ khi tải lại thành công', async () => {
    getCollaboratorsDropdownMock.mockRejectedValueOnce(new Error('500'))

    const result = setup()
    expect(result.current.hasLoadFailed()).toBe(false)

    await result.current.loadCollaboratorOptions({ ...LOAD_PARAMS, query: 'abc' })
    expect(result.current.hasLoadFailed()).toBe(true)

    getCollaboratorsDropdownMock.mockResolvedValueOnce({ results: [HOANG], next: null })
    await result.current.loadCollaboratorOptions({ ...LOAD_PARAMS, query: 'abc' })
    expect(result.current.hasLoadFailed()).toBe(false)
  })

  // Trước đây mỗi id là một request chi tiết; form nhiều dòng chia sẽ bắn N request khi mở.
  it('nạp option ban đầu bằng MỘT request `id__in` cho mọi id', async () => {
    getCollaboratorsDropdownMock.mockResolvedValue({ results: [HOANG], next: null })

    const result = setup()
    const options = await result.current.loadInitialCollaboratorOptions([1, 2])

    expect(getCollaboratorsDropdownMock).toHaveBeenCalledTimes(1)
    expect(lastRequestParams()).toEqual({ id__in: [1, 2], page_size: 2 })
    expect(options).toEqual([
      {
        value: '1',
        label: 'CTV000000001 - Nguyễn Văn Hoàng',
        optionLabel: 'CTV000000001 - Nguyễn Văn Hoàng - CCCD: 079123456789',
      },
    ])
  })

  it('bỏ qua id rỗng/không hợp lệ và không gọi API', async () => {
    const result = setup()

    expect(await result.current.loadInitialCollaboratorOptions([])).toEqual([])
    expect(await result.current.loadInitialCollaboratorOptions(['', 'abc'])).toEqual([])
    expect(getCollaboratorsDropdownMock).not.toHaveBeenCalled()
  })
})
