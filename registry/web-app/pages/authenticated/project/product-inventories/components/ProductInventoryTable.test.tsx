import { describe, it, expect, vi } from 'vitest'

// Barrel `@/components/ui` kéo theo `src/lib/firebase.ts`, module này gọi `getMessaging()`
// ngay khi eval và ném trong jsdom (lỗi có sẵn). Chặn tại đây.
vi.mock('@/lib/firebase', () => ({
  default: null,
  getFCMToken: vi.fn(),
  onMessageListener: vi.fn(),
  messaging: null,
  analytics: null,
}))
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }))
vi.mock('firebase/analytics', () => ({ getAnalytics: vi.fn() }))
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  onMessage: vi.fn(),
  isSupported: vi.fn().mockResolvedValue(false),
}))

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { AbilityContext, defineAbilitiesFor } from '@/lib/ability'
import ProductInventoryTable from './ProductInventoryTable'

/**
 * `Table` thật được thay bằng stub chỉ phơi ra danh sách nhãn của `actions` — các test dưới đây
 * kiểm đúng một thứ: MỖI HÀNH ĐỘNG ĐƯỢC GATE BẰNG QUYỀN NÀO. Không kiểm cách bảng render.
 */
vi.mock('@/components/ui', () => ({
  // Prop là `rowActions` — KHÔNG phải `actions`. Bắt nhầm tên thì mảng luôn rỗng và mọi assert
  // dạng `not.toContain` xanh giả, đúng loại test rỗng cần tránh.
  // Stub cũng render THẬT `cell` của từng cột cho từng dòng dữ liệu, để test nội dung ô
  // (86eyqwr9u) — bọc bằng `<div>` chứ không `<li>`/`<p>`: `<li>` lẫn vào
  // `queryAllByRole('listitem')` mà nhóm test quyền phía dưới đang đếm, còn `<p>` thì ném
  // cảnh báo validateDOMNesting vì có cell render `<div>` bên trong.
  Table: ({
    rowActions,
    columns,
    data,
  }: {
    rowActions?: { label: string }[]
    columns?: any[]
    data?: any[]
  }) => (
    <>
      <ul data-testid="actions">
        {(rowActions ?? []).map((a) => (
          <li key={a.label}>{a.label}</li>
        ))}
      </ul>
      {(data ?? []).map((original, rowIndex) => (
        <div key={rowIndex} data-testid={`row-${rowIndex}`}>
          {(columns ?? []).map((col: any) => (
            <div key={col.id ?? col.accessorKey} data-testid={`cell-${col.id ?? col.accessorKey}`}>
              {typeof col.cell === 'function'
                ? // `getValue` đi kèm để một cột tương lai dùng `row.getValue()` không làm cả file
                  // test chết bằng "is not a function" — lỗi đó không nói gì về thứ đang được test.
                  col.cell({
                    row: { original, getValue: (key: string) => original?.[key] },
                  })
                : null}
            </div>
          ))}
        </div>
      ))}
    </>
  ),
  Chip: () => null,
}))
vi.mock('@/components/ui/table/TableError', () => ({ default: () => <div>error</div> }))
vi.mock('@/components/commons', () => ({ ReferenceCode: () => null }))
vi.mock('@/hooks/useAppConstant', () => ({ default: () => ({ keysMapOptions: new Map() }) }))
// Mock barrel `@/components/ui` cắt ngang một vòng import, làm `@/routes` chưa kịp khởi tạo
// APP_PATH khi module khác đọc tới (lỗi `reading 'PROPOSAL_MANAGE' of undefined`). Test này không
// quan tâm đường dẫn thật, nên trả path giả cho mọi key.
vi.mock('@/routes', () => ({
  APP_PATH: new Proxy({}, { get: (_t, k) => `/${String(k).toLowerCase()}` }),
}))
vi.mock('@/features/project/sale-allocations/hooks/useProductOptions', () => ({
  STATUS_VARIANTS: {},
}))

const renderWithPerms = (codes: string[]) =>
  render(
    <MemoryRouter>
      <AbilityContext.Provider
        value={defineAbilitiesFor(
          codes.map((code) => ({ code })),
          false
        )}
      >
        <ProductInventoryTable data={[]} isLoading={false} onDelete={vi.fn()} />
      </AbilityContext.Provider>
    </MemoryRouter>
  )

const labels = () => screen.queryAllByRole('listitem').map((li) => li.textContent)

describe('ProductInventoryTable — mỗi hành động gate bằng quyền mà nó gọi tới', () => {
  /**
   * Đây là chốt chặn cho bug 86eynyqfh (vế "không tồn tại nút xóa"): cả hai endpoint xoá căn
   * (`/product-inventories/{id}/` và `/sales-allocations/{sa_pk}/product-inventories/{id}/`) đều
   * đòi `product_inventory.destroy`. Đo trên 57 vai trò thật: 6 vai trò Kế toán có đúng quyền này
   * nhưng thiếu `project.destroy` — gate nhầm sang `project` là ẩn nút của họ.
   */
  it('mục "Xoá" hiện khi có product_inventory.destroy — đúng quyền endpoint đòi', () => {
    renderWithPerms(['product_inventory.destroy'])
    expect(labels()).toContain('Xoá')
  })

  it('mục "Xoá" KHÔNG hiện khi chỉ có project.destroy — quyền đó không xoá được căn', () => {
    renderWithPerms(['project.destroy'])
    expect(labels()).not.toContain('Xoá')
  })

  /**
   * Ngược lại, các mục điều hướng phải giữ subject `project`, vì route product-inventory khai
   * `permission: 'project.retrieve'` / `'project.update'` trong AppRoute.tsx. Đổi chúng sang
   * `product_inventory` là menu và route lệch nhau.
   */
  it('"Xem chi tiết" gate bằng project.retrieve — khớp permission của route đích', () => {
    renderWithPerms(['project.retrieve'])
    expect(labels()).toContain('Xem chi tiết')
  })

  it('"Xem chi tiết" KHÔNG hiện khi chỉ có product_inventory.retrieve', () => {
    renderWithPerms(['product_inventory.retrieve'])
    expect(labels()).not.toContain('Xem chi tiết')
  })

  it('các mục chỉnh sửa gate bằng project.update — khớp permission của route đích', () => {
    renderWithPerms(['project.update'])
    const l = labels()
    expect(l).toContain('Chỉnh sửa chung')
    expect(l).toContain('Cấu hình phí & thưởng')
    expect(l).toContain('Phân bổ chỉ tiêu')
    expect(l).toContain('Cấu hình sàn liên kết')
  })

  it('không có quyền nào thì menu rỗng', () => {
    renderWithPerms([])
    expect(labels()).toEqual([])
  })

  it('vai trò Kế toán (chỉ product_inventory.*) xoá được nhưng không sửa/xem qua menu', () => {
    renderWithPerms(['product_inventory.destroy', 'product_inventory.update'])
    const l = labels()
    expect(l).toContain('Xoá')
    expect(l).not.toContain('Chỉnh sửa chung')
  })
})

/**
 * ClickUp 86eyqwr9u — cột "Thông tin bán hàng" đọc `Mã - Tên` cho khớp ô chọn SA.
 * `sales_allocation` trên payload danh sách BĐS có sẵn `{id, code, name}` (đo thật 26/08 trên
 * `GET /api/realestate/product-inventories/`), nên đây thuần là chuyện FE chưa in ra mã.
 */
const renderRows = (data: any[]) =>
  render(
    <MemoryRouter>
      <AbilityContext.Provider value={defineAbilitiesFor([], false)}>
        <ProductInventoryTable data={data} isLoading={false} onDelete={vi.fn()} />
      </AbilityContext.Provider>
    </MemoryRouter>
  )

const saCellText = () => screen.getByTestId('cell-sales_allocation__name').textContent

describe('ProductInventoryTable — cột Thông tin bán hàng (86eyqwr9u)', () => {
  it('in "Mã - Tên" và vẫn là link sang chi tiết bảng hàng', () => {
    renderRows([
      { id: 1, sales_allocation: { id: 2176, code: 'SA-2026-002093', name: 'Bảng hàng Dự án A' } },
    ])
    expect(saCellText()).toBe('SA-2026-002093 - Bảng hàng Dự án A')
    expect(screen.getByRole('link', { name: /SA-2026-002093/ })).toBeInTheDocument()
  })

  it('đối chứng: cột "Diện tích" KHÔNG dính nhãn mã — chứng minh phép đo bắt đúng ô', () => {
    // Vế đối chứng của phép đo: nếu selector `cell-sales_allocation__name` trỏ nhầm ô thì
    // assert phía trên vẫn có thể xanh nhờ trùng hợp. Ô này phải in số, không in mã.
    renderRows([
      {
        id: 1,
        area: 120,
        sales_allocation: { id: 2176, code: 'SA-2026-002093', name: 'Bảng hàng Dự án A' },
      },
    ])
    expect(screen.getByTestId('cell-area').textContent).not.toContain('SA-2026-002093')
  })

  it('SA thiếu tên → in mỗi mã (không rơi về "-", không có đuôi " - " treo)', () => {
    renderRows([{ id: 1, sales_allocation: { id: 9, code: 'SA-2026-000009', name: '' } }])
    expect(saCellText()).toBe('SA-2026-000009')
  })

  it('không gắn bảng hàng → "-"', () => {
    renderRows([{ id: 1, sales_allocation: null }])
    expect(saCellText()).toBe('-')
  })
})
