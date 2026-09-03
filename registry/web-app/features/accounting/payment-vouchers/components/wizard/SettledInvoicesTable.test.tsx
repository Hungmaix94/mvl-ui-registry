import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { SettledInvoicesTable, type SettledInvoiceRow } from './SettledInvoicesTable'

/** Two units on two input invoices — what a voucher collected in two passes looks like. */
const TWO_UNITS: SettledInvoiceRow[] = [
  {
    id: 1,
    input_invoice_code: 'HDIN000000182',
    unit_number: 'VN1001',
    project_name: 'Dự án Vinaconex7',
    deal_code: 'HD06-2026-001729',
    f2_reconciliation_code: 'DAVTT-IRS1471-F2-001',
    net_amount: '11398990',
    vat_amount: '326010',
    allocated_amount: '11725000',
  },
  {
    id: 2,
    input_invoice_code: 'HDIN000000199',
    unit_number: 'NTESTTC123',
    project_name: 'Dự án Vinaconex7',
    deal_code: 'HD06-2026-001781',
    f2_reconciliation_code: 'DAVTT-IRS1527-F2-001',
    net_amount: '54204545',
    vat_amount: '375000',
    allocated_amount: '54579545',
  },
]

describe('SettledInvoicesTable', () => {
  it('hiện mỗi căn một dòng, kèm hóa đơn và đối chiếu của căn đó', () => {
    render(<SettledInvoicesTable rows={TWO_UNITS} />)

    const rows = screen.getAllByRole('row')
    // header + 2 căn + dòng tổng
    expect(rows).toHaveLength(4)

    const [, first, second] = rows
    expect(within(first).getByText('VN1001')).toBeInTheDocument()
    expect(within(first).getByText('HDIN000000182')).toBeInTheDocument()
    expect(within(first).getByText('DAVTT-IRS1471-F2-001')).toBeInTheDocument()
    expect(within(first).getByText('11.398.990')).toBeInTheDocument()
    expect(within(first).getByText('326.010')).toBeInTheDocument()
    expect(within(first).getByText('11.725.000')).toBeInTheDocument()

    expect(within(second).getByText('NTESTTC123')).toBeInTheDocument()
    expect(within(second).getByText('HDIN000000199')).toBeInTheDocument()
    expect(within(second).getByText('54.579.545')).toBeInTheDocument()
  })

  it('cộng tổng đúng ba cột tiền — thuần, VAT và gồm VAT', () => {
    render(<SettledInvoicesTable rows={TWO_UNITS} />)

    const total = screen.getAllByRole('row').at(-1)!
    expect(within(total).getByText('65.603.535')).toBeInTheDocument()
    expect(within(total).getByText('701.010')).toBeInTheDocument()
    // Đây là con số phải khớp ô "Số tiền" đã khóa và thẻ tổng bên sidecar.
    expect(within(total).getByText('66.304.545')).toBeInTheDocument()
  })

  it('không dựng bảng khi phiếu chưa gắn tier nào (hình dạng cũ chưa backfill)', () => {
    const { container } = render(<SettledInvoicesTable rows={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('vẫn hiện được dòng thiếu căn hoặc thiếu đối chiếu thay vì vỡ', () => {
    render(
      <SettledInvoicesTable
        rows={[{ id: 9, input_invoice_code: 'HDIN000000200', allocated_amount: '1000000' }]}
      />
    )

    const row = screen.getAllByRole('row')[1]
    expect(within(row).getAllByText('—')).toHaveLength(2)
    expect(within(row).getByText('1.000.000')).toBeInTheDocument()
  })
})
