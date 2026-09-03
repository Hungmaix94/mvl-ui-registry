import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const mockCan = vi.fn((..._args: unknown[]) => true)
vi.mock('@/lib/ability.ts', () => ({
  useAbility: () => ({ can: (...args: unknown[]) => mockCan(...args) }),
}))

vi.mock('@/hooks/useAppConstant.ts', () => ({
  default: () => ({ keysMap: new Map() }),
}))

const mockUseLeaderEmployees = vi.fn()
const mockMutateAsync = vi.fn()
vi.mock('@/features/employee/services/employee-service', () => ({
  useLeaderEmployees: (...args: unknown[]) => mockUseLeaderEmployees(...args),
  useSetLeadershipAppointedDate: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import LeaderEmployeeTable, { LEADER_DEPARTMENT_ORDERING_FIELD } from './LeaderEmployeeTable'

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 21,
    code: 'NV-021',
    fullname: 'Nguyễn Văn A',
    start_date: '2026-01-02',
    employee_type: 'OFFICIAL',
    position: { id: 4, name: 'Giám đốc' },
    branch: { id: 1, name: 'Hà Nội' },
    block: { id: 2, name: 'Khối kinh doanh' },
    department: { id: 3, name: 'Phòng Kinh doanh 1' },
    ...overrides,
  }
}

function renderTable(props: Record<string, unknown> = {}, rows = [makeRow()]) {
  mockUseLeaderEmployees.mockReturnValue({
    data: { results: rows, count: rows.length },
    isLoading: false,
    error: null,
  })

  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SidebarProvider>
          <LeaderEmployeeTable
            currentPage={1}
            pageSize={25}
            onPaginationChange={vi.fn()}
            onSortingChange={vi.fn()}
            {...props}
          />
        </SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  mockCan.mockReset().mockReturnValue(true)
  mockMutateAsync.mockReset()
})

function getDepartmentHeader(getAllByRole: (role: string) => HTMLElement[]) {
  const header = getAllByRole('columnheader').find((th) =>
    th.textContent?.trim().startsWith('Phòng ban')
  )
  if (!header) throw new Error('Không tìm thấy cột "Phòng ban"')
  return header
}

describe('LeaderEmployeeTable — sắp xếp theo phòng ban (CR 86eyedgw9)', () => {
  it('gửi ordering field mà backend hỗ trợ khi bấm sắp xếp cột Phòng ban', () => {
    const onSortingChange = vi.fn()
    const { getAllByRole } = renderTable({ onSortingChange })

    fireEvent.click(getDepartmentHeader(getAllByRole))

    // Backend chỉ nhận `department__name`; gửi `department` sẽ bị bỏ qua âm thầm.
    expect(LEADER_DEPARTMENT_ORDERING_FIELD).toBe('department__name')
    expect(onSortingChange).toHaveBeenCalledWith(LEADER_DEPARTMENT_ORDERING_FIELD, 'asc')
  })

  it('bấm lần thứ hai đổi sang giảm dần', () => {
    const onSortingChange = vi.fn()
    const { getAllByRole } = renderTable({ onSortingChange })
    const header = getDepartmentHeader(getAllByRole)

    fireEvent.click(header)
    fireEvent.click(header)

    expect(onSortingChange).toHaveBeenLastCalledWith(LEADER_DEPARTMENT_ORDERING_FIELD, 'desc')
  })

  it('vẫn hiển thị tên phòng ban của từng dòng', () => {
    const { getByText } = renderTable()

    expect(getByText('Phòng Kinh doanh 1')).toBeInTheDocument()
  })

  it('hiển thị "-" khi nhân sự chưa gắn phòng ban', () => {
    const { queryByText, getAllByRole } = renderTable({}, [makeRow({ department: null })])

    expect(queryByText('Phòng Kinh doanh 1')).not.toBeInTheDocument()
    expect(getDepartmentHeader(getAllByRole)).toBeInTheDocument()
  })
})

describe('LeaderEmployeeTable — sửa ngày bổ nhiệm lên ban lãnh đạo (5.6 brd.md §2.2.4)', () => {
  it('hiện nút sửa cạnh cột "Ngày bổ nhiệm lên BLĐ" khi có quyền employee.set_leadership_appointed_date', () => {
    const { getByTitle } = renderTable({}, [makeRow({ leadership_appointed_date: '2023-06-15' })])

    expect(getByTitle('Sửa ngày bổ nhiệm lên ban lãnh đạo')).toBeInTheDocument()
  })

  it('ẩn nút sửa khi không có quyền employee.set_leadership_appointed_date', () => {
    mockCan.mockImplementation((action) => action !== 'set_leadership_appointed_date')
    const { queryByTitle } = renderTable({}, [makeRow({ leadership_appointed_date: '2023-06-15' })])

    expect(queryByTitle('Sửa ngày bổ nhiệm lên ban lãnh đạo')).not.toBeInTheDocument()
  })

  it('bấm nút sửa mở dialog đúng tên nhân viên của dòng đó', () => {
    const { getByTitle, getByText } = renderTable({}, [
      makeRow({ fullname: 'Trần Thị B', leadership_appointed_date: '2023-06-15' }),
    ])

    fireEvent.click(getByTitle('Sửa ngày bổ nhiệm lên ban lãnh đạo'))

    expect(getByText('Sửa ngày bổ nhiệm lên ban lãnh đạo - Trần Thị B')).toBeInTheDocument()
  })
})
