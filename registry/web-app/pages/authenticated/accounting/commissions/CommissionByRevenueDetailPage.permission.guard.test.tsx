import { describe, it, expect, vi, beforeEach } from 'vitest'

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

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import { AbilityContext, defineAbilitiesFor } from '@/lib/ability'

/**
 * `Table` thật được thay bằng stub chỉ phơi ra nhãn của `rowActions`. Test dưới đây kiểm đúng
 * MỘT thứ: trang giao cho `Table` những hành động nào, ứng với bộ quyền nào. Việc `Table` bỏ
 * luôn nút ⋯ khi mảng rỗng là hợp đồng của chính nó (`TableRow.tsx` — `rowActions.length > 0`),
 * không phải thứ test này chứng minh.
 *
 * Prop là `rowActions` — KHÔNG phải `actions`. Bắt nhầm tên thì mảng luôn rỗng và mọi assert
 * dạng `not.toContain` xanh giả, đúng loại test rỗng cần tránh; test "đủ quyền ⇒ HIỆN" ở dưới
 * chính là vế đối chứng bắt được chuyện đó.
 */
vi.mock('@/components/ui', () => ({
  Table: ({ rowActions }: { rowActions?: { label: string }[] }) => (
    <ul data-testid="actions">
      {(rowActions ?? []).map((a) => (
        <li key={a.label}>{a.label}</li>
      ))}
    </ul>
  ),
  PageTitle: () => null,
  Button: () => null,
  Chip: () => null,
}))
vi.mock('@/components/commons/DetailPageWrapper', () => ({
  DetailPageWrapper: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/commons', () => ({ ReferenceCode: () => null }))
vi.mock('@/components/commons/EmployeeProfileLink', () => ({ default: () => null }))
vi.mock('@/components/dialog/AppDialog', () => ({ default: () => null }))
vi.mock('@/features/accounting/employee-monthly-kpi/components/EmployeeMonthlyKpiFilter', () => ({
  EmployeeMonthlyKpiFilter: () => null,
  EMPLOYEE_MONTHLY_KPI_FILTER_FIELDS: ['employee', 'position', 'employee_type_snapshot'],
}))
vi.mock('@/services/toast-service', () => ({
  default: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}))
// Mock barrel `@/components/ui` cắt ngang một vòng import, làm `@/routes` chưa kịp khởi tạo
// APP_PATH khi module khác đọc tới (lỗi `reading 'PROPOSAL_MANAGE' of undefined`). Test này chỉ
// quan tâm action nào được giao cho bảng, không quan tâm đường dẫn thật.
vi.mock('@/routes', () => ({
  APP_PATH: new Proxy({}, { get: (_t, k) => `/${String(k).toLowerCase()}` }),
}))

const useEmployeeMonthlyKpisMock = vi.fn()
const useDepartmentMonthlyKpiMock = vi.fn()
vi.mock(
  '@/features/accounting/department-monthly-kpi/services/department-monthly-kpi-service',
  () => ({
    useDepartmentMonthlyKpi: (...args: any[]) => useDepartmentMonthlyKpiMock(...args),
    useEmployeeMonthlyKpis: (...args: any[]) => useEmployeeMonthlyKpisMock(...args),
  })
)

import { CommissionByRevenueDetailPage } from './CommissionByRevenueDetailPage'

/**
 * Hai mã quyền mà "Xem hoa hồng" thật sự chạm tới — chép nguyên văn dưới dạng chuỗi literal
 * (không nội suy từ hằng số trong trang), vì một phép so hai vế cùng nguồn thì luôn đúng và
 * không chứng minh được gì.
 */
const PERM_LOOKUP = 'employeemonthlycommissionsummary.list'
const PERM_NAVIGATE = 'salesmonthlycommissionsummary.retrieve'

const renderWithPerms = (codes: string[], isSuperuser = false) =>
  render(
    <AbilityContext.Provider
      value={defineAbilitiesFor(
        codes.map((code) => ({ code })),
        isSuperuser
      )}
    >
      <MemoryRouter initialEntries={['/accounting/commission-management/by-revenue/182297']}>
        <Routes>
          <Route
            path="/accounting/commission-management/by-revenue/:id"
            element={<CommissionByRevenueDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </AbilityContext.Provider>
  )

// Đọc trong ĐÚNG container của stub `Table`, không quét cả document: `toEqual([])` mà quét cả
// document thì chỉ chứng minh "không có <li> nào trên trang", không chứng minh bảng nhận mảng rỗng.
const labels = () =>
  within(screen.getByTestId('actions'))
    .queryAllByRole('listitem')
    .map((li) => li.textContent)

beforeEach(() => {
  vi.clearAllMocks()
  useDepartmentMonthlyKpiMock.mockReturnValue({
    data: { id: 182297, year: 2026, month: 8, department: 55, manager_splits: [] },
    isLoading: false,
    isError: false,
  })
  useEmployeeMonthlyKpisMock.mockReturnValue({
    data: { count: 1, results: [{ id: 1, employee: 109 }] },
    isLoading: false,
  })
})

describe('CommissionByRevenueDetailPage — "Xem hoa hồng" gate bằng đúng quyền nó gọi tới', () => {
  it('HIỆN khi có đủ cả hai quyền', () => {
    renderWithPerms([PERM_LOOKUP, PERM_NAVIGATE])
    expect(labels()).toContain('Xem hoa hồng')
  })

  /**
   * Chốt chặn cho 86eync7g0. Thiếu quyền đọc danh sách bảng tổng hợp nhân viên thì lượt tra
   * `monthly-summaries/employees/` trả 403 và người dùng chỉ nhận được một toast lỗi — nút dẫn
   * tới ngõ cụt thì không được hiện.
   */
  it(`ẨN khi thiếu ${PERM_LOOKUP} — lượt tra bảng tổng hợp sẽ 403`, () => {
    renderWithPerms([PERM_NAVIGATE])
    expect(labels()).not.toContain('Xem hoa hồng')
  })

  /**
   * Vế thứ hai, và là vế dễ gộp nhầm nhất: subject của route đích KHÁC subject của endpoint tra
   * cứu. Gate cả hành động bằng mỗi `employeemonthlycommissionsummary` là người dùng bấm xong
   * bị `PermissionGuard` đẩy sang `/unauthorized`.
   */
  it(`ẨN khi thiếu ${PERM_NAVIGATE} — route đích sẽ chặn`, () => {
    renderWithPerms([PERM_LOOKUP])
    expect(labels()).not.toContain('Xem hoa hồng')
  })

  it('ẨN khi không có quyền nào', () => {
    renderWithPerms([])
    expect(labels()).toEqual([])
  })

  /**
   * Hai mã thuộc HAI subject khác nhau, nên có `salesmonthlycommissionsummary.retrieve` KHÔNG tự
   * suy ra được quyền đọc danh sách của subject kia — dù cùng chữ `retrieve`. Ghim lại để một lần
   * "đồng bộ cả menu về một subject cho gọn" là đỏ.
   */
  it('quyền retrieve của subject kia không thay được vế list', () => {
    renderWithPerms(['employeemonthlycommissionsummary.retrieve', PERM_NAVIGATE])
    expect(labels()).not.toContain('Xem hoa hồng')
  })

  it('superuser vẫn thấy action', () => {
    renderWithPerms([], true)
    expect(labels()).toContain('Xem hoa hồng')
  })
})
