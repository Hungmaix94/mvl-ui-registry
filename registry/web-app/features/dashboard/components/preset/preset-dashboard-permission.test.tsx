import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import PresetDashboard from './PresetDashboard'
import { DASHBOARD_PRESET } from '../../constants/dashboard-blocks'
import {
  ACCOUNTANT_DASHBOARD_ACTIONS,
  ACCOUNTANT_DASHBOARD_SUBJECT,
} from '@/features/dashboard/components/accounting/accountant-dashboard-constants'

/**
 * Bẫy mà test này canh: quyền xem một khối nằm ở component CHA, không nằm trong khối.
 * `DebtTrendChart` & co. gọi API ngay khi mount và không tự kiểm quyền. Nếu trang quên lọc theo
 * quyền, người thiếu quyền vẫn mount khối → gọi API → 403 im lặng. Nên phải khẳng định khối
 * KHÔNG ĐƯỢC RENDER, chứ không phải "render rồi ẩn".
 */

const mockCan = vi.fn()
vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: mockCan }) }))

// Cụm nào cũng bật trong test — FeatureGate được kiểm riêng ở test khác.
vi.mock('@/components/feature-gate/FeatureGate', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui', () => ({
  PageTitle: ({ title }: { title: string }) => <h1>{title}</h1>,
}))

// Mỗi khối thay bằng một thẻ nhận diện được — test này chỉ quan tâm khối CÓ mount hay KHÔNG.
// Factory phải viết inline: `vi.mock` được hoist lên đầu module nên không dùng được helper khai
// bên ngoài (ReferenceError: Cannot access 'stub' before initialization).
vi.mock('@/features/dashboard/components/exec/ExecKpiStrip', () => ({
  default: () => <div>BLOCK_ACCT_SUMMARY</div>,
}))
vi.mock('@/features/dashboard/components/exec/CollectionProgressBlock', () => ({
  default: () => <div>BLOCK_COLLECTION</div>,
}))
vi.mock('@/features/dashboard/components/exec/EmployeeKpiBlock', () => ({
  default: () => <div>BLOCK_EMPLOYEE_KPI</div>,
}))
vi.mock('@/features/dashboard/components/exec/DepartmentKpiBlock', () => ({
  default: () => <div>BLOCK_DEPARTMENT_KPI</div>,
}))
vi.mock('@/features/dashboard/components/exec/OperationsQueueBlock', () => ({
  default: () => <div>BLOCK_OPERATIONS_QUEUE</div>,
}))
vi.mock('@/features/dashboard/components/chart/AttendanceRateByBranchChart', () => ({
  default: () => <div>BLOCK_ATTENDANCE</div>,
}))
vi.mock('@/features/dashboard/components/accounting/DebtTrendChart', () => ({
  default: () => <div>BLOCK_DEBT_TREND</div>,
}))
vi.mock('@/features/dashboard/components/accounting/CommissionTrendChart', () => ({
  default: () => <div>BLOCK_COMMISSION_TREND</div>,
}))
vi.mock('@/features/dashboard/components/sales/RevenueTrendChart', () => ({
  default: () => <div>BLOCK_REVENUE_TREND</div>,
}))
vi.mock('@/features/dashboard/components/chart/StaffGrowthByBranchesChart', () => ({
  default: () => <div>BLOCK_STAFF_GROWTH</div>,
}))
vi.mock('@/features/dashboard/components/exec/KpiAchievementBlock', () => ({
  default: () => <div>BLOCK_KPI</div>,
}))
vi.mock('@/features/dashboard/components/exec/TopProjectsParetoBlock', () => ({
  default: () => <div>BLOCK_PARETO</div>,
}))

describe('PresetDashboard — gác quyền theo từng khối', () => {
  beforeEach(() => vi.clearAllMocks())

  it('đủ quyền: render mọi khối của preset điều hành', () => {
    mockCan.mockReturnValue(true)
    render(<PresetDashboard preset={DASHBOARD_PRESET.EXEC} title="Dashboard điều hành" />)

    // Liệt kê ĐỦ 8 khối chứ không lấy mẫu vài khối: preset này vừa bị cắt từ 12 xuống 8, và ca
    // lấy mẫu chính là ca đã im lặng khi khối bị gỡ khỏi registry.
    for (const label of [
      'BLOCK_ACCT_SUMMARY',
      'BLOCK_REVENUE_TREND',
      'BLOCK_KPI',
      'BLOCK_PARETO',
      'BLOCK_DEBT_TREND',
      'BLOCK_COLLECTION',
      'BLOCK_COMMISSION_TREND',
      'BLOCK_STAFF_GROWTH',
    ]) {
      expect(screen.getByText(label), `${label} không mount`).toBeInTheDocument()
    }
  })

  it('thiếu đúng quyền debt_trend: khối đó KHÔNG mount, các khối khác vẫn còn', () => {
    mockCan.mockImplementation(
      (action: string, subject: string) =>
        !(
          action === ACCOUNTANT_DASHBOARD_ACTIONS.DEBT_TREND &&
          subject === ACCOUNTANT_DASHBOARD_SUBJECT
        )
    )
    render(<PresetDashboard preset={DASHBOARD_PRESET.EXEC} title="Dashboard điều hành" />)

    expect(screen.queryByText('BLOCK_DEBT_TREND')).not.toBeInTheDocument()
    expect(screen.getByText('BLOCK_ACCT_SUMMARY')).toBeInTheDocument()
  })

  it('không có quyền dashboard nào: các khối gác quyền biến mất, trang vẫn render', () => {
    mockCan.mockReturnValue(false)
    render(<PresetDashboard preset={DASHBOARD_PRESET.EXEC} title="Dashboard điều hành" />)

    expect(screen.getByText('Dashboard điều hành')).toBeInTheDocument()
    // MỌI khối đều gác quyền — kể cả 3 khối không thuộc subject dashboard (KPI phòng ban, tăng
    // trưởng nhân sự, đề xuất quá hạn). Không khối nào được lọt qua.
    for (const label of [
      'BLOCK_ACCT_SUMMARY',
      'BLOCK_DEBT_TREND',
      'BLOCK_COMMISSION_TREND',
      'BLOCK_REVENUE_TREND',
      'BLOCK_KPI',
      'BLOCK_PARETO',
      'BLOCK_COLLECTION',
      'BLOCK_STAFF_GROWTH',
    ]) {
      expect(
        screen.queryByText(label),
        `${label} lọt qua dù không có quyền`
      ).not.toBeInTheDocument()
    }
  })
})
