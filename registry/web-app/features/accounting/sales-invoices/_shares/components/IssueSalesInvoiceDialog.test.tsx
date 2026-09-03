import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const mockIssue = vi.fn()

vi.mock(
  '@/features/accounting/sales-invoices/services/sales-invoice-service',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/features/accounting/sales-invoices/services/sales-invoice-service')
      >()
    return { ...actual, useIssueSalesInvoice: () => ({ mutateAsync: mockIssue }) }
  }
)

vi.mock('@/services/toast-service', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import IssueSalesInvoiceDialog, {
  extractRoundingGap,
  type IssueSalesInvoiceTarget,
} from './IssueSalesInvoiceDialog'

const INVOICE: IssueSalesInvoiceTarget = {
  id: 42,
  external_invoice_no: '',
  invoice_date: '2026-05-06',
  total_amount: '538768112',
  vat_amount: '53876811',
}

function renderDialog(invoice: IssueSalesInvoiceTarget = INVOICE) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <IssueSalesInvoiceDialog open invoice={invoice} onOpenChange={vi.fn()} />
    </QueryClientProvider>
  )
}

const clickConfirm = (name = /Xác nhận phát hành/) =>
  fireEvent.click(screen.getByRole('button', { name }))

const gapError = {
  error: {
    code: 'rounding_gap_exceeds_limit',
    detail: 'lech qua lon',
    net_gap: '-1000000',
    vat_gap: '-100000',
    limit: '2',
  },
}

describe('IssueSalesInvoiceDialog', () => {
  beforeEach(() => {
    mockIssue.mockReset()
    mockIssue.mockResolvedValue({})
  })

  it('điền sẵn số hệ thống tính để kế toán chỉ phải sửa ô nào lệch', () => {
    renderDialog()
    // CurrencyInput hiển thị có phân cách nghìn.
    expect(screen.getByDisplayValue('538.768.112')).toBeTruthy()
    expect(screen.getByDisplayValue('53.876.811')).toBeTruthy()
  })

  it('cộng ra tổng gồm VAT để soi với dòng cuối tờ hóa đơn', () => {
    renderDialog()
    // 538.768.112 + 53.876.811 — đúng con số "Tổng thanh toán (gồm VAT)" trên màn hóa đơn.
    expect(screen.getByTestId('issue-total-with-vat').textContent).toContain('592.644.923')
  })

  it('không bày ra tổng khi mới có một trong hai ô', () => {
    renderDialog({ ...INVOICE, vat_amount: null })
    // Cộng ô trống thành 0 sẽ ra một tổng trông như thật mà thiếu hẳn phần thuế.
    expect(screen.getByTestId('issue-total-with-vat').textContent).toBe('—')
  })

  it('gửi cả hai trục tiền khi kế toán giữ nguyên số prefill', async () => {
    renderDialog()

    fireEvent.change(screen.getByPlaceholderText('Nhập số hóa đơn...'), {
      target: { value: 'HD 170.2025' },
    })
    clickConfirm()

    await waitFor(() =>
      expect(mockIssue).toHaveBeenCalledWith({
        id: 42,
        data: {
          external_invoice_no: 'HD 170.2025',
          invoice_date: '2026-05-06',
          actual_net_amount: '538768112',
          actual_vat_amount: '53876811',
          // Schema sinh từ BE khai `acknowledge_large_gap: boolean` (không có `?`) nên lần phát
          // hành đầu phải gửi tường minh `false` — xem test "lần đầu gửi acknowledge = false".
          acknowledge_large_gap: false,
        },
      })
    )
  })

  it('phát hành được hóa đơn điều chỉnh giảm: giữ nguyên dấu âm cả hai trục', async () => {
    // Hình thật của HDOUT000000021. Hai ô này là thứ duy nhất gửi lên BE, nên mất dấu ở đây
    // là gửi một con số ngược dấu mà BE không có cách nào biết là sai.
    renderDialog({
      ...INVOICE,
      total_amount: '-17185058',
      vat_amount: '-1718506',
    })

    expect(screen.getByDisplayValue('-17.185.058')).toBeTruthy()
    expect(screen.getByDisplayValue('-1.718.506')).toBeTruthy()
    expect(screen.getByTestId('issue-total-with-vat').textContent).toContain('18.903.564')

    fireEvent.change(screen.getByPlaceholderText('Nhập số hóa đơn...'), {
      target: { value: 'HD 171.2025' },
    })
    clickConfirm()

    await waitFor(() => expect(mockIssue).toHaveBeenCalled())
    expect(mockIssue.mock.calls[0][0].data.actual_net_amount).toBe('-17185058')
    expect(mockIssue.mock.calls[0][0].data.actual_vat_amount).toBe('-1718506')
  })

  it('lần đầu gửi acknowledge = false, và hiện đúng con số khi BE báo lệch lớn', async () => {
    // Trước 24/08 lần bấm đầu KHÔNG gửi field này. `a3408caa8` đổi sang gửi tường minh `false`
    // vì schema regen khai nó bắt buộc (`src/api/schema.ts`: `acknowledge_large_gap: boolean`,
    // không có `?`), nhưng hai test ở file này không được sửa theo nên đỏ suốt từ đó.
    // Điều quan trọng về nghiệp vụ vẫn giữ nguyên: lần đầu KHÔNG phải là `true`.
    mockIssue.mockRejectedValueOnce(gapError)
    renderDialog()

    fireEvent.change(screen.getByPlaceholderText('Nhập số hóa đơn...'), {
      target: { value: 'HD 170.2025' },
    })
    clickConfirm()

    await screen.findByTestId('rounding-gap-warning')
    expect(mockIssue.mock.calls[0][0].data.acknowledge_large_gap).toBe(false)

    const warning = screen.getByTestId('rounding-gap-warning').textContent ?? ''
    // Con số phải hiện ra chứ không phải câu văn chung chung.
    expect(warning).toContain('1.000.000')
    expect(warning).toContain('100.000')
  })

  it('lần bấm thứ hai mới gửi acknowledge_large_gap', async () => {
    mockIssue.mockRejectedValueOnce(gapError)
    renderDialog()

    fireEvent.change(screen.getByPlaceholderText('Nhập số hóa đơn...'), {
      target: { value: 'HD 170.2025' },
    })
    clickConfirm()
    await screen.findByTestId('rounding-gap-warning')

    clickConfirm(/Vẫn phát hành/)

    await waitFor(() => expect(mockIssue).toHaveBeenCalledTimes(2))
    expect(mockIssue.mock.calls[1][0].data.acknowledge_large_gap).toBe(true)
  })

  it('không gửi gì khi thiếu số hóa đơn', async () => {
    renderDialog()
    clickConfirm()
    await screen.findByText(/Vui lòng nhập số hóa đơn/)
    expect(mockIssue).not.toHaveBeenCalled()
  })
})

describe('extractRoundingGap', () => {
  // BE ném lỗi ở ba hình dạng tuỳ tầng nào bắt được nó — đoán một hình dạng là đủ để
  // dialog im lặng nuốt cảnh báo và người dùng không bao giờ thấy con số.
  it.each([
    ['bọc trong error', gapError],
    ['bọc trong server', { server: gapError.error }],
    ['phẳng', gapError.error],
  ])('đọc được hình dạng %s', (_label, payload) => {
    const gap = extractRoundingGap(payload)
    expect(gap?.netGap).toBe('-1000000')
    expect(gap?.limit).toBe('2')
  })

  it('trả null cho lỗi khác', () => {
    expect(extractRoundingGap({ error: { code: 'validation_error' } })).toBeNull()
  })
})
