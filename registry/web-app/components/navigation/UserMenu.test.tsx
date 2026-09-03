import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// `@/routes` là barrel re-export cả `AppRoute.tsx`, module kéo theo `src/api/schema.ts` (~5MB)
// qua cây trang — nạp thật trong test rất chậm (cùng lý do đã ghi ở `route-permission.test.tsx`).
// UserMenu chỉ cần đúng MỘT hằng số đường dẫn nên mock gọn barrel này.
vi.mock('@/routes', () => ({
  APP_PATH: { CHANGE_PASSWORD: '/change-password' },
}))

const mockLogout = vi.fn()
vi.mock('@/hooks/useAuth.ts', () => ({
  useAuthOperations: () => ({ logout: mockLogout }),
}))

const mockUseAuth = vi.fn()
vi.mock('@/store', () => ({
  useAuth: () => mockUseAuth(),
}))

import UserMenu from './UserMenu'

type MockPosition = string | { name?: string } | null | undefined
type MockRole = { name?: string | null } | null | undefined

function renderUserMenu(user: {
  full_name?: string
  employee?: { position?: MockPosition } | null
  role?: MockRole
}) {
  mockUseAuth.mockReturnValue({ user })
  return render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>
  )
}

/**
 * Nhóm 0 / PR 0.3 — canary cho việc đọc `user.role?.name` (số ít) trong `getUserPositionLabel`
 * (`src/components/navigation/UserMenu.tsx` dòng ~17). Hôm nay `Me.role` là một `RoleSummary`
 * object số ít (xem `src/api/schema.ts`). Khi backend đổi sang trả về danh sách nhiều role,
 * `user.role` sẽ không còn là object đơn — ca test "CANARY" bên dưới phải ĐỎ để buộc sửa lại
 * UserMenu, thay vì âm thầm hiển thị nhãn rỗng/sai.
 */
describe('UserMenu — nhãn vị trí hiển thị (getUserPositionLabel)', () => {
  it('ưu tiên employee.position dạng chuỗi khi có', () => {
    renderUserMenu({
      full_name: 'Nguyễn Văn A',
      employee: { position: 'Trưởng phòng Kinh doanh' },
      role: { name: 'Quản trị viên' },
    })

    expect(screen.getByText('Trưởng phòng Kinh doanh')).toBeInTheDocument()
    expect(screen.queryByText('Quản trị viên')).not.toBeInTheDocument()
  })

  it('employee.position dạng object { name } vẫn đọc được', () => {
    renderUserMenu({
      full_name: 'Nguyễn Văn B',
      employee: { position: { name: 'Nhân viên kinh doanh' } },
      role: { name: 'Kinh doanh' },
    })

    expect(screen.getByText('Nhân viên kinh doanh')).toBeInTheDocument()
  })

  it('CANARY: không có employee.position → rơi về user.role.name (object số ít hôm nay)', () => {
    renderUserMenu({
      full_name: 'Nguyễn Văn C',
      employee: null,
      role: { name: 'Khách' },
    })

    expect(screen.getByText('Khách')).toBeInTheDocument()
  })

  it('không có cả employee.position lẫn role.name → hiển thị dấu gạch ngang', () => {
    renderUserMenu({
      full_name: 'Nguyễn Văn D',
      employee: null,
      role: null,
    })

    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('user null → không lỗi, không hiện nhãn vị trí', () => {
    mockUseAuth.mockReturnValue({ user: null })
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    )

    expect(screen.getByText('-')).toBeInTheDocument()
  })
})
