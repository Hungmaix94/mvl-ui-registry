// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * ClickUp 86eyhvka8 — "Xác nhận hóa đơn đầu vào xong không refresh các nút theo trạng thái mới".
 *
 * Nút thao tác ở CẢ HAI màn (danh sách + chi tiết) đều suy ra từ `record.status`, nên chỉ cần
 * một query bị bỏ sót là màn đó vẽ lại bằng bản chụp cũ và nút "Xác nhận" vẫn còn sau khi BE đã
 * đổi trạng thái. Trước đây mỗi chỗ gọi tự liệt kê một kiểu làm mới khác nhau:
 *
 *   - màn chi tiết  → chỉ `DETAIL`            (danh sách + dòng tổng đứng yên)
 *   - hai dialog    → `list` + `DETAIL`       (dòng tổng đứng yên)
 *
 * Chốt lại một quy tắc: invalidate cả cụm `['accounting','input-invoices']` và **đợi** xong rồi
 * mới đóng hộp thoại.
 */

const mockMutateAsync = vi.fn()
vi.mock('@/features/accounting/input-invoices/services/input-invoice-service', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/accounting/input-invoices/services/input-invoice-service')
  >('@/features/accounting/input-invoices/services/input-invoice-service')
  return {
    ...actual,
    useVerifyInputInvoice: () => ({ mutateAsync: mockMutateAsync }),
  }
})

import { VerifyInputInvoiceDialog } from './VerifyInputInvoiceDialog'
import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'

const RECORD = { id: 1, external_invoice_no: 'HD-001' } as InputInvoice

/** Ba query của tính năng, đúng khoá thật trong `QUERY_KEYS.ACCOUNTING.INPUT_INVOICES`. */
const LIST_KEY = ['accounting', 'input-invoices', 'list', '{}']
const SUMMARY_KEY = ['accounting', 'input-invoices', 'summary', '{}']
const DETAIL_KEY = ['accounting', 'input-invoices', 'detail', 1]

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // Seed cả ba query như khi người dùng đã mở danh sách rồi vào chi tiết.
  queryClient.setQueryData(LIST_KEY, { results: [] })
  queryClient.setQueryData(SUMMARY_KEY, { total_amount: '0' })
  queryClient.setQueryData(DETAIL_KEY, { ...RECORD, status: 'RECEIVED' })

  const onOpenChange = vi.fn()
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

  render(
    <QueryClientProvider client={queryClient}>
      <VerifyInputInvoiceDialog
        record={RECORD}
        open
        onOpenChange={onOpenChange}
        onSuccess={vi.fn()}
      />
    </QueryClientProvider>
  )

  return { queryClient, onOpenChange, invalidateSpy }
}

/** Query nào bị lượt invalidate vừa rồi phủ tới. */
const invalidatedKeys = (invalidateSpy: { mock: { calls: unknown[][] } }): unknown[][] =>
  invalidateSpy.mock.calls.map(
    (call) => ((call[0] as { queryKey?: unknown[] } | undefined)?.queryKey ?? []) as unknown[]
  )

const covers = (keys: unknown[][], target: unknown[]) =>
  keys.some((key) => key.every((part, i) => part === target[i]))

beforeEach(() => {
  mockMutateAsync.mockReset()
  mockMutateAsync.mockResolvedValue({})
})

describe('Hóa đơn đầu vào — làm mới sau khi đổi trạng thái', () => {
  it('xác nhận xong thì làm mới CẢ danh sách, dòng tổng và chi tiết', async () => {
    const { invalidateSpy } = setup()

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đồng ý' }))

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled())
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled())

    const keys = invalidatedKeys(invalidateSpy)
    expect(covers(keys, LIST_KEY)).toBe(true)
    expect(covers(keys, SUMMARY_KEY)).toBe(true)
    expect(covers(keys, DETAIL_KEY)).toBe(true)
  })

  it('ba query đều bị đánh dấu cũ, không còn query nào giữ bản chụp trước thao tác', async () => {
    const { queryClient } = setup()

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đồng ý' }))

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled())
    await waitFor(() => expect(queryClient.getQueryState(SUMMARY_KEY)?.isInvalidated).toBe(true))

    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(true)
  })

  it('chỉ đóng hộp thoại SAU khi đã làm mới xong', async () => {
    const { onOpenChange, invalidateSpy } = setup()

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đồng ý' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    // Lúc hộp thoại đóng thì lượt invalidate đã chạy — không còn cảnh đóng trước, dữ liệu về sau.
    expect(invalidateSpy).toHaveBeenCalled()
  })
})
