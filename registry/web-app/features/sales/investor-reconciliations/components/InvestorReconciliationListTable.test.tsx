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
vi.mock('@/hooks/useAppConstant', () => ({ default: () => ({ keysMap: new Map() }) }))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import InvestorReconciliationListTable from './InvestorReconciliationListTable'
import type { InvestorReconciliationSheet } from '@/features/sales/investor-reconciliations/types/investor-reconciliation'

/**
 * Cột "Thành tiền (gồm VAT)" + dòng tổng trên danh sách Đối chiếu CĐT (CR 86eymqdfk).
 *
 * Luật đắt nhất được khoá ở đây: **dòng tổng đọc `summary` của BE, KHÔNG cộng các dòng đang
 * hiển thị.** BE tính trên toàn bộ kết quả lọc trước khi phân trang, nên trang 1 của một bộ lọc
 * 1468 phiếu chỉ chứa một phần rất nhỏ. Bản cộng tay sẽ ra một con số nhỏ hơn sự thật mà vẫn
 * trông hoàn toàn hợp lý — không có gì trên màn hình tố cáo nó. Test dưới đây cố ý cho `summary`
 * LỆCH HẲN tổng các dòng để bản cộng tay không thể đi lọt.
 */

function makeSheet(
  overrides: Partial<InvestorReconciliationSheet> = {}
): InvestorReconciliationSheet {
  return {
    id: 1,
    code: 'DCDT-T08-2026-001',
    status: 'draft',
    reconciliation_date: '2026-08-13',
    source_type: 'direct',
    total_amount_with_vat: '1250000000',
    ...overrides,
  } as unknown as InvestorReconciliationSheet
}

function renderTable(
  props: Partial<React.ComponentProps<typeof InvestorReconciliationListTable>> = {}
) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <InvestorReconciliationListTable data={[makeSheet()]} isLoading={false} {...props} />
      </SidebarProvider>
    </MemoryRouter>
  )
}

/**
 * `tfoot` mang role `rowgroup` và luôn là nhóm cuối (thead → tbody → tfoot). Lấy theo role thay vì
 * `querySelector` để không phụ thuộc vào thẻ, và **tự kiểm cái neo** ngay tại chỗ: nhóm lấy được
 * phải chứa nhãn "TỔNG CỘNG". Neo sai nhóm thì test đo tbody mà vẫn xanh — đúng kiểu hỏng mà
 * `conventions.md` cảnh báo với guard neo nhầm phần tử.
 */
function footerRow() {
  const groups = screen.getAllByRole('rowgroup')
  const footer = groups[groups.length - 1]
  expect(within(footer).getByText(/TỔNG CỘNG/)).toBeInTheDocument()
  return footer
}

describe('InvestorReconciliationListTable — cột Thành tiền (gồm VAT)', () => {
  it('hiện số tiền của từng phiếu theo định dạng VND', () => {
    renderTable({ data: [makeSheet({ total_amount_with_vat: '1250000000' })] })

    expect(screen.getByText('1.250.000.000')).toBeInTheDocument()
  })

  it('hiện "-" khi phiếu chưa có số tiền, không hiện 0', () => {
    renderTable({
      data: [makeSheet({ total_amount_with_vat: null as unknown as string })],
    })

    const row = screen.getByRole('row', { name: /DCDT-T08-2026-001/ })
    // 0 đồng là một con số có thật; "chưa có số" phải đọc khác hẳn, nếu không kế toán sẽ
    // coi phiếu thiếu dữ liệu là phiếu bằng không.
    expect(within(row).queryByText('0')).toBeNull()
  })

  it('có tiêu đề cột đúng như CR yêu cầu', () => {
    renderTable()

    expect(screen.getByRole('columnheader', { name: 'Thành tiền (gồm VAT)' })).toBeInTheDocument()
  })

  it('đứng TRƯỚC cột Trạng thái — hai màn CĐT/F2 phải đọc giống nhau', () => {
    renderTable()
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())
    const tien = headers.indexOf('Thành tiền (gồm VAT)')
    const trangThai = headers.indexOf('Trạng thái')

    expect(tien).toBeGreaterThan(-1)
    expect(trangThai).toBeGreaterThan(-1)
    expect(tien).toBeLessThan(trangThai)
  })
})

describe('InvestorReconciliationListTable — dòng tổng', () => {
  it('lấy tổng từ `summary` của BE chứ KHÔNG cộng các dòng đang hiển thị', () => {
    // Hai dòng trên trang cộng lại = 2.130.000.000; summary của cả bộ lọc lớn hơn nhiều.
    // Bản cộng tay sẽ in 2.130.000.000 và test này đỏ.
    renderTable({
      data: [
        makeSheet({ id: 1, total_amount_with_vat: '1250000000' }),
        makeSheet({ id: 2, code: 'DCDT-T08-2026-002', total_amount_with_vat: '880000000' }),
      ],
      totalRecords: 1468,
      summary: { total_amount_with_vat: '9999000000000' },
    })

    expect(within(footerRow()).getByText('9.999.000.000.000')).toBeInTheDocument()
    expect(within(footerRow()).queryByText('2.130.000.000')).toBeNull()
  })

  it('hiện "—" khi response chưa có `summary`, không hiện 0', () => {
    renderTable({ data: [makeSheet()], summary: undefined })

    expect(within(footerRow()).getByText('—')).toBeInTheDocument()
    expect(within(footerRow()).queryByText('0')).toBeNull()
  })

  it('tổng không đổi khi trang chỉ còn một dòng — phạm vi là bộ lọc, không phải trang', () => {
    const summary = { total_amount_with_vat: '9999000000000' }

    const { unmount } = renderTable({
      data: [makeSheet({ id: 1 }), makeSheet({ id: 2, code: 'DCDT-T08-2026-002' })],
      summary,
    })
    const twoRows = footerRow().textContent
    unmount()

    renderTable({ data: [makeSheet({ id: 1 })], summary })

    expect(footerRow().textContent).toBe(twoRows)
  })
})

describe('InvestorReconciliationListTable — canh lề cột tiền', () => {
  /**
   * Đo trên source chứ không trên DOM: `meta.align` đi qua nhiều lớp của `Table` trước khi thành
   * class, nên assert vào class là assert vào chi tiết cài đặt của component dùng chung. Thứ cần
   * khoá ở đây là KHAI BÁO — cột tiền phải khai `align: 'right'` (AGENTS.md § Table Header & Cell
   * Alignment Consistency), vì header lệch với ô số là đúng lỗi luật đó sinh ra để chặn.
   */
  it('cột total_amount_with_vat khai align right', () => {
    const source = readFileSync(resolve(__dirname, 'InvestorReconciliationListTable.tsx'), 'utf8')
    const columnBlock = source.slice(source.indexOf("id: 'total_amount_with_vat'"))

    expect(columnBlock).toContain("align: 'right'")
    // Tự kiểm cái neo: đoạn vừa cắt đúng là cột tiền, không phải cột khác trùng chuỗi.
    expect(columnBlock).toContain("header: 'Thành tiền (gồm VAT)'")
  })
})
