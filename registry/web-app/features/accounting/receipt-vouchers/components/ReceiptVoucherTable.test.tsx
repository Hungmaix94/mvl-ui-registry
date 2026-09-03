import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
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

const mockCan = vi.fn().mockReturnValue(true)
vi.mock('@/lib/ability', () => ({
  useAbility: () => ({ can: mockCan }),
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMap: new Map() }),
}))

vi.mock('@/features/accounting/bank-accounts/services/bank-account-service', () => ({
  useBankAccount: () => ({ data: null }),
}))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import ReceiptVoucherTable from './ReceiptVoucherTable'
import {
  ReceiptVoucherStatus,
  type ReceiptVoucherList,
} from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'

function makeRow(overrides: Partial<ReceiptVoucherList> = {}): ReceiptVoucherList {
  return {
    id: 7,
    code: 'PT-2026-0007',
    receipt_date: '2026-07-22',
    payer_name: 'Chủ đầu tư A',
    payer_type: 'INVESTOR',
    payment_method: 'TRANSFER',
    total_amount: '5000000',
    status: ReceiptVoucherStatus.DRAFT,
    sales_invoices: [],
    attachments: [],
    ...overrides,
  } as unknown as ReceiptVoucherList
}

function renderTable(props: Partial<Parameters<typeof ReceiptVoucherTable>[0]> = {}) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <ReceiptVoucherTable
          data={[makeRow()]}
          isLoading={false}
          totalRecords={1}
          pageSize={25}
          currentPageIndex={0}
          {...props}
        />
      </SidebarProvider>
    </MemoryRouter>
  )
}

function openRowActionMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Open actions menu' }))
}

describe('ReceiptVoucherTable — hành động Ghi sổ ngoài danh sách (CR 86eyfnh0e)', () => {
  beforeEach(() => {
    mockCan.mockReset()
    mockCan.mockReturnValue(true)
  })

  it('hiện "Ghi sổ" cho phiếu Bản nháp và trả đúng record khi bấm', () => {
    const onPost = vi.fn()
    renderTable({ onPost })

    openRowActionMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: /Ghi sổ/ }))

    expect(onPost).toHaveBeenCalledTimes(1)
    expect(onPost.mock.calls[0][0]).toMatchObject({ id: 7, code: 'PT-2026-0007' })
  })

  it('ẩn "Ghi sổ" với phiếu đã ghi sổ', () => {
    renderTable({
      data: [makeRow({ status: ReceiptVoucherStatus.POSTED })],
      onPost: vi.fn(),
    })

    openRowActionMenu()

    expect(screen.queryByRole('menuitem', { name: /Ghi sổ/ })).not.toBeInTheDocument()
  })

  it('ẩn "Ghi sổ" khi thiếu quyền receiptvoucher.post_voucher', () => {
    mockCan.mockImplementation((action: string) => action !== 'post_voucher')
    renderTable({ onPost: vi.fn() })

    openRowActionMenu()

    expect(screen.queryByRole('menuitem', { name: /Ghi sổ/ })).not.toBeInTheDocument()
    // Các hành động khác vẫn còn — chỉ riêng Ghi sổ bị chặn bởi quyền.
    expect(screen.getByRole('menuitem', { name: /Xem chi tiết/ })).toBeInTheDocument()
  })

  it('ẩn "Ghi sổ" khi màn hình không truyền onPost', () => {
    renderTable()

    openRowActionMenu()

    expect(screen.queryByRole('menuitem', { name: /Ghi sổ/ })).not.toBeInTheDocument()
  })
})

/**
 * Cột "Hóa đơn" phải đọc `sales_invoices` (list-only field) — trước đây đọc
 * `invoices?.[0]?.sales_invoice`, một field CHỈ có ở payload detail, nên cột này
 * luôn ra "—" cho mọi phiếu thu trên màn danh sách dù đã có hóa đơn liên kết.
 */
/** Ô cột "Hóa đơn" của dòng dữ liệu đầu tiên — khớp cột theo header, không đoán chỉ số cứng. */
function invoiceCell(view: ReturnType<typeof renderTable>) {
  const headers = view.getAllByRole('columnheader')
  const colIndex = headers.findIndex((h) => h.textContent?.includes('Hóa đơn'))
  const row = view.getAllByRole('row')[1]
  return within(row).getAllByRole('cell')[colIndex]
}

describe('ReceiptVoucherTable — cột "Hóa đơn" đọc sales_invoices (list-only field)', () => {
  it('hiện "—" khi phiếu chưa gắn hóa đơn nào', () => {
    const view = renderTable({ data: [makeRow({ sales_invoices: [] })] })

    const cell = invoiceCell(view)
    expect(cell.textContent).toBe('—')
    expect(within(cell).queryByRole('link')).not.toBeInTheDocument()
  })

  it('hiện external_invoice_no và link sang chi tiết khi hóa đơn đã phát hành', () => {
    renderTable({
      data: [
        makeRow({
          sales_invoices: [{ id: 88, code: 'HDOUT000000088', external_invoice_no: '00012345' }],
        }),
      ],
    })

    const link = screen.getByRole('link', { name: '00012345' })
    expect(link).toHaveAttribute('href', '/accounting/transactions/sales-invoices/88')
  })

  it('fallback về code nội bộ khi hóa đơn chưa phát hành (external_invoice_no rỗng)', () => {
    renderTable({
      data: [
        makeRow({
          sales_invoices: [{ id: 91, code: 'HDOUT000000091', external_invoice_no: '' }],
        }),
      ],
    })

    expect(screen.getByRole('link', { name: 'HDOUT000000091' })).toBeInTheDocument()
  })
})
