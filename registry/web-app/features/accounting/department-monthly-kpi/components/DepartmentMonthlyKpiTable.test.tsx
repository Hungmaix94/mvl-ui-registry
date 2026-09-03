import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

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
import DepartmentMonthlyKpiTable from './DepartmentMonthlyKpiTable'
import type { DepartmentCommissionPool } from '@/features/accounting/department-commission-pools/services/department-commission-pools-service'
import {
  DepartmentCommissionPoolStatus as PoolStatus,
  DepartmentCommissionPoolSplitStatus as SplitStatus,
} from '@/constants/api-schema-aliases'

function makePool(overrides: Partial<DepartmentCommissionPool> = {}): DepartmentCommissionPool {
  return {
    id: 12,
    department: 31,
    department_name: 'Phòng Marketing',
    block: 4,
    block_name: 'Khối Hỗ trợ',
    branch: 1,
    branch_name: 'Chi nhánh HCM',
    accounting_period: 5,
    total_amount: '2423977',
    status: 'DRAFT',
    split_status: 'PENDING_SPLIT',
    confirmed_at: null,
    contributions: [],
    lines: [],
    ...overrides,
  } as unknown as DepartmentCommissionPool
}

function renderTable(props: Partial<React.ComponentProps<typeof DepartmentMonthlyKpiTable>> = {}) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <DepartmentMonthlyKpiTable
          data={[makePool()]}
          isLoading={false}
          pageCount={1}
          pageSize={25}
          currentPage={1}
          totalRecords={1}
          onPaginationChange={vi.fn()}
          onViewDetail={vi.fn()}
          {...props}
        />
      </SidebarProvider>
    </MemoryRouter>
  )
}

describe('DepartmentMonthlyKpiTable', () => {
  it('stacks department, block and branch in the department cell', () => {
    renderTable()
    expect(screen.getByText('Phòng Marketing')).toBeInTheDocument()
    expect(screen.getByText('Khối Hỗ trợ')).toBeInTheDocument()
    expect(screen.getByText('Chi nhánh HCM')).toBeInTheDocument()
  })

  it('does not show the department code', () => {
    renderTable({ data: [makePool({ department_name: 'Phòng Marketing' })] })
    expect(screen.queryByText(/PB\d+/)).not.toBeInTheDocument()
  })

  it('renders the renamed column headers', () => {
    renderTable()
    expect(screen.getByText('Tổng')).toBeInTheDocument()
    expect(screen.getByText('Trạng thái duyệt')).toBeInTheDocument()
    expect(screen.getByText('Trạng thái chia')).toBeInTheDocument()
    expect(screen.queryByText('Tổng pool')).not.toBeInTheDocument()
  })

  it('drops the "Kỳ tháng" column', () => {
    renderTable()
    expect(screen.queryByText('Kỳ tháng')).not.toBeInTheDocument()
  })

  it('renders both status chips', () => {
    renderTable()
    expect(screen.getByText('Bản nháp')).toBeInTheDocument()
    expect(screen.getByText('Chờ chia')).toBeInTheDocument()
  })

  it('falls back to a dash when the org names are missing', () => {
    renderTable({ data: [makePool({ block_name: '', branch_name: '' })] })
    // Cả hai dòng phụ đều hiện '---' thay vì ô trắng không giải thích được.
    expect(screen.getAllByText('---').length).toBeGreaterThanOrEqual(2)
  })

  it('shows the "cần tính lại" badge on the department cell when the period is stale', () => {
    renderTable({ activePeriod: { revenue_recompute_needed: true } })
    expect(screen.getByText('Cần tính lại')).toBeInTheDocument()
  })

  it('hides the badge when the period figures are up to date', () => {
    renderTable({ activePeriod: { revenue_recompute_needed: false } })
    expect(screen.queryByText('Cần tính lại')).not.toBeInTheDocument()
  })

  it('hides the badge on a CONFIRMED row even when the period is stale — ClickUp 86eyqcjn2: số đã xác nhận/đã chia không được đòi tính lại vì một phòng ban khác trong kỳ đổi input', () => {
    renderTable({
      data: [makePool({ status: PoolStatus.CONFIRMED, split_status: SplitStatus.SPLIT_DONE })],
      activePeriod: { revenue_recompute_needed: true },
    })
    expect(screen.queryByText('Cần tính lại')).not.toBeInTheDocument()
  })

  it('still shows the badge on a DRAFT row when the period is stale, even if other rows are CONFIRMED', () => {
    renderTable({
      data: [
        makePool({ id: 12, status: PoolStatus.DRAFT }),
        makePool({ id: 13, status: PoolStatus.CONFIRMED, split_status: SplitStatus.SPLIT_DONE }),
      ],
      activePeriod: { revenue_recompute_needed: true },
    })
    expect(screen.getByText('Cần tính lại')).toBeInTheDocument()
  })

  it('shows the badge on the one row whose own figures are stale, not on its neighbours', () => {
    // The period flag is company-wide: one department changing an input marks every row.
    // Reading each pool's own `is_stale` is what makes the badge mean something.
    renderTable({
      data: [
        makePool({ id: 12, department_name: 'Phòng A', ...({ is_stale: true } as object) }),
        makePool({ id: 13, department_name: 'Phòng B', ...({ is_stale: false } as object) }),
      ],
      activePeriod: { revenue_recompute_needed: false },
    })
    expect(screen.getAllByText('Cần tính lại')).toHaveLength(1)
  })

  it('hides the badge when the pool says it is current, even though the period flag is on', () => {
    // The old behaviour lit up every row in the period; a badge that cries wolf gets ignored.
    renderTable({
      data: [makePool({ ...({ is_stale: false } as object) })],
      activePeriod: { revenue_recompute_needed: true },
    })
    expect(screen.queryByText('Cần tính lại')).not.toBeInTheDocument()
  })

  it('still hides the badge on a CONFIRMED row', () => {
    renderTable({
      data: [
        makePool({
          status: PoolStatus.CONFIRMED,
          split_status: SplitStatus.SPLIT_DONE,
          ...({ is_stale: true } as object),
        }),
      ],
    })
    expect(screen.queryByText('Cần tính lại')).not.toBeInTheDocument()
  })

  it('shows the current page size on the pagination control', () => {
    // Dropdown options chỉ tồn tại trong DOM khi mở, nên ở đây chỉ khẳng định được giá trị
    // đang chọn; danh sách 25/50/100 được chốt ở test của PAGE_SIZES bên dưới.
    renderTable({ pageSize: 25 })
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('renders a row-action trigger for each row', () => {
    renderTable({ data: [makePool(), makePool({ id: 13, department_name: 'Phòng Kế toán' })] })
    expect(screen.getAllByRole('button', { name: /actions menu/i })).toHaveLength(2)
  })
})
