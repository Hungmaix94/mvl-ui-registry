import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
import DealTable from './DealTable'
import type { Deal } from '@/features/sales/deals/services/deal-service'

/** Bảng chỉ đọc một tập trường; fixture khai đúng phần dùng và cast MỘT lần ở biên test. */
function makeDeal(): Deal {
  return {
    id: 1,
    code: 'HD000001',
    status: 'active',
    project: { id: 9, name: 'Dự án A' },
    product_inventory: { id: 77, unit_number: 'A-12-05' },
  } as unknown as Deal
}

function renderTable() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <DealTable
          data={[makeDeal()]}
          isLoading={false}
          currentPage={1}
          pageSize={25}
          totalRecords={1}
        />
      </SidebarProvider>
    </MemoryRouter>
  )
}

/**
 * Cột ghim trái nhận `style.left` (cột `actions` ghim phải nên chỉ có `style.right`),
 * xem `TableHeader.tsx`. Đọc theo bề rộng ĐANG render thay vì khoá cứng pixel — đổi
 * `meta.width` của một cột thì test vẫn đúng, chỉ vỡ khi hành vi ghim thực sự hỏng.
 */
function readLeftFrozenHeaders() {
  return screen
    .getAllByRole('columnheader')
    .filter((th) => th.style.left !== '')
    .map((th) => ({
      name: th.textContent?.trim() ?? '',
      left: Number.parseFloat(th.style.left),
      width: Number.parseFloat(th.style.width),
    }))
}

/**
 * CR STT25 (`86eyh37hh`): "Mã căn" phải cố định cùng "Tên dự án" — KT sale dò bảng theo mã
 * căn nên kéo ngang tới các cột tiền không được mất dấu căn đang đọc.
 * CR STT28 (`86eykqg6j`): "Mã GD" bỏ ghim và chuyển xuống ngay sau "Mã căn".
 */
describe('DealTable — cột cố định (frozen)', () => {
  it('ghim đúng ba cột định danh, "Mã căn" là cột ghim cuối cùng', () => {
    renderTable()

    expect(readLeftFrozenHeaders().map((h) => h.name)).toEqual(['STT', 'Tên dự án', 'Mã căn'])
  })

  it('CR STT28: "Mã GD" không còn ghim và đứng ngay sau "Mã căn"', () => {
    renderTable()

    const headers = screen.getAllByRole('columnheader')
    const names = headers.map((th) => th.textContent?.trim() ?? '')
    // `indexOf` trần trả -1 khi cột biến mất, mà `-1` vẫn so sánh được ⇒ gỡ hẳn cột đi test
    // vẫn xanh, đúng thứ ca này sinh ra để bắt. Ném lỗi ngay tại chỗ không tìm thấy.
    const at = (name: string) => {
      const i = names.indexOf(name)
      if (i < 0) throw new Error(`không có cột "${name}" trên bảng`)
      return i
    }
    const dealCodeHeader = headers[at('Mã GD')]

    expect(at('Mã GD')).toBe(at('Mã căn') + 1)
    // Mọi header đều `sticky top-0` (ghim dọc), nên dấu hiệu ghim NGANG duy nhất là
    // `style.left` — bỏ ghim thì offset phải trống, không phải "0px".
    expect(dealCodeHeader.style.left).toBe('')
    expect(screen.getByRole('cell', { name: /HD000001/ }).style.left).toBe('')
  })

  it('xếp offset liền mạch — không hở, không chồng lấn', () => {
    renderTable()

    const frozen = readLeftFrozenHeaders()
    let expectedLeft = 0
    for (const header of frozen) {
      expect({ name: header.name, left: header.left }).toEqual({
        name: header.name,
        left: expectedLeft,
      })
      expect(header.width).toBeGreaterThan(0)
      expectedLeft += header.width
    }
  })

  it('neo ô dữ liệu "Mã căn" trùng offset với header của nó', () => {
    renderTable()

    const header = readLeftFrozenHeaders().find((h) => h.name === 'Mã căn')
    const cell = screen.getByRole('cell', { name: 'A-12-05' })

    expect(cell).toHaveAttribute('data-column-id', 'product_inventory')
    expect(cell).toHaveClass('sticky')
    // Thiếu offset thì browser bỏ qua `left: "undefinedpx"` — header đứng yên còn ô thì trôi.
    expect(cell.style.left).not.toContain('undefined')
    expect(Number.parseFloat(cell.style.left)).toBe(header?.left)
  })

  it('vẫn render giá trị mã căn dưới dạng link tới sản phẩm', () => {
    renderTable()

    expect(screen.getByRole('link', { name: 'A-12-05' })).toBeInTheDocument()
  })
})
