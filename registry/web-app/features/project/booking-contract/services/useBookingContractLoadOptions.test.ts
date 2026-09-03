import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('@/lib/firebase', () => ({
  getFCMToken: vi.fn().mockResolvedValue(''),
  messaging: null,
}))

const mockGetProductInventoryDropdown = vi.fn()
const mockGetSalesAllocationsDropdown = vi.fn()

vi.mock('@/services/realestate-service', () => ({
  getRealEstateService: () => ({
    getProductInventoryDropdown: mockGetProductInventoryDropdown,
    getSalesAllocationsDropdown: mockGetSalesAllocationsDropdown,
  }),
}))

vi.mock('@/services/sales-service', () => ({
  getSaleService: () => ({
    getBookings: vi.fn(),
    getBooking: vi.fn(),
    getCustomerDropdown: vi.fn(),
  }),
}))

import { useBookingContractLoadOptions } from './useBookingContractLoadOptions'

describe('useBookingContractLoadOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes array of numbers for id__in when allowedProductIds is provided', async () => {
    mockGetProductInventoryDropdown
      .mockResolvedValueOnce({
        results: [{ id: 1, unit_number: 'A-101', code: 'A101' }],
        next: null,
      })
      .mockResolvedValueOnce({
        results: [
          { id: 1393, unit_number: 'B-202', code: 'B202' },
          { id: 1392, unit_number: 'B-203', code: 'B203' },
        ],
        next: null,
      })

    const { result } = renderHook(() =>
      useBookingContractLoadOptions({
        allowedProductIds: [1393, 1392],
      })
    )

    const res = await result.current.loadProductInventoryOptions({
      page: 1,
      pageSize: 10,
      query: '',
    })

    expect(mockGetProductInventoryDropdown).toHaveBeenCalledTimes(2)

    // First query: standard dropdown status filter
    expect(mockGetProductInventoryDropdown).toHaveBeenNthCalledWith(1, {
      page: 1,
      page_size: 10,
      project: undefined,
      investor: undefined,
      distribution_exchange: undefined,
      status__in: 'available,reserved',
      search: undefined,
    })

    // Second query: allowedProductIds query with number array
    expect(mockGetProductInventoryDropdown).toHaveBeenNthCalledWith(2, {
      id__in: [1393, 1392],
      page_size: 2,
    })

    expect(res.items.map((i) => i.value)).toEqual([1392, 1393, 1])
  })
})

/**
 * ClickUp 86eyqwr9u — ô "Chọn thông tin bán hàng" phải đọc `Mã - Tên`.
 *
 * Bối cảnh khiến CR này tồn tại: `search` của BE đã khớp cả mã lẫn tên từ trước (đo 26/08:
 * `search=SA-2026-0020` trả 10 dòng), nhưng dropdown chỉ in tên nên người dùng không biết
 * mã nào để gõ. Và tên bảng hàng trùng nhau rất nhiều — đo trên 100 dòng đầu của dropdown
 * thật: chỉ 91 tên khác nhau, tức 9 dòng không phân biệt được nếu chỉ nhìn tên.
 */
describe('useBookingContractLoadOptions — nhãn Thông tin bán hàng (86eyqwr9u)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const rows = [
    { id: 2176, code: 'SA-2026-002093', name: 'Bảng hàng - Dự án Vinaconex7' },
    { id: 2175, code: 'SA-2026-002092', name: 'Bảng hàng - Dự án Vinaconex7' },
  ]

  it('loadSalesAllocationOptions in "Mã - Tên", KHÔNG in mỗi tên', async () => {
    mockGetSalesAllocationsDropdown.mockResolvedValueOnce({ results: rows, next: null })

    const { result } = renderHook(() => useBookingContractLoadOptions())
    const res = await result.current.loadSalesAllocationOptions({
      page: 1,
      pageSize: 25,
      query: '',
    })

    expect(res.items.map((i) => i.label)).toEqual([
      'SA-2026-002093 - Bảng hàng - Dự án Vinaconex7',
      'SA-2026-002092 - Bảng hàng - Dự án Vinaconex7',
    ])
    // Tiền đề của cả test này: hai dòng TRÙNG TÊN. Mất tiền đề đó thì phép so trên
    // không còn chứng minh được là mã cứu được việc phân biệt.
    expect(new Set(rows.map((r) => r.name)).size).toBe(1)
    // value vẫn là id — đổi sang code là phá payload của mọi form đang dùng hook này.
    expect(res.items.map((i) => i.value)).toEqual([2176, 2175])
  })

  it('gõ mã vẫn được chuyển thẳng xuống BE qua `search`', async () => {
    mockGetSalesAllocationsDropdown.mockResolvedValueOnce({ results: [rows[0]], next: null })

    const { result } = renderHook(() => useBookingContractLoadOptions())
    await result.current.loadSalesAllocationOptions({
      page: 1,
      pageSize: 25,
      query: 'SA-2026-0020',
    })

    expect(mockGetSalesAllocationsDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'SA-2026-0020' })
    )
  })

  it('SA thiếu tên → in mỗi mã, không có đuôi " - " treo', async () => {
    mockGetSalesAllocationsDropdown.mockResolvedValueOnce({
      results: [{ id: 9, code: 'SA-2026-000009', name: '' }],
      next: null,
    })

    const { result } = renderHook(() => useBookingContractLoadOptions())
    const res = await result.current.loadSalesAllocationOptions({
      page: 1,
      pageSize: 25,
      query: '',
    })

    expect(res.items[0].label).toBe('SA-2026-000009')
  })

  it('loadInitialSalesAllocationOptions (hydrate màn Sửa / URL lọc) cũng ra "Mã - Tên"', async () => {
    mockGetSalesAllocationsDropdown.mockResolvedValueOnce({ results: [rows[0]], next: null })

    const { result } = renderHook(() => useBookingContractLoadOptions())
    const items = await result.current.loadInitialSalesAllocationOptions([2176])

    expect(items).toEqual([{ label: 'SA-2026-002093 - Bảng hàng - Dự án Vinaconex7', value: 2176 }])
    expect(mockGetSalesAllocationsDropdown).toHaveBeenCalledWith(
      expect.objectContaining({ id__in: [2176] })
    )
  })
})
