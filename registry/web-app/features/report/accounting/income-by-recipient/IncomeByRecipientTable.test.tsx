import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// jsdom lacks ResizeObserver, which the Table/Sidebar layout relies on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import IncomeByRecipientTable from './IncomeByRecipientTable'
import type { IncomeByRecipientRow } from '@/features/accounting/reports/services/report-service'

const employeeRow = {
  recipient_type: 'EMPLOYEE',
  recipient_id: 7,
  recipient_code: 'MV0007',
  recipient_name: 'Nguyễn Văn Sale',
  gross: '20000000',
  bhxh: '1890000',
  pit: '800000',
  net: '17310000',
  commission_actual_paid: '0',
  ytd_gross: '0',
  ytd_bhxh: '0',
  ytd_pit: '0',
  ytd_net: '0',
  ytd_commission_actual_paid: '0',
} as unknown as IncomeByRecipientRow

const collaboratorRow = {
  ...employeeRow,
  recipient_type: 'COLLABORATOR',
  recipient_id: 3,
  recipient_code: 'CTV003',
  recipient_name: 'Trần Thị CTV',
  bhxh: '0',
} as unknown as IncomeByRecipientRow

const totals = { gross: 25000000, bhxh: 1890000, pit: 800000, net: 21810000 }

const setup = (props: Partial<React.ComponentProps<typeof IncomeByRecipientTable>> = {}) =>
  render(
    <MemoryRouter>
      <SidebarProvider>
        <IncomeByRecipientTable
          rows={[employeeRow, collaboratorRow]}
          totals={totals}
          isLoading={false}
          pageSize={25}
          totalRecords={2}
          pageCount={1}
          currentPageIndex={0}
          onPaginationChange={() => {}}
          {...props}
        />
      </SidebarProvider>
    </MemoryRouter>
  )

const labelCellOf = (summaryRow: HTMLElement) =>
  within(summaryRow)
    .getAllByRole('cell')
    .find((cell) => cell.textContent?.includes('TỔNG CỘNG'))

describe('IncomeByRecipientTable', () => {
  it('renders the metric column headers', () => {
    setup()
    for (const header of ['Người nhận', 'Tổng tiền', 'BHXH', 'Thuế TNCN', 'Tổng tiền nhận']) {
      expect(screen.getByText(header)).toBeInTheDocument()
    }
  })

  it('links an employee recipient to the employee detail page', () => {
    setup()
    const link = screen.getByRole('link', { name: 'Nguyễn Văn Sale' })
    expect(link).toHaveAttribute('href', expect.stringContaining('/7'))
  })

  it('shows a collaborator (CTV) recipient with a CTV tag and no link', () => {
    setup()
    expect(screen.getByText('CTV')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Trần Thị CTV' })).toBeNull()
  })

  it('renders a totals row summing the whole filtered set, not the rendered rows', () => {
    setup()

    const summaryRow = screen.getByRole('row', { name: /TỔNG CỘNG/ })
    // The label carries the row count so the reader can tell page from filter.
    expect(summaryRow).toHaveTextContent('TỔNG CỘNG (2 bản ghi)')
    // Totals come from the `totals` prop (whole filtered set), not from summing what is on
    // screen — 25.000.000 ≠ the two rendered rows' 20.000.000 + 20.000.000.
    expect(summaryRow).toHaveTextContent('25.000.000')
    expect(summaryRow).toHaveTextContent('21.810.000')
  })

  it('đếm bản ghi theo TỔNG của bộ lọc, không theo số dòng đang hiển thị', () => {
    // Lỗi CR 86eyj435u: trang 1/3 của 51 bản ghi từng đọc ra "(25 bản ghi)" — đúng bằng page
    // size — vì nhãn đếm chính mảng dòng đã cắt lát. Nguồn số phải là tổng của cả bộ lọc.
    setup({ totalRecords: 51, pageCount: 3 })

    expect(screen.getByRole('row', { name: /TỔNG CỘNG/ })).toHaveTextContent(
      'TỔNG CỘNG (51 bản ghi)'
    )
  })

  it('gộp ô STT vào ô "TỔNG CỘNG" ở dòng tổng', () => {
    // `TableFooter` chỉ gộp được cột không đông cứng, nên bảng phải khai `sttFrozen={false}`.
    // Thiếu nó thì ô STT đứng riêng, trống trơn, cạnh nhãn — đúng hiện trạng CR mô tả.
    setup()

    const summaryRow = screen.getByRole('row', { name: /TỔNG CỘNG/ })
    const labelCell = labelCellOf(summaryRow)

    expect(labelCell).toHaveAttribute('colspan', '2')
    // Ô gộp vẫn mang danh tính của CỘT NHÃN, không đội lốt cột STT bị nuốt.
    expect(labelCell).toHaveAttribute('data-column-id', 'recipient_name')
  })
})
