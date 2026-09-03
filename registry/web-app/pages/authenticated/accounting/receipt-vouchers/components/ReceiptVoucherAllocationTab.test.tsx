import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import type { SalesInvoice } from '@/features/accounting/sales-invoices/services/sales-invoice-service'

import { ReceiptVoucherAllocationTab } from './ReceiptVoucherAllocationTab'

/**
 * Hoá đơn sinh từ phiếu đối chiếu CĐT: 1 dòng căn + 1 dòng "Chênh lệch làm tròn" ÂM, không gắn căn
 * nào (BE PR #3239).
 */
const SALES_INVOICE = {
  id: 77,
  code: 'HD-2026-0077',
  customer_name: 'CĐT Chamora',
  invoice_date: '2026-08-19',
  total_amount_with_vat: '1099999',
  lines: [
    {
      id: 1,
      product_inventory: 101,
      deal: 2001,
      unit_number: 'A-12.05',
      description: 'Phí đại lý',
      line_total: '1000000',
      vat_amount: '100000',
      line_total_with_vat: '1100000',
    },
    {
      id: 9,
      product_inventory: null,
      deal: null,
      unit_number: null,
      description: 'Chênh lệch làm tròn',
      line_total: '-1',
      vat_amount: '0',
      line_total_with_vat: '-1',
    },
  ],
} as unknown as SalesInvoice

const RECORD = {
  status: 'DRAFT',
  total_amount: '1099999',
  invoices: [{ id: 5, sales_invoice: 77, allocated_amount: '1099999', lines: [] }],
}

function renderTab(editedAllocations: Record<string, number | string>) {
  return render(
    <MemoryRouter>
      <ReceiptVoucherAllocationTab
        record={RECORD}
        salesInvoicesMap={{ 77: SALES_INVOICE }}
        editedAllocations={editedAllocations}
        setEditedAllocations={vi.fn()}
        lockedUnits={{}}
        deletedUnits={{}}
        handleSaveAllocation={vi.fn()}
        allocationsByVoucherLine={{}}
      />
    </MemoryRouter>
  )
}

/** Mở nhóm hoá đơn để các dòng căn/chứng từ hiện ra. */
function expandInvoice() {
  const invoiceRow = screen
    .getAllByRole('row')
    .find((r) => within(r).queryByText('HD-2026-0077') !== null)
  fireEvent.click(within(invoiceRow as HTMLElement).getAllByRole('button')[0])
}

const rowOf = (label: string): HTMLElement => {
  const row = screen.getAllByRole('row').find((r) => within(r).queryByText(label) !== null)
  if (!row) throw new Error(`Không tìm thấy dòng "${label}"`)
  return row
}

describe('ReceiptVoucherAllocationTab — dòng "Chênh lệch làm tròn"', () => {
  const allocations = { '77-0': 1_100_000, '77-1': -1 }

  it('hiện số ÂM bằng dấu trừ −, KHÔNG dùng ngoặc đơn (đọc như chú thích)', () => {
    renderTab(allocations)
    expandInvoice()

    const row = rowOf('Chênh lệch làm tròn')
    expect(row.textContent).toContain('−1')
    expect(row.textContent).not.toContain('(1)')
  })

  it('KHÔNG cho sửa tay: dòng chứng từ không có ô nhập, dòng căn thì có', () => {
    renderTab(allocations)
    expandInvoice()

    expect(within(rowOf('Chênh lệch làm tròn')).queryByRole('textbox')).toBeNull()
    expect(within(rowOf('Phí đại lý')).getAllByRole('textbox').length).toBeGreaterThan(0)
  })

  it('có tooltip giải thích khoản này thuộc chứng từ, không thuộc căn nào', () => {
    renderTab(allocations)
    expandInvoice()

    const trigger = within(rowOf('Chênh lệch làm tròn')).getByLabelText(
      'Giải thích dòng chênh lệch làm tròn'
    )
    expect(trigger).toBeInTheDocument()
  })

  it('cột "HH gốc" hiện −1 thay vì "—" (bản cũ gác `> 0` nên nuốt mất dòng âm)', () => {
    renderTab(allocations)
    expandInvoice()

    const cells = within(rowOf('Chênh lệch làm tròn')).getAllByRole('cell')
    expect(cells[3].textContent).toContain('−1')
  })

  it('tổng phân bổ cộng cả dòng âm ⇒ khớp đúng tiền về phiếu', () => {
    renderTab(allocations)

    // 1.100.000 + (−1) = 1.099.999 = record.total_amount ⇒ chip "Khớp 100%".
    expect(screen.getByText('Khớp 100%')).toBeInTheDocument()
  })

  it('layout không vỡ: ô tiền âm không xuống dòng', () => {
    renderTab(allocations)
    expandInvoice()

    const cells = within(rowOf('Chênh lệch làm tròn')).getAllByRole('cell')
    expect(cells[2].className).toContain('whitespace-nowrap')
    expect(cells[3].className).toContain('whitespace-nowrap')
  })
})
