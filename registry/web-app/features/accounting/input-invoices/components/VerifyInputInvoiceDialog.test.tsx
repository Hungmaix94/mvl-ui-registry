// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// CR STT42: "Số hóa đơn thực tế" phải cho phép nhập tự do, không giới hạn kí tự —
// trước đây zodResolver ép buộc đúng 7-8 chữ số, chặn cả số hóa đơn của F2/CTV không
// theo định dạng số VAT nội bộ.
const mockMutateAsync = vi.fn()
vi.mock('@/features/accounting/input-invoices/services/input-invoice-service', () => ({
  useVerifyInputInvoice: () => ({ mutateAsync: mockMutateAsync }),
}))

import { VerifyInputInvoiceDialog } from './VerifyInputInvoiceDialog'
import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'

const RECORD = { id: 1, external_invoice_no: '' } as InputInvoice

const renderDialog = () => {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <VerifyInputInvoiceDialog record={RECORD} open onOpenChange={vi.fn()} onSuccess={vi.fn()} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  mockMutateAsync.mockReset()
  mockMutateAsync.mockResolvedValue({})
})

describe('VerifyInputInvoiceDialog — số hóa đơn thực tế nhập tự do', () => {
  it('chấp nhận số hóa đơn không phải 7-8 chữ số (chữ + số, ví dụ số hóa đơn F2/CTV)', async () => {
    renderDialog()

    fireEvent.change(screen.getByPlaceholderText('Nhập số hóa đơn...'), {
      target: { value: 'HD-F2/2026-001' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đồng ý' }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 1,
        data: { external_invoice_no: 'HD-F2/2026-001' },
      })
    })
    expect(screen.queryByText(/phải gồm 7 hoặc 8 chữ số/)).not.toBeInTheDocument()
  })

  it('vẫn bắt buộc nhập — để trống báo lỗi và không gọi API', async () => {
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đồng ý' }))

    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập số hóa đơn thực tế!')).toBeInTheDocument()
    })
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })
})
