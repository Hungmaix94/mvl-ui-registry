// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/lib/firebase', () => ({
  getFCMToken: vi.fn().mockResolvedValue(''),
  messaging: null,
}))

vi.mock('@/lib/ability', () => ({
  useAbility: () => ({ can: () => true }),
}))

vi.mock('@/hooks/useAppConstant.ts', () => ({
  default: () => ({ keysMap: new Map() }),
}))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import PaymentVoucherTable from './PaymentVoucherTable'
import {
  PaymentVoucherStatus,
  type PaymentVoucherStatusType,
} from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants'
import type { PaymentVoucherList } from '@/features/accounting/payment-vouchers/services/payment-voucher-service'

function makeRow(overrides: Partial<PaymentVoucherList> = {}): PaymentVoucherList {
  return {
    id: 7,
    code: 'PC-2026-0007',
    voucher_date: '2026-07-22',
    payee_type: 'EXCHANGE',
    payment_method: 'TRANSFER',
    total_amount: '5000000',
    status: PaymentVoucherStatus.DRAFT as PaymentVoucherStatusType,
    input_invoices: [],
    ...overrides,
  } as unknown as PaymentVoucherList
}

function renderTable(props: Partial<Parameters<typeof PaymentVoucherTable>[0]> = {}) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <PaymentVoucherTable
          data={[makeRow()]}
          isLoading={false}
          pageCount={1}
          pageSize={25}
          currentPage={1}
          totalRecords={1}
          onPaginationChange={vi.fn()}
          {...props}
        />
      </SidebarProvider>
    </MemoryRouter>
  )
}

/**
 * Cột "Hóa đơn" phải đọc `input_invoices` (list-only field) — trước đây đọc
 * `invoices?.[0]?.input_invoice`, một field CHỈ có ở payload detail, nên cột này
 * luôn ra "—" cho mọi phiếu chi trên màn danh sách dù đã có hóa đơn liên kết.
 */
/** Ô cột "Hóa đơn" của dòng dữ liệu đầu tiên — khớp cột theo header, không đoán chỉ số cứng. */
function invoiceCell(view: ReturnType<typeof renderTable>) {
  const headers = view.getAllByRole('columnheader')
  const colIndex = headers.findIndex((h) => h.textContent?.includes('Hóa đơn'))
  const row = view.getAllByRole('row')[1]
  return within(row).getAllByRole('cell')[colIndex]
}

describe('PaymentVoucherTable — cột "Hóa đơn" đọc input_invoices (list-only field)', () => {
  it('hiện "—" khi phiếu chưa gắn hóa đơn nào', () => {
    const view = renderTable({ data: [makeRow({ input_invoices: [] })] })

    const cell = invoiceCell(view)
    expect(cell.textContent).toBe('—')
    expect(within(cell).queryByRole('link')).not.toBeInTheDocument()
  })

  it('hiện external_invoice_no và link sang chi tiết khi hóa đơn đã nhận', () => {
    renderTable({
      data: [
        makeRow({
          input_invoices: [{ id: 7, code: 'HDIN000000007', external_invoice_no: '00099887' }],
        }),
      ],
    })

    const link = screen.getByRole('link', { name: '00099887' })
    expect(link).toHaveAttribute('href', '/accounting/transactions/input-invoices/7')
  })

  it('fallback về code nội bộ khi hóa đơn chưa nhận (external_invoice_no rỗng)', () => {
    renderTable({
      data: [
        makeRow({
          input_invoices: [{ id: 9, code: 'HDIN000000009', external_invoice_no: '' }],
        }),
      ],
    })

    expect(screen.getByRole('link', { name: 'HDIN000000009' })).toBeInTheDocument()
  })
})
