import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

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
// Cascade tự gọi API tổ chức; thay bằng stub để test tập trung vào phần field có điều kiện.
vi.mock('@/components/commons/filters/CascadeSelectGroupOrganization.tsx', () => ({
  CascadeSelectGroupOrganization: () => <div data-testid="cascade" />,
}))

import DepartmentMonthlyKpiFilter from './DepartmentMonthlyKpiFilter'

/**
 * Component này phục vụ HAI màn với hai bộ field khác nhau:
 * - "Hoa hồng quản lý khối back" → showStatus (mặc định)
 * - "Hoa hồng theo doanh thu" (`CommissionByRevenuePage`) → showStatus={false} + showKpiFlags
 *
 * Bỏ một trong hai prop sẽ âm thầm đổi field của màn kia — cả hai prop đều optional nên
 * `tsc` không kêu, test này là chốt chặn duy nhất.
 */
describe('DepartmentMonthlyKpiFilter', () => {
  it('shows both pool status filters by default (dept-monthly pool screen)', () => {
    render(<DepartmentMonthlyKpiFilter />)
    expect(screen.getByText('Trạng thái duyệt')).toBeInTheDocument()
    expect(screen.getByText('Trạng thái chia')).toBeInTheDocument()
  })

  it('hides the KPI flags unless asked for', () => {
    render(<DepartmentMonthlyKpiFilter />)
    expect(screen.queryByText('Doanh số')).not.toBeInTheDocument()
    expect(screen.queryByText('Tình trạng tính toán')).not.toBeInTheDocument()
  })

  it('renders the KPI flags and no pool status when the revenue screen configures it', () => {
    render(<DepartmentMonthlyKpiFilter showStatus={false} showKpiFlags />)
    expect(screen.getByText('Doanh số')).toBeInTheDocument()
    expect(screen.getByText('Tình trạng tính toán')).toBeInTheDocument()
    expect(screen.queryByText('Trạng thái duyệt')).not.toBeInTheDocument()
    expect(screen.queryByText('Trạng thái chia')).not.toBeInTheDocument()
  })

  it('always renders the org cascade', () => {
    render(<DepartmentMonthlyKpiFilter />)
    expect(screen.getByTestId('cascade')).toBeInTheDocument()
  })
})
