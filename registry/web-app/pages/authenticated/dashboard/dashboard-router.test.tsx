import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import DashboardRouter from './DashboardRouter'

/**
 * Điều quan trọng nhất mà bộ test này khoá: vai trò CHƯA map preset phải rơi về dashboard cũ
 * NGUYÊN VẸN. Nếu nhánh fallback vỡ thì kế toán / TKKD / HR mở `/` ra thấy trang trắng — hồi quy
 * ảnh hưởng gần như toàn bộ người dùng, trong khi tính năng này chỉ nhắm 3 vai trò.
 */

const mockUser = vi.fn()
vi.mock('@/store/auth-store', () => ({ useAuth: () => ({ user: mockUser() }) }))

const mockSearchParams = vi.fn(() => new URLSearchParams())
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams()],
}))

vi.mock('./DashboardPage', () => ({
  default: ({ tabs }: { tabs?: React.ReactNode }) => (
    <div>
      LEGACY_DASHBOARD
      {tabs}
    </div>
  ),
}))
vi.mock('@/features/dashboard/components/preset/DashboardPresetTabs', () => ({
  default: ({ value }: { value: string }) => <div>{`SWITCHER:${value}`}</div>,
}))
vi.mock('@/features/dashboard/components/preset/PresetDashboard', () => ({
  default: ({ preset, title, tabs }: { preset: string; title: string; tabs?: React.ReactNode }) => (
    <div>
      {`PRESET:${preset}|${title}`}
      {tabs}
    </div>
  ),
}))

describe('DashboardRouter — một cửa vào, tự chọn preset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.mockReturnValue(new URLSearchParams())
  })

  it.each([
    ['TGD', 'exec'],
    ['GDKD', 'director'],
    ['GD_CHINHANH', 'director'],
    ['TPKD', 'manager'],
    ['KETOAN_TRUONG', 'accounting'],
    ['TP-TKKD', 'project_secretary'],
    ['TPHCNS', 'hr'],
  ])('vai trò %s → preset %s', (roleCode, preset) => {
    mockUser.mockReturnValue({ role: { code: roleCode } })
    render(<DashboardRouter />)

    expect(screen.getByText(new RegExp(`^PRESET:${preset}\\|`))).toBeInTheDocument()
    expect(screen.queryByText('LEGACY_DASHBOARD')).not.toBeInTheDocument()
  })

  it.each(['TKKD', 'NVKD', 'CVHCNS'])(
    'vai trò %s chưa map → giữ nguyên dashboard cũ, KHÔNG trang trắng',
    (roleCode) => {
      mockUser.mockReturnValue({ role: { code: roleCode } })
      render(<DashboardRouter />)

      expect(screen.getByText('LEGACY_DASHBOARD')).toBeInTheDocument()
    }
  )

  it('user chưa nạp xong / không có vai trò → vẫn ra dashboard cũ', () => {
    mockUser.mockReturnValue(null)
    render(<DashboardRouter />)
    expect(screen.getByText('LEGACY_DASHBOARD')).toBeInTheDocument()
  })

  it('superuser xem thử preset khác qua ?preset=', () => {
    mockUser.mockReturnValue({ role: { code: 'ADMIN' }, is_superuser: true })
    mockSearchParams.mockReturnValue(new URLSearchParams('preset=manager'))
    render(<DashboardRouter />)

    expect(screen.getByText(/^PRESET:manager\|/)).toBeInTheDocument()
  })

  describe('đổi bảng — chốt nghiệp vụ: CHỈ CEO', () => {
    it('CEO có bộ đổi bảng', () => {
      mockUser.mockReturnValue({ role: { code: 'TGD' } })
      render(<DashboardRouter />)
      expect(screen.getByText('SWITCHER:exec')).toBeInTheDocument()
    })

    it.each(['GDKD', 'TPKD'])('%s KHÔNG có bộ đổi bảng', (roleCode) => {
      mockUser.mockReturnValue({ role: { code: roleCode } })
      render(<DashboardRouter />)
      expect(screen.queryByText(/^SWITCHER:/)).not.toBeInTheDocument()
    })

    // Có tab rồi thì tiêu đề rút về "Dashboard": để "Dashboard điều hành" cạnh tab "Điều hành"
    // là lặp chữ. Vai trò KHÔNG có tab thì tiêu đề vẫn phải là tên đầy đủ của bảng họ đang xem.
    it('có tab → tiêu đề rút gọn thành "Dashboard"', () => {
      mockUser.mockReturnValue({ role: { code: 'TGD' } })
      render(<DashboardRouter />)
      expect(screen.getByText('PRESET:exec|Dashboard')).toBeInTheDocument()
    })

    it('không có tab → tiêu đề là tên đầy đủ của bảng', () => {
      mockUser.mockReturnValue({ role: { code: 'TPKD' } })
      render(<DashboardRouter />)
      expect(
        screen.getByText('PRESET:manager|Dashboard trưởng phòng kinh doanh')
      ).toBeInTheDocument()
    })

    // Trường hợp thật gặp trên máy 25/08: vai trò chưa map preset NHƯNG là superuser.
    // `canSwitch` phải true nhờ superuser, và `?preset=` phải ăn — dù `defaultPreset` là null.
    it('superuser có vai trò chưa map vẫn mở được preset qua ?preset=', () => {
      mockUser.mockReturnValue({ role: { code: 'NVKD' }, is_superuser: true })
      mockSearchParams.mockReturnValue(new URLSearchParams('preset=manager'))
      render(<DashboardRouter />)

      expect(screen.getByText(/^PRESET:manager\|/)).toBeInTheDocument()
      expect(screen.queryByText('LEGACY_DASHBOARD')).not.toBeInTheDocument()
    })

    it('CEO đổi sang preset phòng ban được', () => {
      mockUser.mockReturnValue({ role: { code: 'TGD' } })
      mockSearchParams.mockReturnValue(new URLSearchParams('preset=accounting'))
      render(<DashboardRouter />)
      expect(screen.getByText(/^PRESET:accounting\|/)).toBeInTheDocument()
    })

    // Đổi sang "Tổng hợp" mà mất bộ đổi bảng thì CEO chỉ còn cách bấm Back — phải giữ đường về.
    it('CEO đổi sang Tổng hợp thì ra trang cũ NHƯNG vẫn còn bộ đổi bảng', () => {
      mockUser.mockReturnValue({ role: { code: 'TGD' } })
      mockSearchParams.mockReturnValue(new URLSearchParams('preset=full'))
      render(<DashboardRouter />)

      expect(screen.getByText('LEGACY_DASHBOARD')).toBeInTheDocument()
      expect(screen.getByText('SWITCHER:full')).toBeInTheDocument()
    })
  })

  // Nếu ai cũng đổi được preset bằng query param thì trưởng phòng tự xem preset điều hành —
  // mà preset điều hành có khối công nợ và HH phải trả, đúng thứ nghiệp vụ đã chốt là KHÔNG cho xem.
  it('người thường KHÔNG đổi được preset bằng query param', () => {
    mockUser.mockReturnValue({ role: { code: 'TPKD' }, is_superuser: false })
    mockSearchParams.mockReturnValue(new URLSearchParams('preset=exec'))
    render(<DashboardRouter />)

    expect(screen.getByText(/^PRESET:manager\|/)).toBeInTheDocument()
    expect(screen.queryByText(/^PRESET:exec\|/)).not.toBeInTheDocument()
  })

  it('superuser truyền preset rác → rơi về phân giải theo vai trò, không vỡ', () => {
    mockUser.mockReturnValue({ role: { code: 'TGD' }, is_superuser: true })
    mockSearchParams.mockReturnValue(new URLSearchParams('preset=khong-ton-tai'))
    render(<DashboardRouter />)

    expect(screen.getByText(/^PRESET:exec\|/)).toBeInTheDocument()
  })
})
