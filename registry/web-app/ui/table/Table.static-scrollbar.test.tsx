import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
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

type Row = { name: string }

const rows: Row[] = [{ name: 'Alpha' }, { name: 'Beta' }]
const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Tên', cell: ({ row }) => row.original.name },
]

const renderTable = (props: Record<string, unknown> = {}) =>
  render(
    <SidebarProvider>
      <Table data={rows} columns={columns} showSTT={false} {...props} />
    </SidebarProvider>
  )

// Track (rãnh) của HorizontalScrollBar. Thumb chỉ vẽ khi nội dung rộng hơn khung — jsdom không có
// layout nên thumb luôn vắng; track thì luôn dựng, nên track là thứ đúng để khẳng định "có thanh kéo".
//
// Vì sao phải `querySelector` chứ không dùng truy vấn của Testing Library: track là phần tử thuần
// trang trí — không role, không nhãn, không text — nên `getByRole`/`getByText` không có gì để bám.
// Cùng lý do và cùng cách xử lý như `ImportedBonusUploadDialog.test.tsx`.
const findTrack = (container: HTMLElement) =>
  // eslint-disable-next-line testing-library/no-node-access
  container.querySelector('div.h-2.w-full.bg-data-light-grey-default')

const findPagination = (container: HTMLElement) =>
  // eslint-disable-next-line testing-library/no-node-access
  container.querySelector(
    '[class*="fixed"][class*="bottom-0"] select, [class*="fixed"][class*="bottom-0"] button'
  )

describe('Table — thanh cuộn ngang ở chế độ paginationPosition="static"', () => {
  it('vẫn dựng thanh cuộn ngang khi bảng TẮT phân trang', () => {
    // Đây là ca hồi quy: trước đây cả khối đáy nằm sau `enablePagination &&`, nên bảng báo cáo
    // tắt phân trang thì mất luôn thanh kéo ngang dù đã khai đủ `paginationPosition="static"`.
    const { container } = renderTable({
      enablePagination: false,
      paginationPosition: 'static',
      disableInnerOverflow: true,
    })

    expect(findTrack(container)).not.toBeNull()
  })

  it('không dựng thanh phân trang khi bảng TẮT phân trang', () => {
    // Mặt còn lại: khối đáy render không điều kiện thì bảng đã tắt phân trang sẽ MỌC LẠI thanh
    // phân trang, đè lên phân trang riêng của các màn báo cáo.
    const { container } = renderTable({
      enablePagination: false,
      paginationPosition: 'static',
      disableInnerOverflow: true,
    })

    expect(findPagination(container)).toBeNull()
  })

  it('dựng CẢ thanh cuộn ngang lẫn thanh phân trang khi bảng BẬT phân trang', () => {
    const { container } = renderTable({
      enablePagination: true,
      paginationPosition: 'static',
      disableInnerOverflow: true,
      totalRecords: 2,
    })

    expect(findTrack(container)).not.toBeNull()
    expect(findPagination(container)).not.toBeNull()
  })

  it('không dựng thanh cuộn ngang ở chế độ mặc định "fixed"', () => {
    // Mặc định phải giữ nguyên hành vi cũ — 60 bảng đang tắt phân trang mà không khai `static`
    // không được đổi gì.
    const { container } = renderTable({ enablePagination: false })

    expect(findTrack(container)).toBeNull()
  })
})
