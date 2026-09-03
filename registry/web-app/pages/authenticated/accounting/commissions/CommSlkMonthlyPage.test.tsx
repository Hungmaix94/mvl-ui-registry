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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import CommSlkMonthlyPage from './CommSlkMonthlyPage'

const PERIODS = [
  { id: 10, year: 2026, month: 8 },
  { id: 9, year: 2026, month: 7 },
]

const mockUseList = vi.fn()
const mockUseDetail = vi.fn()
const mockUseAllPeriods = vi.fn()
const mockUseCurrentPeriod = vi.fn()

// Nút "Thêm kỳ" gọi `computeMutation.mutateAsync` rồi `queryClient.invalidateQueries`, nên thiếu
// hai mock dưới đây là trang ném ngay lúc render — không phải sai assertion.
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock(
  '@/features/accounting/linked-exchange-monthly-commissions/services/linked-exchange-monthly-commission-service',
  () => ({
    useLinkedExchangeMonthlyCommissions: (...args: unknown[]) => mockUseList(...args),
    useLinkedExchangeMonthlyCommission: (...args: unknown[]) => mockUseDetail(...args),
    useComputeLinkedExchangeMonthlyCommission: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
  })
)

vi.mock('@/features/accounting/accounting-periods/services/accounting-period-service', () => ({
  useAllAccountingPeriods: () => mockUseAllPeriods(),
  useCurrentAccountingPeriod: () => mockUseCurrentPeriod(),
}))

vi.mock('@/features/accounting/_shares/hooks/useAccountingListExport', () => ({
  useAccountingListExport: () => ({ openExportDialog: vi.fn(), isExporting: false }),
}))

// Stub the detail so these tests cover the page's own job — resolving the period's
// statement and handing it down — not the detail's internals (covered elsewhere).
vi.mock('@/features/accounting/commissions/components/CommSlkMonthlyDetail', () => ({
  CommSlkMonthlyDetail: ({
    summary,
    title,
    toolbarLeftContent,
    onBack,
  }: {
    summary: { id: number }
    title?: string
    toolbarLeftContent?: React.ReactNode
    onBack?: () => void
  }) => (
    <div data-testid="slk-detail" data-summary-id={summary.id} data-has-back={String(!!onBack)}>
      <span>{title}</span>
      {toolbarLeftContent}
    </div>
  ),
}))

function LocationProbe() {
  const { search } = useLocation()
  return <div data-testid="search-params">{search}</div>
}

function renderPage(initialUrl = '/accounting/commission-sale/slk-monthly') {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <SidebarProvider>
        <CommSlkMonthlyPage />
        <LocationProbe />
      </SidebarProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAllPeriods.mockReturnValue({ data: PERIODS, isLoading: false, error: null })
  mockUseCurrentPeriod.mockReturnValue({ data: PERIODS[0], isLoading: false })
  mockUseList.mockReturnValue({ data: { results: [], count: 0 }, isLoading: false, error: null })
  mockUseDetail.mockReturnValue({ data: undefined, isLoading: false, error: null })
})

describe('CommSlkMonthlyPage', () => {
  it('renders the period statement detail directly instead of a list table', async () => {
    mockUseList.mockReturnValue({
      data: { results: [{ id: 77 }], count: 1 },
      isLoading: false,
      error: null,
    })
    mockUseDetail.mockReturnValue({
      data: { id: 77, year: 2026, month: 8 },
      isLoading: false,
      error: null,
    })

    renderPage()

    const detail = await screen.findByTestId('slk-detail')
    expect(detail).toHaveAttribute('data-summary-id', '77')
    // No intermediate list: nothing renders a table on this route anymore.
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('hides the back button — the period-driven screen has no list to return to', async () => {
    mockUseList.mockReturnValue({
      data: { results: [{ id: 77 }], count: 1 },
      isLoading: false,
      error: null,
    })
    mockUseDetail.mockReturnValue({ data: { id: 77 }, isLoading: false, error: null })

    renderPage()

    expect(await screen.findByTestId('slk-detail')).toHaveAttribute('data-has-back', 'false')
  })

  it('reads the statement through the DETAIL query so lifecycle mutations refresh it', async () => {
    mockUseList.mockReturnValue({
      data: { results: [{ id: 77 }], count: 1 },
      isLoading: false,
      error: null,
    })
    mockUseDetail.mockReturnValue({ data: { id: 77 }, isLoading: false, error: null })

    renderPage()

    await screen.findByTestId('slk-detail')
    expect(mockUseDetail).toHaveBeenCalledWith(77, { enabled: true })
  })

  it('shows an empty state and keeps the period selector when the period has no statement', async () => {
    renderPage()

    expect(await screen.findByText(/Kỳ này chưa có bảng kê hoa hồng/i)).toBeInTheDocument()
    // The one filter the CR keeps must stay reachable, otherwise an empty period is a dead end.
    expect(screen.getByRole('button', { name: /Kỳ:/i })).toBeInTheDocument()
    expect(screen.queryByTestId('slk-detail')).toBeNull()
  })

  // `isUrlReady` can only flip once periods arrive, so making it the sole loading gate
  // would spin forever on an empty or failed periods query.
  it('falls back to a message instead of spinning forever when no period exists', async () => {
    mockUseAllPeriods.mockReturnValue({ data: [], isLoading: false, error: null })

    renderPage()

    expect(await screen.findByText(/Chưa có kỳ kế toán nào/i)).toBeInTheDocument()
  })

  it('surfaces a failed periods query instead of spinning forever', async () => {
    mockUseAllPeriods.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    })

    renderPage()

    expect(await screen.findByText(/Không thể tải dữ liệu/i)).toBeInTheDocument()
  })

  it('renders no search box and no filter button', async () => {
    renderPage()

    await screen.findByText(/Kỳ này chưa có bảng kê hoa hồng/i)
    expect(screen.queryByPlaceholderText(/Tìm/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /^Lọc$/i })).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('defaults the URL to the current accounting period', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('search-params')).toHaveTextContent('month=8')
    })
    expect(screen.getByTestId('search-params')).toHaveTextContent('year=2026')
  })

  it('strips legacy list params so an old bookmark cannot resurrect dead filter state', async () => {
    renderPage(
      '/accounting/commission-sale/slk-monthly?year=2026&month=7&page=3&page_size=25&status=DRAFT&q=abc'
    )

    await waitFor(() => {
      expect(screen.getByTestId('search-params')).not.toHaveTextContent('page')
    })

    const search = screen.getByTestId('search-params').textContent ?? ''
    expect(search).not.toContain('status')
    expect(search).not.toContain('q=')
    // …while keeping the period the bookmark pointed at.
    expect(search).toContain('year=2026')
    expect(search).toContain('month=7')
  })

  it('switches period through the selector and requeries that period', async () => {
    // Radix locks `pointer-events` on body while the popover is open; jsdom has no
    // layout to lift it, so the check would fail on a perfectly clickable option.
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPage('/accounting/commission-sale/slk-monthly?year=2026&month=8')

    await user.click(await screen.findByRole('button', { name: /Kỳ:/i }))
    await user.click(await screen.findByText('07/2026'))

    await waitFor(() => {
      expect(screen.getByTestId('search-params').textContent).toContain('month=7')
    })
    expect(mockUseList).toHaveBeenCalledWith(
      expect.objectContaining({ month: 7, year: 2026, page_size: 1 }),
      expect.objectContaining({ enabled: true })
    )
  })
})
