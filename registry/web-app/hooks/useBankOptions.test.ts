import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useBankOptions from './useBankOptions'

const { useBanksMock } = vi.hoisted(() => ({ useBanksMock: vi.fn() }))

vi.mock('@/services/common-service', () => ({
  useBanks: useBanksMock,
}))

function mockBanks(results: { name: string; code: string }[]) {
  useBanksMock.mockReturnValue({ data: { results }, isLoading: false })
}

const BANKS = [
  { name: 'Ngân hàng Đầu tư và Phát triển Việt Nam', code: 'BIDV' },
  { name: 'Ngân hàng TMCP Ngoại thương Việt Nam', code: 'Vietcombank' },
]

describe('useBankOptions (86eycw5xu)', () => {
  beforeEach(() => {
    useBanksMock.mockReset()
  })

  it('hiển thị "[viết tắt] - [tên chính thống]" và lưu tên chính thống', () => {
    mockBanks(BANKS)

    const { result } = renderHook(() => useBankOptions())

    expect(result.current.bankOptions).toEqual([
      {
        value: 'Ngân hàng Đầu tư và Phát triển Việt Nam',
        label: 'BIDV - Ngân hàng Đầu tư và Phát triển Việt Nam',
      },
      {
        value: 'Ngân hàng TMCP Ngoại thương Việt Nam',
        label: 'Vietcombank - Ngân hàng TMCP Ngoại thương Việt Nam',
      },
    ])
  })

  // Bản ghi cũ nhập tay không khớp danh mục. Select bỏ qua value lạ và hiện placeholder
  // rỗng, nên nếu không giữ lại thì mở form sửa sẽ mất tên ngân hàng đã lưu.
  it('giữ lại giá trị cũ không khớp danh mục làm một lựa chọn', () => {
    mockBanks(BANKS)

    const { result } = renderHook(() => useBankOptions('VCB'))

    expect(result.current.bankOptions).toHaveLength(3)
    expect(result.current.bankOptions.at(-1)).toEqual({ value: 'VCB', label: 'VCB' })
  })

  it('không nhân đôi khi giá trị cũ đã có trong danh mục', () => {
    mockBanks(BANKS)

    const { result } = renderHook(() => useBankOptions('Ngân hàng Đầu tư và Phát triển Việt Nam'))

    expect(result.current.bankOptions).toHaveLength(2)
  })

  it('bỏ qua giá trị rỗng khi tạo mới', () => {
    mockBanks(BANKS)

    const { result } = renderHook(() => useBankOptions(''))

    expect(result.current.bankOptions).toHaveLength(2)
  })

  it('trả danh sách rỗng khi chưa tải xong', () => {
    useBanksMock.mockReturnValue({ data: undefined, isLoading: true })

    const { result } = renderHook(() => useBankOptions())

    expect(result.current.bankOptions).toEqual([])
    expect(result.current.isLoadingBanks).toBe(true)
  })
})
