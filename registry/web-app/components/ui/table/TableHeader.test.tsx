import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

type Row = { name: string; net: number; gross: number }

const rows: Row[] = [
  { name: 'Alpha', net: 100, gross: 110 },
  { name: 'Beta', net: 200, gross: 220 },
]

const flatColumns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Tên', cell: ({ row }) => row.original.name },
]

// Group column ⇒ hai tầng header. Đây là hình dạng làm lộ bug: TanStack đặt id cho header
// placeholder ở tầng trên là `${depth}_${column.id}`, khác với `column.id`.
const groupedColumns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Tên', cell: ({ row }) => row.original.name },
  {
    id: 'received_group',
    header: 'Thành tiền nhận về',
    columns: [
      { id: 'net', header: 'Chưa VAT', cell: ({ row }) => String(row.original.net) },
      { id: 'gross', header: 'Có VAT', cell: ({ row }) => String(row.original.gross) },
    ],
  },
]

const renderTable = (columns: ColumnDef<Row>[], props: Record<string, unknown> = {}) =>
  render(
    <SidebarProvider>
      <Table data={rows} columns={columns} showSTT sttFrozen enablePagination={false} {...props} />
    </SidebarProvider>
  )

describe('TableHeader frozen columns', () => {
  it('neo ô header của cột frozen bằng offset hợp lệ trên bảng header một tầng', () => {
    renderTable(flatColumns)

    expect(screen.getByRole('columnheader', { name: 'STT' })).toHaveStyle({ left: '0px' })
  })

  it('vẫn neo được khi bộ cột có group column (hai tầng header)', () => {
    renderTable(groupedColumns)

    // Group header và cột con cùng hiện diện ⇒ đúng là bảng hai tầng, ca cần test.
    expect(screen.getByRole('columnheader', { name: 'Thành tiền nhận về' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Chưa VAT' })).toBeInTheDocument()

    // Regression: trước đây offset tra theo `header.id` (`"0_stt"`) nên trả `undefined`,
    // sinh ra `left: "undefinedpx"` — trình duyệt bỏ qua và header trôi khi kéo ngang
    // trong khi thân bảng vẫn đứng yên.
    const sttHeader = screen.getByRole('columnheader', { name: 'STT' })
    expect(sttHeader).toHaveStyle({ left: '0px' })
    expect(sttHeader.style.left).not.toContain('undefined')
  })
})

describe('TableHeader select-all checkbox', () => {
  it('hiện ô "chọn tất cả" khi trang có ít nhất một dòng chọn được', () => {
    renderTable(flatColumns, {
      enableRowSelection: (row: { original: Row }) => row.original.name === 'Alpha',
    })

    // 1 ô ở header + 1 ô ở dòng Alpha; dòng Beta không chọn được nên không render ô nào.
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })

  it('ẩn ô "chọn tất cả" khi không dòng nào chọn được', () => {
    renderTable(flatColumns, { enableRowSelection: () => false })

    // Cột thân bảng đã trống thì ô check đầu bảng chỉ còn là nút bấm không tác dụng.
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })
})
