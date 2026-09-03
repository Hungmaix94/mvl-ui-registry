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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'

const canMock = vi.fn(() => true)
vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: canMock }) }))

const toastWarningMock = vi.fn()
const toastErrorMock = vi.fn()
const toastSuccessMock = vi.fn()
vi.mock('@/services/toast-service', () => ({
  default: {
    error: (...args: any[]) => toastErrorMock(...args),
    warning: (...args: any[]) => toastWarningMock(...args),
    success: (...args: any[]) => toastSuccessMock(...args),
  },
}))

vi.mock('@/hooks/useColumnConfig.ts', () => ({
  useColumnConfig: (defaultConfig: any) => ({
    columns: defaultConfig,
    handleApply: vi.fn(),
    handleReset: vi.fn(),
  }),
}))

/**
 * `displayConfirm` là chỗ duy nhất nút "Tính toán" đi qua, nên bắt config ở đây rồi tự gọi
 * `onConfirm()` là cách gọn nhất để soi payload thật gửi lên BE mà không phải dựng cả dialog.
 */
const displayConfirmMock = vi.fn()
/**
 * `updateConfig` là đường duy nhất trang báo "đang chạy" cho hộp thoại (khoá nút, spinner, khoá
 * đóng bằng Esc/nền), nên bắt luôn ở đây để kiểm chứng trạng thái bận thay vì dựng cả dialog.
 */
const updateConfigMock = vi.fn()
vi.mock('@/hooks/useDialog', () => ({
  useDialog: () => ({
    displayConfirm: (...args: any[]) => displayConfirmMock(...args),
    updateConfig: (...args: any[]) => updateConfigMock(...args),
  }),
}))

const invalidateByPrefixMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/hooks/useApiQuery', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useInvalidateQueries: () => ({ invalidateByPrefix: invalidateByPrefixMock }),
  }
})

const useDepartmentMonthlyKpisMock = vi.fn()
vi.mock(
  '@/features/accounting/department-monthly-kpi/services/department-monthly-kpi-service',
  () => ({
    useDepartmentMonthlyKpis: (...args: any[]) => useDepartmentMonthlyKpisMock(...args),
  })
)

const PERIODS = [
  { id: 1, year: 2026, month: 8 },
  { id: 2, year: 2026, month: 7 },
]
const useAllAccountingPeriodsMock = vi.fn()
const useCurrentAccountingPeriodMock = vi.fn()
vi.mock('@/features/accounting/accounting-periods/services/accounting-period-service', () => ({
  useAllAccountingPeriods: () => useAllAccountingPeriodsMock(),
  useCurrentAccountingPeriod: () => useCurrentAccountingPeriodMock(),
}))

/** Mutation `compute` — assertion surface cho payload kỳ được gửi lên. */
const computeMock = vi.fn().mockResolvedValue({ departments: 1, payables: 0, unresolved_roles: 0 })
/**
 * `compute` chỉ dừng ở chướng ngại ĐẦU TIÊN, nên nút phải hỏi preflight trước để biết kỳ có bị
 * chặn không. Mặc định "không chặn" — từng test tự dựng lại kịch bản của nó.
 */
const preflightMock = vi.fn().mockResolvedValue({ can_recompute: true, blockers: [] })
const reopenSummariesMock = vi.fn().mockResolvedValue({ reopened: [], refused: [] })
vi.mock(
  '@/features/accounting/management-commission/services/management-commission-service',
  () => ({
    useComputeManagementCommission: () => ({ mutateAsync: computeMock, isPending: false }),
    useComputePreflight: () => ({ mutateAsync: preflightMock, isPending: false }),
    useReopenSummariesForPeriod: () => ({ mutateAsync: reopenSummariesMock, isPending: false }),
  })
)

vi.mock('@/features/accounting/_shares/hooks/useAccountingListExport', () => ({
  useAccountingListExport: () => ({ openExportDialog: vi.fn() }),
}))

vi.mock('@/features/accounting/management-commission/components/CommissionByRevenueTable', () => ({
  CommissionByRevenueTable: () => <div data-testid="by-revenue-table" />,
}))

vi.mock(
  '@/features/accounting/department-monthly-kpi/components/DepartmentMonthlyKpiFilter',
  () => ({ default: () => <div data-testid="filter-form" /> })
)

import { CommissionByRevenuePage } from './CommissionByRevenuePage'

function renderPage(
  url = '/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=8'
) {
  return render(
    <SidebarProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/accounting/commission-management/by-revenue"
            element={<CommissionByRevenuePage />}
          />
        </Routes>
      </MemoryRouter>
    </SidebarProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  canMock.mockReturnValue(true)
  useAllAccountingPeriodsMock.mockReturnValue({ data: PERIODS })
  useCurrentAccountingPeriodMock.mockReturnValue({ data: PERIODS[0], isLoading: false })
  useDepartmentMonthlyKpisMock.mockReturnValue({
    data: { results: [], count: 0, summary: undefined },
    isLoading: false,
    isFetching: false,
    error: null,
  })
})

describe('CommissionByRevenuePage — nút tính toán', () => {
  it('chỉ hiện MỘT nút tính toán, không còn "Tính toán lại"', () => {
    renderPage()

    // BE chỉ còn một action `compute` (nó đã tự xoá kết quả cũ rồi dựng lại), nên hai nút gọi
    // hai endpoint là dư thừa — `recompute` cũ chỉ là `return compute(...)`.
    expect(screen.queryByRole('button', { name: 'Tính toán lại' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Tính toán' })).toHaveLength(1)
  })

  it('gửi đúng kỳ đang xem trên URL, không phải fallback cứng 2026/4', async () => {
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))

    expect(displayConfirmMock).toHaveBeenCalledTimes(1)
    const config = displayConfirmMock.mock.calls[0][0]
    // Hộp thoại phải nói thẳng hệ quả: xoá kết quả cũ của kỳ rồi dựng lại.
    expect(config.content).toContain('07/2026')
    expect(config.content).toContain('xoá')

    await config.onConfirm()

    expect(computeMock).toHaveBeenCalledWith({ year: 2026, month: 7 })
    expect(invalidateByPrefixMock).toHaveBeenCalledWith('accounting/department-monthly-kpi')
  })

  it('khoá nút khi chưa xác định được kỳ, thay vì lặng lẽ tính cho tháng 4/2026', async () => {
    // Không có kỳ kế toán nào → trang không tự điền được year/month vào URL. Fallback cũ
    // `apiParams.year || 2026, apiParams.month || 4` sẽ xoá sạch và tính lại kết quả của tháng
    // 4/2026 — một kỳ người dùng còn không mở. Nút phải bị khoá, và bấm vào không gọi gì cả.
    useAllAccountingPeriodsMock.mockReturnValue({ data: [] })
    useCurrentAccountingPeriodMock.mockReturnValue({ data: undefined, isLoading: false })
    useDepartmentMonthlyKpisMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
    })
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25')

    const button = screen.getByRole('button', { name: 'Tính toán' })
    expect(button).toBeDisabled()

    await user.click(button)
    expect(displayConfirmMock).not.toHaveBeenCalled()
    expect(computeMock).not.toHaveBeenCalled()
  })
})

describe('CommissionByRevenuePage — chặn trước khi tính lại', () => {
  it('hỏi preflight trước, chỉ mở hộp thoại tính khi kỳ không bị chặn', async () => {
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))

    expect(preflightMock).toHaveBeenCalledWith({ year: 2026, month: 7 })
    expect(displayConfirmMock.mock.calls[0][0].title).toBe('Tính toán hoa hồng')
  })

  it('kỳ kế toán đang đóng thì chỉ báo, không mời mở bảng kê', async () => {
    // Mở bảng kê trước cũng vô ích: BE từ chối mở khi kỳ đang hard-closed.
    preflightMock.mockResolvedValueOnce({
      can_recompute: false,
      period_status: 'SOFT_CLOSED',
      blockers: [{ type: 'period_closed', status: 'SOFT_CLOSED', action: 'reopen_period' }],
    })
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))

    const config = displayConfirmMock.mock.calls[0][0]
    expect(config.title).toBe('Kỳ kế toán đang đóng')
    expect(config.onConfirm).toBeUndefined()
    expect(reopenSummariesMock).not.toHaveBeenCalled()
  })

  it('bảng kê đã chốt nhưng mở lại được thì mở rồi tính', async () => {
    preflightMock.mockResolvedValueOnce({
      can_recompute: false,
      period_status: 'OPEN',
      blockers: [
        {
          type: 'summary_frozen',
          summary_id: 412,
          beneficiary: 'NV0001 - A',
          status: 'CONFIRMED',
          amount: '2857385',
          reopenable: true,
          action: 'reopen_summary',
        },
      ],
    })
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))
    const config = displayConfirmMock.mock.calls[0][0]
    expect(config.title).toBe('Cần mở lại bảng kê trước khi tính')

    await config.onConfirm()

    expect(reopenSummariesMock).toHaveBeenCalledWith({ year: 2026, month: 7, dry_run: false })
    expect(computeMock).toHaveBeenCalledWith({ year: 2026, month: 7 })
  })

  it('tiền đã chi thì KHÔNG cho tính lại kỳ', async () => {
    // Viết lại một kỳ đã có dòng tiền thật là sai nguyên tắc: phần chi sai phải điều chỉnh ở kỳ
    // mở gần nhất. Nút xác nhận ở đây chỉ để đóng hộp thoại.
    preflightMock.mockResolvedValueOnce({
      can_recompute: false,
      period_status: 'OPEN',
      blockers: [
        {
          type: 'summary_frozen',
          summary_id: 418,
          beneficiary: 'NV0002 - B',
          status: 'PAID',
          amount: '714346',
          reopenable: false,
          reason: 'already_disbursed',
          action: 'kpi_recipient_reassignment',
        },
      ],
    })
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))

    const config = displayConfirmMock.mock.calls[0][0]
    expect(config.title).toBe('Không tính lại được kỳ này')
    expect(config.onConfirm).toBeUndefined()
    expect(reopenSummariesMock).not.toHaveBeenCalled()
    expect(computeMock).not.toHaveBeenCalled()
  })

  it('mở lại thất bại thì KHÔNG tính tiếp', async () => {
    preflightMock.mockResolvedValueOnce({
      can_recompute: false,
      period_status: 'OPEN',
      blockers: [
        {
          type: 'summary_frozen',
          summary_id: 412,
          beneficiary: 'NV0001 - A',
          status: 'CONFIRMED',
          amount: '2857385',
          reopenable: true,
          action: 'reopen_summary',
        },
      ],
    })
    reopenSummariesMock.mockResolvedValueOnce({
      reopened: [],
      refused: [
        {
          summary_id: 412,
          beneficiary: 'NV0001 - A',
          status: 'CONFIRMED',
          reason: 'wave_already_paid',
        },
      ],
    })
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))
    await displayConfirmMock.mock.calls[0][0].onConfirm()

    expect(computeMock).not.toHaveBeenCalled()
  })

  it('cảnh báo khi kỳ có vai không tìm được người nhận', async () => {
    computeMock.mockResolvedValueOnce({
      departments: 8,
      payables: 18,
      unresolved_roles: 1,
      unresolved_amount: '9367162',
      unresolved_detail: [{ department_name: 'Phòng Kinh Doanh 1_HP', department_id: 79 }],
      salary_period_locked: false,
    })
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))
    await displayConfirmMock.mock.calls[0][0].onConfirm()

    // Phải nêu đích danh phòng: "1 vai thiếu người nhận" mà không nói phòng nào thì kế toán
    // phải dò lại cả danh sách mới biết đi gán ở đâu.
    expect(toastWarningMock).toHaveBeenCalledWith(expect.stringContaining('9.367.162'))
    expect(toastWarningMock).toHaveBeenCalledWith(expect.stringContaining('Phòng Kinh Doanh 1_HP'))
  })

  it('cảnh báo khi kỳ lương đã chốt nên bảng lương không cập nhật', async () => {
    computeMock.mockResolvedValueOnce({
      departments: 8,
      payables: 18,
      unresolved_roles: 0,
      unresolved_amount: '0',
      salary_period_locked: true,
    })
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))
    await displayConfirmMock.mock.calls[0][0].onConfirm()

    expect(toastWarningMock).toHaveBeenCalledWith(expect.stringContaining('Kỳ lương'))
  })
})

describe('CommissionByRevenuePage — cách gọi tên khoản tiền (bug 86eyr1vam)', () => {
  it('câu mô tả đầu trang gọi là "Hoa hồng quản lý", không phải "Thưởng quản lý"', () => {
    renderPage()

    // Vế đối chứng: câu mô tả PHẢI có mặt. Thiếu nó thì phép assert vắng mặt bên dưới vẫn
    // xanh kể cả khi cả dòng mô tả bị xoá khỏi trang.
    expect(screen.getByText(/Hoa hồng quản lý theo doanh số phòng/)).toBeInTheDocument()
    expect(screen.queryByText(/Thưởng quản lý theo doanh số phòng/)).not.toBeInTheDocument()
  })
})

describe('CommissionByRevenuePage — phản hồi khi đang tính', () => {
  /** Đọc payload của lần `updateConfig` đầu tiên (lúc nhận cú bấm). */
  const firstUpdate = () => updateConfigMock.mock.calls[0][0]
  /** Đọc payload của lần `updateConfig` cuối cùng (lúc nhả khoá). */
  const lastUpdate = () => updateConfigMock.mock.calls[updateConfigMock.mock.calls.length - 1][0]

  it('khoá hộp thoại và bật spinner ngay khi nhận cú bấm', async () => {
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))
    await displayConfirmMock.mock.calls[0][0].onConfirm()

    // Khoá cả nút lẫn đường thoát: `GlobalDialog` await `onConfirm()` rồi mới đóng, nên suốt
    // thời gian tính hộp thoại vẫn đứng đó — không khoá thì không có gì báo đã nhận cú bấm.
    expect(firstUpdate()).toMatchObject({
      loading: true,
      disableBackdropClose: true,
      confirmText: 'Đang tính…',
    })
  })

  it('nhả khoá và trả nhãn nút về như cũ khi chạy xong', async () => {
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))
    await displayConfirmMock.mock.calls[0][0].onConfirm()

    expect(lastUpdate()).toMatchObject({
      loading: false,
      disableBackdropClose: false,
      confirmText: 'Tính toán',
    })
  })

  it('bấm lần hai trong lúc đang chạy KHÔNG tính lại kỳ lần nữa', async () => {
    // Đây là thao tác xoá-rồi-dựng-lại cả kỳ. Trước khi vá, `onConfirm` trỏ thẳng vào
    // `runCompute` nên hai cú bấm là hai lần tính.
    let releaseCompute: (value: unknown) => void = () => {}
    computeMock.mockImplementationOnce(() => new Promise((resolve) => (releaseCompute = resolve)))
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))
    const { onConfirm } = displayConfirmMock.mock.calls[0][0]

    const first = onConfirm()
    const second = onConfirm()
    releaseCompute({ departments: 1, payables: 0, unresolved_roles: 0 })
    await Promise.all([first, second])

    expect(computeMock).toHaveBeenCalledTimes(1)
  })

  it('báo đã tính xong khi kỳ sạch, thay vì đóng hộp thoại trong im lặng', async () => {
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))
    await displayConfirmMock.mock.calls[0][0].onConfirm()

    expect(toastSuccessMock).toHaveBeenCalledWith(expect.stringContaining('07/2026'))
  })

  it('không chồng toast thành công lên toast cảnh báo', async () => {
    // Câu cảnh báo đã tự mở đầu bằng "Đã tính xong, nhưng…" — thêm một toast thành công nữa là
    // hai thông báo nói cùng một việc.
    computeMock.mockResolvedValueOnce({
      departments: 12,
      payables: 18,
      unresolved_roles: 1,
      unresolved_amount: '2857385',
      unresolved_detail: [{ department_name: 'Phòng KD 1' }],
    })
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))
    await displayConfirmMock.mock.calls[0][0].onConfirm()

    expect(toastWarningMock).toHaveBeenCalledTimes(1)
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it('báo lỗi khi tính hỏng, thay vì chỉ ghi console', async () => {
    // Cả ba mutation của màn này đều không bật `showErrorToast`, nên không bắt ở trang thì lỗi
    // biến mất hoàn toàn khỏi mắt người dùng.
    computeMock.mockRejectedValueOnce(new Error('BE sập'))
    const user = userEvent.setup()
    renderPage('/accounting/commission-management/by-revenue?page=1&page_size=25&year=2026&month=7')

    await user.click(screen.getByRole('button', { name: 'Tính toán' }))
    await displayConfirmMock.mock.calls[0][0].onConfirm()

    expect(toastErrorMock).toHaveBeenCalled()
    // Vẫn phải nhả khoá, không thì hộp thoại kẹt ở "Đang tính…" và không thử lại được.
    expect(lastUpdate()).toMatchObject({ loading: false, confirmText: 'Tính toán' })
  })
})
