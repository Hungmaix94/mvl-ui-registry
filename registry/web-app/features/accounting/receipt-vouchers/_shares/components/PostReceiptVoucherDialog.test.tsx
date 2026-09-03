import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const mockPost = vi.fn().mockResolvedValue({})
const mockPartialUpdate = vi.fn().mockResolvedValue({})

vi.mock(
  '@/features/accounting/receipt-vouchers/services/receipt-voucher-service',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/features/accounting/receipt-vouchers/services/receipt-voucher-service')
      >()
    return {
      ...actual,
      usePostReceiptVoucher: () => ({ mutateAsync: mockPost }),
      usePartialUpdateReceiptVoucher: () => ({ mutateAsync: mockPartialUpdate }),
    }
  }
)

vi.mock('@/services/toast-service', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

// FileUpload kéo theo cả luồng upload S3 — không thuộc phạm vi test luồng ghi sổ.
vi.mock('@/components/ui/file-upload/FileUpload', () => ({
  FileUpload: ({ label }: { label?: string }) => <div>{label}</div>,
}))

import { PostReceiptVoucherDialog, extractCollectionVariance } from './PostReceiptVoucherDialog'
import {
  ReceiptVoucherPaymentMethod,
  ReceiptVoucherStatus,
  type ReceiptVoucher,
} from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'

function makeVoucher(overrides: Partial<ReceiptVoucher> = {}): ReceiptVoucher {
  return {
    id: 42,
    code: 'PT-2026-0042',
    receipt_date: '2026-07-22',
    payment_method: ReceiptVoucherPaymentMethod.TRANSFER,
    bank_transaction_ref: '',
    status: ReceiptVoucherStatus.DRAFT,
    attachments: [],
    invoices: [],
    ...overrides,
  } as unknown as ReceiptVoucher
}

function renderDialog(voucher: ReceiptVoucher) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <PostReceiptVoucherDialog voucher={voucher} open onOpenChange={vi.fn()} />
    </QueryClientProvider>
  )
}

const clickConfirm = () => fireEvent.click(screen.getByRole('button', { name: /Xác nhận ghi sổ/ }))

describe('PostReceiptVoucherDialog', () => {
  beforeEach(() => {
    mockPost.mockClear()
    mockPartialUpdate.mockClear()
  })

  it('chỉ gọi ghi sổ, không PATCH, khi không bổ sung gì thêm', async () => {
    renderDialog(makeVoucher({ payment_method: ReceiptVoucherPaymentMethod.CASH }))

    clickConfirm()

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith({ id: 42, data: undefined }))
    expect(mockPartialUpdate).not.toHaveBeenCalled()
  })

  it('PATCH mã tham chiếu rồi mới ghi sổ khi người dùng nhập mã mới', async () => {
    renderDialog(makeVoucher())

    fireEvent.change(screen.getByPlaceholderText('Nhập mã tham chiếu...'), {
      target: { value: 'FT26073344' },
    })
    clickConfirm()

    await waitFor(() =>
      expect(mockPartialUpdate).toHaveBeenCalledWith({
        id: 42,
        data: { bank_transaction_ref: 'FT26073344' },
      })
    )
    expect(mockPost).toHaveBeenCalledWith({ id: 42, data: undefined })
  })

  it('không PATCH khi mã tham chiếu giữ nguyên như cũ', async () => {
    renderDialog(makeVoucher({ bank_transaction_ref: 'FT26073344' }))

    clickConfirm()

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith({ id: 42, data: undefined }))
    expect(mockPartialUpdate).not.toHaveBeenCalled()
  })

  it('ẩn ô mã tham chiếu ngân hàng với phiếu không phải chuyển khoản', () => {
    renderDialog(makeVoucher({ payment_method: ReceiptVoucherPaymentMethod.CASH }))

    expect(screen.queryByPlaceholderText('Nhập mã tham chiếu...')).not.toBeInTheDocument()
  })
})

/**
 * Tiền mặt thực nhận và mệnh giá tất toán là hai số riêng — lệch vài đồng là công nợ vụn, ghi sổ
 * bình thường. Vượt mức làm tròn giải thích được thì BE hỏi lại (400
 * `collection_variance_exceeds_limit`), và chỉ LẦN BẤM THỨ HAI mới gửi cờ xác nhận. Gửi cờ ngay
 * lần đầu là cảnh báo không bao giờ hiện ra và một phiếu lệch 99 triệu đi thẳng vào sổ.
 */
const varianceError = {
  error: {
    code: 'collection_variance_exceeds_limit',
    detail: 'lech qua lon',
    variance: '-99000000',
    cash: '1000000',
    allocated: '100000000',
    limit: '10000',
  },
}

describe('PostReceiptVoucherDialog — chênh lệch thu lớn', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockPost.mockResolvedValue({})
    mockPartialUpdate.mockClear()
  })

  it('không gửi cờ xác nhận ở lần bấm đầu, và hiện đúng con số khi BE báo lệch lớn', async () => {
    mockPost.mockRejectedValueOnce(varianceError)
    renderDialog(makeVoucher({ payment_method: ReceiptVoucherPaymentMethod.CASH }))

    clickConfirm()

    await screen.findByTestId('collection-variance-warning')
    expect(mockPost.mock.calls[0][0].data).toBeUndefined()

    const warning = screen.getByTestId('collection-variance-warning').textContent ?? ''
    expect(warning).toContain('99.000.000')
    expect(warning).toContain('10.000')
  })

  it('lần bấm thứ hai mới gửi acknowledge_large_variance', async () => {
    mockPost.mockRejectedValueOnce(varianceError)
    renderDialog(makeVoucher({ payment_method: ReceiptVoucherPaymentMethod.CASH }))

    clickConfirm()
    await screen.findByTestId('collection-variance-warning')

    fireEvent.click(screen.getByRole('button', { name: /Vẫn ghi sổ/ }))

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(2))
    expect(mockPost.mock.calls[1][0].data).toEqual({ acknowledge_large_variance: true })
  })
})

describe('extractCollectionVariance', () => {
  it.each([
    ['bọc trong error', varianceError],
    ['bọc trong server', { server: varianceError.error }],
    ['phẳng', varianceError.error],
  ])('đọc được hình dạng %s', (_label, payload) => {
    const found = extractCollectionVariance(payload)
    expect(found?.variance).toBe('-99000000')
    expect(found?.limit).toBe('10000')
  })

  it('trả null cho lỗi khác', () => {
    expect(extractCollectionVariance({ error: { code: 'validation_error' } })).toBeNull()
  })
})
