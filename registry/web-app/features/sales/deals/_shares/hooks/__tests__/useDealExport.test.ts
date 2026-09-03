import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useDealExport } from '../useDealExport'

const baseOpenExportDialog = vi.fn()

vi.mock('@/hooks/useExport.tsx', () => ({
  useExport: () => ({ openExportDialog: baseOpenExportDialog, isExporting: false }),
}))

vi.mock('@/constants/api-schema-aliases', () => ({
  ExportDelivery: { link: 'link', direct: 'direct' },
}))

vi.mock('@/features/sales/deals/services/deal-service', () => ({
  getDealService: () => ({ exportDeals: vi.fn() }),
}))

describe('useDealExport', () => {
  beforeEach(() => {
    baseOpenExportDialog.mockClear()
  })

  it('bỏ pagination params ra khỏi request export', async () => {
    const { result } = renderHook(() => useDealExport())

    await act(async () => {
      await result.current.openExportDialog({
        page: 2,
        page_size: 20,
        ordering: '-created_at',
        deposit_year: 2025,
      })
    })

    const params = baseOpenExportDialog.mock.calls[0][0]
    expect(params).not.toHaveProperty('page')
    expect(params).not.toHaveProperty('page_size')
    expect(params).not.toHaveProperty('ordering')
  })

  it('giữ nguyên bộ lọc đang chọn để file xuất khớp với danh sách', async () => {
    const { result } = renderHook(() => useDealExport())

    await act(async () => {
      await result.current.openExportDialog({
        page: 1,
        deposit_year: 2025,
        branch: 3,
        search: 'D0508',
      })
    })

    expect(baseOpenExportDialog.mock.calls[0][0]).toMatchObject({
      deposit_year: 2025,
      branch: 3,
      search: 'D0508',
    })
  })

  it('luôn xuất ở chế độ async + delivery link', async () => {
    const { result } = renderHook(() => useDealExport())

    await act(async () => {
      await result.current.openExportDialog({})
    })

    expect(baseOpenExportDialog.mock.calls[0][0]).toMatchObject({
      async: true,
      delivery: 'link',
    })
  })
})
