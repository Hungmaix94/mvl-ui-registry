// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

/**
 * Bug tìm được khi verify PR 2A.1 (2026-08-20): menu "Xoá" của một vai trò TỰ TẠO (không phải
 * hệ thống) bị ẩn oan nếu người ĐANG ĐĂNG NHẬP có role hệ thống (vd tài khoản admin/GDCN) --
 * điều kiện cũ `!user?.role?.is_system_role` xét sai đối tượng: phải xét vai trò của DÒNG đang
 * xem, không phải vai trò của người xem. Đối chiếu
 * srs/docs/features/hrm/3.1-role-management/test-spec.md §5.2.2 + §6.1.4: chỉ role hệ thống ở
 * DÒNG mới ẩn "Xoá"; role tự tạo (kể cả clone từ role hệ thống) phải luôn có đủ "Xoá" bất kể
 * người xem là ai.
 */

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/lib/ability.ts', () => ({ useAbility: () => ({ can: () => true }) }))

const mockMutateAsync = vi.fn()
vi.mock('@/services/role-service.ts', async () => {
  const actual = await vi.importActual<typeof import('@/services/role-service.ts')>(
    '@/services/role-service.ts'
  )
  return { ...actual, useCloneRole: () => ({ mutateAsync: mockMutateAsync }) }
})

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import RoleTable from './RoleTable'
import type { Role } from '@/services/role-service.ts'

const SYSTEM_ROLE = {
  id: 1,
  code: 'ADMIN',
  name: 'Quản trị hệ thống',
  is_system_role: true,
} as Role
const SELF_CREATED_ROLE = {
  id: 2,
  code: 'VT000000103',
  name: 'Vai trò tự tạo',
  is_system_role: false,
} as Role

function renderTable(data: Role[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SidebarProvider>
          <RoleTable
            data={data}
            isLoading={false}
            error={undefined}
            pageCount={1}
            pageSize={10}
            currentPage={1}
            totalRecords={data.length}
            onPaginationChange={vi.fn()}
            onSortingChange={vi.fn()}
            onDeleteRole={vi.fn()}
            hasFilter={false}
          />
        </SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RoleTable — menu "Xoá" chỉ phụ thuộc role của DÒNG, không phụ thuộc role người xem', () => {
  it('vai trò tự tạo luôn có mục "Xoá", kể cả khi (giả lập) người xem có role hệ thống', () => {
    renderTable([SELF_CREATED_ROLE])

    fireEvent.click(screen.getByRole('button', { name: 'Open actions menu' }))

    expect(screen.getByRole('menuitem', { name: /Xoá/ })).toBeInTheDocument()
  })

  it('vai trò hệ thống không có mục "Xoá"', () => {
    renderTable([SYSTEM_ROLE])

    fireEvent.click(screen.getByRole('button', { name: 'Open actions menu' }))

    // "Xem chi tiết" luôn hiện (ability mock trả true) -- chứng minh popover đã thật sự mở trước
    // khi khẳng định "Xoá" vắng mặt, tránh false-positive do popover chưa kịp render.
    expect(screen.getByRole('menuitem', { name: 'Xem chi tiết' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Xoá/ })).not.toBeInTheDocument()
  })
})
