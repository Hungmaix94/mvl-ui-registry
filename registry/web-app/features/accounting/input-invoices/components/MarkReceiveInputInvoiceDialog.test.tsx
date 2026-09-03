// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// CR STT42: "Số hóa đơn thực tế" phải cho phép nhập tự do, không giới hạn kí tự —
// trước đây zodResolver ép buộc đúng 7-8 chữ số.
const mockMutateAsync = vi.fn()
vi.mock('@/features/accounting/input-invoices/services/input-invoice-service', () => ({
  useMarkReceivedInputInvoice: () => ({ mutateAsync: mockMutateAsync }),
}))

import { MarkReceiveInputInvoiceDialog } from './MarkReceiveInputInvoiceDialog'
import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'

const RECORD = { id: 1, external_invoice_no: '', invoice_date: '' } as InputInvoice

const renderDialog = () => {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MarkReceiveInputInvoiceDialog
        record={RECORD}
        open
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  mockMutateAsync.mockReset()
  mockMutateAsync.mockResolvedValue({})
})

describe('MarkReceiveInputInvoiceDialog — số hóa đơn thực tế nhập tự do', () => {
  it('chấp nhận số hóa đơn không phải 7-8 chữ số (ví dụ số hóa đơn của F2/CTV)', async () => {
    renderDialog()

    fireEvent.change(screen.getByPlaceholderText('Nhập số hóa đơn...'), {
      target: { value: 'F2-INV/2026-00A1' },
    })
    fireEvent.change(screen.getByLabelText('Ngày hóa đơn'), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByLabelText('Ngày nhận hóa đơn'), {
      target: { value: '2026-08-03' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận nhận hóa đơn' }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 1,
        data: {
          external_invoice_no: 'F2-INV/2026-00A1',
          invoice_date: '2026-08-01',
          received_date: '2026-08-03',
          attachment_file: '',
        },
      })
    })
    expect(screen.queryByText(/phải gồm 7 hoặc 8 chữ số/)).not.toBeInTheDocument()
  })

  it('vẫn bắt buộc nhập số hóa đơn — để trống báo lỗi và không gọi API', async () => {
    renderDialog()

    fireEvent.change(screen.getByLabelText('Ngày hóa đơn'), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByLabelText('Ngày nhận hóa đơn'), {
      target: { value: '2026-08-03' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận nhận hóa đơn' }))

    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập số hóa đơn thực tế!')).toBeInTheDocument()
    })
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })
})
