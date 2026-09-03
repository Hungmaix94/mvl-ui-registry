// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { InvoiceRefListCell, type InvoiceRef } from './InvoiceRefListCell'

const makeInvoices = (count: number): InvoiceRef[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    code: `HDR-${String(i + 1).padStart(6, '0')}`,
    external_invoice_no: String(10000000 + i),
  }))

const linkTo = (id: number) => `/accounting/transactions/sales-invoices/${id}`

const renderCell = (invoices: Parameters<typeof InvoiceRefListCell>[0]['invoices']) =>
  render(
    <MemoryRouter>
      <InvoiceRefListCell invoices={invoices} linkTo={linkTo} />
    </MemoryRouter>
  )

describe('InvoiceRefListCell', () => {
  it('renders the fallback dash when there are no invoices', () => {
    renderCell([])
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the fallback dash when invoices is undefined', () => {
    renderCell(undefined)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows external_invoice_no and links to the invoice detail page when issued', () => {
    renderCell([{ id: 88, code: 'HDR-000088', external_invoice_no: '00012345' }])

    const link = screen.getByRole('link', { name: '00012345' })
    expect(link).toHaveAttribute('href', '/accounting/transactions/sales-invoices/88')
    expect(screen.queryByText('HDR-000088')).not.toBeInTheDocument()
  })

  it('falls back to the internal code when external_invoice_no is empty (not yet issued)', () => {
    renderCell([{ id: 91, code: 'HDR-000091', external_invoice_no: '' }])

    const link = screen.getByRole('link', { name: 'HDR-000091' })
    expect(link).toHaveAttribute('href', '/accounting/transactions/sales-invoices/91')
  })

  it('stacks 2 invoices per row', () => {
    renderCell(makeInvoices(4))

    const rows = screen.getAllByRole('group')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getAllByRole('link')).toHaveLength(2)
    expect(within(rows[1]).getAllByRole('link')).toHaveLength(2)
  })

  it('shows up to 3 rows (6 invoices) with no overflow control when it fits exactly', () => {
    renderCell(makeInvoices(6))

    expect(screen.getAllByRole('link')).toHaveLength(6)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('collapses rows beyond the 3rd behind "…" and expands them on click', () => {
    renderCell(makeInvoices(9))

    // 3 rows x 2/row = 6 links visible up front, 3 held back behind "…"
    expect(screen.getAllByRole('link')).toHaveLength(6)
    const expandButton = screen.getByRole('button', { name: 'Xem thêm 3 hóa đơn' })
    expect(expandButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(expandButton)

    expect(screen.getAllByRole('link')).toHaveLength(9)
    const collapseButton = screen.getByRole('button', { name: 'Thu gọn danh sách hóa đơn' })
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(collapseButton)

    expect(screen.getAllByRole('link')).toHaveLength(6)
  })
})
