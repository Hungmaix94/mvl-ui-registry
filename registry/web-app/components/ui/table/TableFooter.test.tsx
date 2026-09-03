import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'

// jsdom lacks ResizeObserver, which the Table/Sidebar layout relies on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import { Table } from '@/components/ui/table/Table'

type Row = { name: string; amount: number }

const rows: Row[] = [
  { name: 'Alpha', amount: 100 },
  { name: 'Beta', amount: 200 },
]

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Tên', cell: ({ row }) => row.original.name },
  {
    accessorKey: 'amount',
    header: 'Số tiền',
    cell: ({ row }) => String(row.original.amount),
    footer: () => '9.999',
    meta: { align: 'right' },
  },
]

const renderTable = (props: Record<string, unknown> = {}) =>
  render(
    <SidebarProvider>
      <Table
        data={rows}
        columns={columns}
        showSTT={false}
        enablePagination={false}
        showSummaryRow
        {...props}
      />
    </SidebarProvider>
  )

describe('Table summary row', () => {
  it('is not rendered unless showSummaryRow is set', () => {
    renderTable({ showSummaryRow: false })
    expect(screen.queryByRole('row', { name: /TỔNG CỘNG/ })).toBeNull()
  })

  it('renders column footers and the default label', () => {
    renderTable()
    const summaryRow = screen.getByRole('row', { name: /TỔNG CỘNG/ })
    expect(summaryRow).toHaveTextContent('TỔNG CỘNG')
    // The footer value comes from ColumnDef.footer — the table never sums `data` itself,
    // because on a server-paginated list `data` is only the current page.
    expect(summaryRow).toHaveTextContent('9.999')
  })

  it('appends the row count when given, so page and filter can be told apart', () => {
    renderTable({ summaryRowCount: 128 })
    expect(screen.getByRole('row', { name: /TỔNG CỘNG/ })).toHaveTextContent(
      'TỔNG CỘNG (128 bản ghi)'
    )
  })

  it('accepts a custom label', () => {
    renderTable({ summaryLabel: 'TỔNG KỲ' })
    expect(screen.getByRole('row', { name: /TỔNG KỲ/ })).toBeInTheDocument()
  })

  /**
   * Bảng chạy `table-layout: fixed` và mỗi ô bị ghim `width/minWidth/maxWidth` theo
   * `column.getSize()`, nên ô KHÔNG nở ra được. Ép `whitespace-nowrap` ở đây nghĩa là nhãn dài
   * hơn cột sẽ vẽ đè sang cột bên cạnh — đúng lỗi QA báo ở loạt màn Kế toán/Báo cáo. Nhãn phải
   * xuống dòng trong ô của nó.
   */
  it('nhãn tổng xuống dòng trong ô, không ép một dòng rồi tràn sang cột bên cạnh', () => {
    renderTable({ summaryRowCount: 128 })
    const summaryRow = screen.getByRole('row', { name: /TỔNG CỘNG/ })
    const labelCell = within(summaryRow)
      .getAllByRole('cell')
      .find((cell) => cell.textContent?.includes('TỔNG CỘNG'))

    expect(labelCell).toBeDefined()
    expect(labelCell).not.toHaveClass('whitespace-nowrap')
    expect(labelCell).toHaveClass('whitespace-normal')
    expect(within(summaryRow).getByText(/TỔNG CỘNG/)).not.toHaveClass('whitespace-nowrap')
  })

  it('nhãn tổng không được xếp trên cột đông cứng — hết tràn thì hết cần đè', () => {
    renderTable({ summaryRowCount: 128 })
    const summaryRow = screen.getByRole('row', { name: /TỔNG CỘNG/ })
    const labelCell = within(summaryRow)
      .getAllByRole('cell')
      .find((cell) => cell.textContent?.includes('TỔNG CỘNG'))

    // `z-50` chỉ tồn tại để phần chữ tràn không bị nền đục của ô bên cạnh che mất.
    expect(labelCell).not.toHaveClass('z-50')
  })

  const labelCellOf = (summaryRow: HTMLElement) =>
    within(summaryRow)
      .getAllByRole('cell')
      .find((cell) => cell.textContent?.includes('TỔNG CỘNG'))

  /** Dựng lại đúng hình dạng bảng báo cáo thật: cột STT trống đứng trước, cột số có `footer`. */
  const columnsWithStt = (sttMeta?: ColumnDef<Row>['meta']): ColumnDef<Row>[] => [
    { id: 'stt', header: 'STT', cell: () => '', meta: sttMeta },
    { accessorKey: 'name', header: 'Tên', cell: ({ row }) => row.original.name },
    {
      accessorKey: 'amount',
      header: 'Số tiền',
      cell: ({ row }) => String(row.original.amount),
      footer: () => '9.999',
      meta: { align: 'right' },
    },
  ]

  it('gộp nhãn với cột trống liền kề để nhãn đủ chỗ nằm một dòng', () => {
    // `stt` đứng trước nhãn và không có số liệu ⇒ nuốt vào ô nhãn.
    renderTable({ columns: columnsWithStt(), summaryRowCount: 4 })
    const summaryRow = screen.getByRole('row', { name: /TỔNG CỘNG/ })

    expect(labelCellOf(summaryRow)).toHaveAttribute('colspan', '2')
  })

  it('không gộp qua ranh giới cột đông cứng — vùng ghim của dòng tổng phải khớp thân bảng', () => {
    // `stt` đông cứng còn cột nhãn thì không: ô gộp chỉ mang được một offset, và vùng ghim của
    // tfoot sẽ rộng hơn thead/tbody ⇒ dòng tổng đè lên nội dung trôi qua khi cuộn ngang.
    renderTable({ columns: columnsWithStt({ frozen: true }), summaryRowCount: 4 })
    const summaryRow = screen.getByRole('row', { name: /TỔNG CỘNG/ })

    expect(labelCellOf(summaryRow)).not.toHaveAttribute('colspan')
  })

  it('vẫn gộp khi cả dải cùng đông cứng — bề rộng ô gộp bằng đúng vùng ghim của thân bảng', () => {
    // Hình dạng thật của màn 20.14: `stt` + hai cột định danh đều `frozen`, cột số đứng sau.
    // Cùng một kiểu ghim nên hai lý do cấm gộp ở trên đều không còn — nhãn được nằm một dòng
    // thay vì bị bó trong một cột và xuống hai dòng.
    renderTable({
      summaryRowCount: 4,
      columns: [
        { id: 'stt', header: 'STT', cell: () => '', meta: { frozen: true } },
        {
          accessorKey: 'name',
          header: 'Tên',
          cell: ({ row }) => row.original.name,
          meta: { frozen: true },
        },
        { id: 'code', header: 'Mã', cell: () => '', meta: { frozen: true } },
        {
          accessorKey: 'amount',
          header: 'Số tiền',
          cell: ({ row }) => String(row.original.amount),
          footer: () => '9.999',
          meta: { align: 'right' },
        },
      ] as ColumnDef<Row>[],
    })
    const summaryRow = screen.getByRole('row', { name: /TỔNG CỘNG/ })

    expect(labelCellOf(summaryRow)).toHaveAttribute('colspan', '3')
    // Danh tính vẫn là cột nhãn, không đội lốt `stt`, và cột số không bị nuốt.
    expect(labelCellOf(summaryRow)).toHaveAttribute('data-column-id', 'name')
    expect(summaryRow).toHaveTextContent('9.999')
  })

  it('ô gộp giữ danh tính của CỘT NHÃN, không đội lốt cột bị nuốt', () => {
    // Gộp sang trái thì ô bắt đầu ở `stt`. Nếu lấy id/`cellClassName` của `stt` thì ô nhãn thừa
    // hưởng style cột STT và không ai query được nó theo cột nhãn nữa.
    renderTable({ columns: columnsWithStt(), summaryRowCount: 4 })
    const summaryRow = screen.getByRole('row', { name: /TỔNG CỘNG/ })

    expect(labelCellOf(summaryRow)).toHaveAttribute('data-column-id', 'name')
  })

  it('không nuốt cột thao tác — dòng tổng không kéo dài xuống dưới chỗ có nút', () => {
    renderTable({
      summaryRowCount: 4,
      columns: [
        { accessorKey: 'name', header: 'Tên', cell: ({ row }) => row.original.name },
        { id: 'actions', header: '', cell: () => null },
      ] as ColumnDef<Row>[],
    })
    const summaryRow = screen.getByRole('row', { name: /TỔNG CỘNG/ })

    expect(labelCellOf(summaryRow)).not.toHaveAttribute('colspan')
  })

  it('không nuốt cột đang có số liệu', () => {
    // Cột `amount` có `footer` ⇒ dải gộp phải dừng lại trước nó, số không được biến mất.
    renderTable({ columns: columnsWithStt(), summaryRowCount: 4 })
    const summaryRow = screen.getByRole('row', { name: /TỔNG CỘNG/ })

    expect(within(summaryRow).getAllByRole('cell')).toHaveLength(2)
    expect(summaryRow).toHaveTextContent('9.999')
  })

  it('hides the row while loading, so a stale total is never shown', () => {
    renderTable({ isLoading: true })
    expect(screen.queryByRole('row', { name: /TỔNG CỘNG/ })).toBeNull()
  })

  it('hides the row when there is nothing to total', () => {
    renderTable({ data: [] })
    expect(screen.queryByRole('row', { name: /TỔNG CỘNG/ })).toBeNull()
  })
})
