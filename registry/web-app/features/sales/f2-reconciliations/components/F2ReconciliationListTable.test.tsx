import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: () => true }) }))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import F2ReconciliationListTable from './F2ReconciliationListTable'
import type { F2ReconciliationSheet } from '@/features/sales/f2-reconciliations/types/f2-reconciliation'

/**
 * Cột "Thành tiền (gồm VAT)" + dòng tổng trên danh sách Đối chiếu F2 (CR 86eymqdfk).
 *
 * Hai màn CĐT và F2 phải hành xử GIỐNG NHAU ở chỗ này — cùng một CR, cùng một hợp đồng API. Đó là
 * lý do file này lặp lại các ca của `InvestorReconciliationListTable.test.tsx` thay vì tin rằng
 * "đã test bên kia rồi": hai bảng là hai component riêng, sửa một bên không kéo bên kia theo.
 */

function makeSheet(overrides: Partial<F2ReconciliationSheet> = {}): F2ReconciliationSheet {
  return {
    id: 1,
    code: 'FRS-2026-000001',
    status: 'draft',
    reconciliation_date: '2026-08-13',
    total_amount_with_vat: '330000000',
    ...overrides,
  } as unknown as F2ReconciliationSheet
}

function renderTable(props: Partial<React.ComponentProps<typeof F2ReconciliationListTable>> = {}) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <F2ReconciliationListTable data={[makeSheet()]} isLoading={false} {...props} />
      </SidebarProvider>
    </MemoryRouter>
  )
}

/** Xem ghi chú cùng tên ở `InvestorReconciliationListTable.test.tsx`. */
function footerRow() {
  const groups = screen.getAllByRole('rowgroup')
  const footer = groups[groups.length - 1]
  expect(within(footer).getByText(/TỔNG CỘNG/)).toBeInTheDocument()
  return footer
}

describe('F2ReconciliationListTable — cột Thành tiền (gồm VAT)', () => {
  it('hiện số tiền của từng phiếu theo định dạng VND', () => {
    renderTable({ data: [makeSheet({ total_amount_with_vat: '330000000' })] })

    expect(screen.getByText('330.000.000')).toBeInTheDocument()
  })

  it('có tiêu đề cột đúng như CR yêu cầu', () => {
    renderTable()

    expect(screen.getByRole('columnheader', { name: 'Thành tiền (gồm VAT)' })).toBeInTheDocument()
  })

  it('đứng TRƯỚC cột Trạng thái (thứ tự user chốt 18/08)', () => {
    renderTable()
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())
    const tien = headers.indexOf('Thành tiền (gồm VAT)')
    const trangThai = headers.indexOf('Trạng thái')

    expect(tien).toBeGreaterThan(-1)
    expect(trangThai).toBeGreaterThan(-1)
    expect(tien).toBeLessThan(trangThai)
  })
})

describe('F2ReconciliationListTable — dòng tổng', () => {
  it('lấy tổng từ `summary` của BE chứ KHÔNG cộng các dòng đang hiển thị', () => {
    renderTable({
      data: [
        makeSheet({ id: 1, total_amount_with_vat: '330000000' }),
        makeSheet({ id: 2, code: 'FRS-2026-000002', total_amount_with_vat: '120000000' }),
      ],
      totalRecords: 91,
      summary: { total_amount_with_vat: '7777000000000' },
    })

    expect(within(footerRow()).getByText('7.777.000.000.000')).toBeInTheDocument()
    expect(within(footerRow()).queryByText('450.000.000')).toBeNull()
  })

  it('hiện "—" khi response chưa có `summary`, không hiện 0', () => {
    renderTable({ data: [makeSheet()], summary: undefined })

    expect(within(footerRow()).getByText('—')).toBeInTheDocument()
  })
})

describe('F2ReconciliationListTable — canh lề và ghim cột', () => {
  const source = () => readFileSync(resolve(__dirname, 'F2ReconciliationListTable.tsx'), 'utf8')
  const blockOf = (id: string) => {
    const src = source()
    const start = src.indexOf(`id: '${id}'`)
    expect(start, `không tìm thấy cột ${id}`).toBeGreaterThan(-1)
    // Cắt tới dấu mở của cột kế tiếp để không đọc lẫn khai báo của cột khác.
    const next = src.indexOf('      {\n', start)
    return src.slice(start, next > start ? next : undefined)
  }

  it('cột total_amount_with_vat khai align right', () => {
    const block = blockOf('total_amount_with_vat')

    expect(block).toContain("align: 'right'")
    // Tự kiểm cái neo: đoạn vừa cắt đúng là cột tiền.
    expect(block).toContain("header: 'Thành tiền (gồm VAT)'")
  })

  /**
   * Bảng F2 rộng hơn khung 1440px (đo 18/08: 1442px, thừa ~148px trong khung cuộn). Nếu không ghim,
   * ở vị trí cuộn mặc định người dùng KHÔNG thấy số tiền, dòng tổng, lẫn trạng thái phiếu — tức mất
   * đúng thứ CR sinh ra để hiện. User chốt ghim CẢ HAI cột (18/08). Guard này để việc gỡ ghim phải
   * là một quyết định có ý thức, không phải hệ quả phụ của lần dọn `meta` nào đó.
   */
  it('ghim mép phải cả cột tiền lẫn cột trạng thái', () => {
    expect(blockOf('total_amount_with_vat')).toContain('frozenRight: true')
    expect(blockOf('status')).toContain('frozenRight: true')
  })

  it('cột trạng thái có bề rộng xác định — cột sticky không dùng được flex-1', () => {
    const block = blockOf('status')

    expect(block).toMatch(/width: 'w-\[\d+px\]'/)
    expect(block).not.toContain("width: 'flex-1'")
  })
})
