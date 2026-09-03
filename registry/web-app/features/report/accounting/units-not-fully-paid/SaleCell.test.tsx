import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { UnitsNotFullyPaidSale } from '@/features/accounting/reports/services/report-service'
// Lấy thẳng từ module hằng số: qua barrel `@/routes` sẽ kéo cả `appRouter` và vòng import
// làm `APP_PATH` chưa kịp khởi tạo trong môi trường test.
import { APP_PATH } from '@/routes/AppRoute.constant'

import SaleCell from './SaleCell'

/**
 * `@/routes` (barrel) re-export `appRouter` từ `AppRoute`, module này kéo cả cây route rồi vòng
 * ngược về chính nó qua `BreadcrumbWrapper` ⇒ `APP_PATH` chưa kịp khởi tạo. Chặn ngay ở module
 * nặng đó; `APP_PATH` vẫn là hàng thật vì nó nằm ở `AppRoute.constant`, không bị mock.
 */
vi.mock('@/routes/AppRoute', () => ({
  appRouter: {},
  ROUTE_SCOPE: {},
  generateBreadcrumbItems: () => [],
}))

/** Chỉ `EmployeeProfileLink` hỏi `ability` bên trong; CTV/sàn nhận quyền qua prop. */
const canMock = vi.fn()
vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: canMock }) }))

const sale = (patch: Partial<UnitsNotFullyPaidSale> = {}): UnitsNotFullyPaidSale => ({
  name: 'Nguyễn Văn An',
  department: null,
  participation_pct: '60.00',
  employee_id: null,
  collaborator_id: null,
  exchange_id: null,
  ...patch,
})

const renderCell = (
  sales: UnitsNotFullyPaidSale[],
  perms: { canViewCollaborator?: boolean; canViewExchange?: boolean } = {}
) =>
  render(
    <SaleCell
      sales={sales}
      canViewCollaborator={perms.canViewCollaborator ?? true}
      canViewExchange={perms.canViewExchange ?? true}
    />
  )

beforeEach(() => {
  canMock.mockReset()
  canMock.mockReturnValue(true)
})

describe('SaleCell — link theo đúng loại đối tượng', () => {
  it('nhân viên MV dẫn sang hồ sơ nhân viên', () => {
    renderCell([sale({ employee_id: 7 })])
    expect(screen.getByRole('link', { name: 'Nguyễn Văn An' })).toHaveAttribute(
      'href',
      APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', '7')
    )
  })

  it('CTV dẫn sang chi tiết cộng tác viên', () => {
    renderCell([sale({ name: 'CTV Bích', collaborator_id: 12 })])
    expect(screen.getByRole('link', { name: 'CTV Bích' })).toHaveAttribute(
      'href',
      APP_PATH.COLLABORATOR_DETAIL.replace(':id', '12')
    )
  })

  it('sàn F2 dẫn sang chi tiết sàn', () => {
    renderCell([sale({ name: 'Sàn T123', exchange_id: 5 })])
    expect(screen.getByRole('link', { name: 'Sàn T123' })).toHaveAttribute(
      'href',
      APP_PATH.EXCHANGE_MANAGEMENT_DETAIL.replace(':id', '5')
    )
  })

  it('mở tab mới và chặn rò referrer', () => {
    renderCell([sale({ employee_id: 7 })])
    const link = screen.getByRole('link', { name: 'Nguyễn Văn An' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })
})

describe('SaleCell — không đủ quyền thì KHÔNG dựng link', () => {
  it('thiếu quyền xem nhân viên ⇒ tên là text thường', () => {
    canMock.mockReturnValue(false)
    renderCell([sale({ employee_id: 7 })])
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
  })

  it('thiếu quyền xem CTV ⇒ tên là text thường', () => {
    renderCell([sale({ name: 'CTV Bích', collaborator_id: 12 })], { canViewCollaborator: false })
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('CTV Bích')).toBeInTheDocument()
  })

  it('thiếu quyền xem sàn ⇒ tên là text thường', () => {
    renderCell([sale({ name: 'Sàn T123', exchange_id: 5 })], { canViewExchange: false })
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Sàn T123')).toBeInTheDocument()
  })

  it('không có id nào ⇒ tên là text thường dù có đủ quyền', () => {
    renderCell([sale()])
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
  })
})

describe('SaleCell — nội dung khối', () => {
  it('hiện tỷ lệ tham gia và phòng ban có nhãn', () => {
    renderCell([sale({ employee_id: 7, department: 'Kinh doanh 1' })])
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('Phòng ban: Kinh doanh 1')).toBeInTheDocument()
  })

  it('bỏ hẳn dòng phòng ban khi sale không thuộc phòng nào', () => {
    renderCell([sale({ exchange_id: 5 })])
    expect(screen.queryByText(/Phòng ban:/)).toBeNull()
  })

  it('liệt kê mọi sale của căn', () => {
    renderCell([
      sale({ name: 'A', employee_id: 1, participation_pct: '60.00' }),
      sale({ name: 'B', collaborator_id: 2, participation_pct: '40.00' }),
    ])
    expect(screen.getAllByRole('link').map((el) => el.textContent)).toEqual(['A', 'B'])
  })

  it('căn chưa có sale trên HĐ cọc thì hiện dấu gạch', () => {
    renderCell([])
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
