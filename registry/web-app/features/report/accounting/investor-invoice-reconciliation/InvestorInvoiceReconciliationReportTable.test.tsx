import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// jsdom lacks ResizeObserver, which the Table/Sidebar layout relies on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

// Imported after the stub above is registered.
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import InvestorInvoiceReconciliationReportTable from './InvestorInvoiceReconciliationReportTable'
import type {
  InvestorInvoiceReportResponse,
  InvestorInvoiceReportRow,
} from '@/features/accounting/reports/services/report-service'

/**
 * `InvestorInvoiceReportRow` is a generated schema; the table reads a known subset, so the fixture
 * declares just what's used and casts ONCE at the test boundary.
 */
function makeRow(overrides: Partial<InvestorInvoiceReportRow> = {}): InvestorInvoiceReportRow {
  return {
    deal_id: 9,
    project_id: 313,
    project_name: 'Dự án Làng Vân',
    unit_number: 'BH000002268',
    fee_calculation_price: '15290000000',
    reconciliation_amount: '400000000',
    bonus_amount: '30100000',
    total_reconciliation_pct: '79',
    invoiced_reconciliation_pct: '25.00',
    invoiced_net_amount: '100000000',
    remaining_amount: '300000000',
    remaining_reconciliation_pct: '75.00',
    total_invoiced_amount: '100000000',
    total_invoiced_amount_with_vat: '110000000',
    supplementary_fee_amount: '30100000',
    total_unrealized_amount: '0',
    total_uncollected_revenue: '300000000',
    invoice_count: 1,
    invoices: [
      {
        invoice_id: 1406,
        code: 'HDOUT000001406',
        external_invoice_no: '8638638638',
        invoice_date: '2026-07-13',
        period_year: 2026,
        period_month: 7,
        net_amount: '100000000',
        amount_with_vat: '110000000',
        paid_amount: '100000000',
        reconciliation_pct: '25.00',
        unrealized_amount: '0',
      },
    ],
    ...overrides,
  } as unknown as InvestorInvoiceReportRow
}

function renderTable(data: InvestorInvoiceReportResponse) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <InvestorInvoiceReconciliationReportTable
          data={data}
          isLoading={false}
          pageSize={25}
          currentPageIndex={0}
          onPaginationChange={vi.fn()}
        />
      </SidebarProvider>
    </MemoryRouter>
  )
}

describe('InvestorInvoiceReconciliationReportTable — hàng chính', () => {
  it('render mã căn, dự án và các số liệu server-computed', () => {
    const data = {
      count: 1,
      next: null,
      previous: null,
      results: [makeRow()],
    } as unknown as InvestorInvoiceReportResponse

    renderTable(data)

    expect(screen.getByText('BH000002268')).toBeInTheDocument()
    expect(screen.getByText('Dự án Làng Vân')).toBeInTheDocument()
    expect(screen.getByText('79%')).toBeInTheDocument()
  })

  it('render 5 cột bổ sung: thưởng, % + thành tiền đối chiếu theo HĐ, còn lại, % còn lại', () => {
    const data = {
      count: 1,
      next: null,
      previous: null,
      results: [makeRow()],
    } as unknown as InvestorInvoiceReportResponse

    renderTable(data)

    for (const header of [
      'Thưởng',
      'Phần trăm đối chiếu (theo HĐ)',
      'Thành tiền đối chiếu (theo HĐ)',
      'Còn lại',
      'Phần trăm đối chiếu còn lại (theo HĐ)',
    ]) {
      expect(screen.getByText(header)).toBeInTheDocument()
    }

    // % theo HĐ + % còn lại luôn cộng đủ 100 — cùng một gốc tiền.
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('pct null (căn không có phí/thưởng) hiện em-dash chứ không phải 0%', () => {
    const data = {
      count: 1,
      next: null,
      previous: null,
      results: [
        makeRow({
          reconciliation_amount: '0',
          invoiced_reconciliation_pct: null,
          remaining_reconciliation_pct: null,
        }),
      ],
    } as unknown as InvestorInvoiceReportResponse

    renderTable(data)

    expect(screen.queryByText('0%')).not.toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('phân trang dùng count toàn bộ của server, không phải số dòng của trang hiện tại', () => {
    const onPaginationChange = vi.fn()
    const data = {
      count: 60, // 60 căn / 25 mỗi trang -> 3 trang
      next: 'http://x/?page=2',
      previous: null,
      results: [makeRow()], // trang hiện tại chỉ trả 1 dòng
    } as unknown as InvestorInvoiceReportResponse

    render(
      <MemoryRouter>
        <SidebarProvider>
          <InvestorInvoiceReconciliationReportTable
            data={data}
            isLoading={false}
            pageSize={25}
            currentPageIndex={0}
            onPaginationChange={onPaginationChange}
          />
        </SidebarProvider>
      </MemoryRouter>
    )

    expect(screen.getByText(/60/)).toBeInTheDocument()
  })

  it('mã căn link sang chi tiết giao dịch của deal', () => {
    const data = {
      count: 1,
      next: null,
      previous: null,
      results: [makeRow()],
    } as unknown as InvestorInvoiceReportResponse

    renderTable(data)

    expect(screen.getByRole('link', { name: 'BH000002268' })).toHaveAttribute(
      'href',
      '/project-admin/contract-transaction/deal/9'
    )
  })

  it('thiếu deal_id thì mã căn hiện dạng text, không thành link chết', () => {
    const data = {
      count: 1,
      next: null,
      previous: null,
      results: [makeRow({ deal_id: undefined as unknown as number })],
    } as unknown as InvestorInvoiceReportResponse

    renderTable(data)

    expect(screen.queryByRole('link', { name: 'BH000002268' })).not.toBeInTheDocument()
    expect(screen.getByText('BH000002268')).toBeInTheDocument()
  })

  it('cột toggle (expander) hẹp — áp size 44px lên header cell', () => {
    const data = {
      count: 1,
      next: null,
      previous: null,
      results: [makeRow()],
    } as unknown as InvestorInvoiceReportResponse

    renderTable(data)

    const [firstHeaderCell] = screen.getAllByRole('columnheader')
    expect(firstHeaderCell).toBeInstanceOf(HTMLElement)
    expect((firstHeaderCell as HTMLElement).style.width).toBe('44px')
  })
})

describe('InvestorInvoiceReconciliationReportTable — vùng expand hóa đơn', () => {
  it('bấm toggle thì hiện danh sách hóa đơn của căn, colSpan trải hết số cột', async () => {
    const user = userEvent.setup()
    const data = {
      count: 1,
      next: null,
      previous: null,
      results: [makeRow()],
    } as unknown as InvestorInvoiceReportResponse

    renderTable(data)

    // Chưa expand: chưa có bảng con.
    expect(screen.queryByText(/Danh sách hóa đơn của căn/)).not.toBeInTheDocument()

    // Nút toggle có accessible name riêng (icon-button).
    await user.click(screen.getByRole('button', { name: 'Danh sách hóa đơn' }))

    expect(await screen.findByText('Danh sách hóa đơn của căn BH000002268')).toBeInTheDocument()
    expect(screen.getByText('HDOUT000001406')).toBeInTheDocument()
    expect(screen.getByText('8638638638')).toBeInTheDocument()

    // Ô chứa bảng con trải hết 13 cột (expander + 12 cột dữ liệu).
    const subCell = screen
      .getAllByRole('cell')
      .find((cell) => cell.getAttribute('colspan') === '13')
    expect(subCell).toBeDefined()
  })

  it('bảng con tách rõ số tiền chưa VAT (gốc đối chiếu) và có VAT (mặt hóa đơn đỏ)', async () => {
    const user = userEvent.setup()
    const data = {
      count: 1,
      next: null,
      previous: null,
      results: [makeRow()],
    } as unknown as InvestorInvoiceReportResponse

    renderTable(data)
    await user.click(screen.getByRole('button', { name: 'Danh sách hóa đơn' }))

    expect(await screen.findByText('Số tiền xuất HĐ (chưa VAT)')).toBeInTheDocument()
    expect(screen.getByText('Số tiền xuất HĐ (có VAT)')).toBeInTheDocument()
    expect(screen.getByText('Đã thu (chưa VAT)')).toBeInTheDocument()
  })

  it('mã hóa đơn link sang chi tiết hóa đơn bán ra', async () => {
    const user = userEvent.setup()
    const data = {
      count: 1,
      next: null,
      previous: null,
      results: [makeRow()],
    } as unknown as InvestorInvoiceReportResponse

    renderTable(data)
    await user.click(screen.getByRole('button', { name: 'Danh sách hóa đơn' }))

    expect(await screen.findByRole('link', { name: 'HDOUT000001406' })).toHaveAttribute(
      'href',
      '/accounting/transactions/sales-invoices/1406'
    )
  })
})
