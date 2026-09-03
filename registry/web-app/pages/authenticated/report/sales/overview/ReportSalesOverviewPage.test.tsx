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

import { fireEvent, render, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import ReportSalesOverviewPage from './ReportSalesOverviewPage'

const BASE_URL = '/project-admin/report/sales-overview'

const mockUseRevenueTrend = vi.fn()
const mockExportRevenueTrend = vi.fn().mockResolvedValue(undefined)

vi.mock('@/features/sales/admin-dashboard/services/admin-dashboard-service', () => ({
  useAdminDashboardRevenueTrend: (...args: unknown[]) => mockUseRevenueTrend(...args),
  getAdminDashboardService: () => ({ exportRevenueTrend: mockExportRevenueTrend }),
}))

// Export permission is orthogonal to what this file asserts; grant it.
vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: () => true }) }))

// PageTitle owns the filter button + badge; capture its props instead of digging the DOM
// for a count that the component renders conditionally.
const h = vi.hoisted(() => ({
  pageTitleProps: [] as Array<Record<string, any>>,
}))
vi.mock('@/components/ui/page-title/PageTitle', () => ({
  default: (props: Record<string, any>) => {
    h.pageTitleProps.push(props)
    return null
  },
}))

const renderAt = (qs: string) =>
  render(
    <MemoryRouter initialEntries={[`${BASE_URL}${qs ? `?${qs}` : ''}`]}>
      <SidebarProvider>
        <ReportSalesOverviewPage />
      </SidebarProvider>
    </MemoryRouter>
  )

/** Query params the page handed to the data hook on its last render. */
const lastQuery = () => mockUseRevenueTrend.mock.calls[mockUseRevenueTrend.mock.calls.length - 1][0]
const lastBadge = () => h.pageTitleProps[h.pageTitleProps.length - 1].filterBadgeCount

beforeEach(() => {
  mockUseRevenueTrend.mockReset()
  mockUseRevenueTrend.mockReturnValue({
    data: {
      points: [
        {
          label: '2026-03',
          deal_count: 1,
          revenue_amount: '1',
          goods_amount: '1',
          reconciliation: '1',
          remaining: '1',
        },
      ],
    },
    isLoading: false,
    error: null,
  })
  h.pageTitleProps.length = 0
  mockExportRevenueTrend.mockClear()
})

/** Fire the toolbar's export action and return the (params, filename) it asked the backend for. */
const doExport = async () => {
  const { customActions } = h.pageTitleProps[h.pageTitleProps.length - 1]
  const view = render(<>{customActions}</>)
  fireEvent.click(view.getByRole('button'))
  // handleExport is async; let its microtasks flush before reading what it exported.
  await waitFor(() => expect(mockExportRevenueTrend).toHaveBeenCalled())
  return mockExportRevenueTrend.mock.calls[mockExportRevenueTrend.mock.calls.length - 1]
}

describe('ReportSalesOverviewPage — deal-status filter (CR STT36)', () => {
  it('sends no deal_status when the URL carries none, so the report keeps its default scope', () => {
    renderAt('')

    expect(lastQuery()).not.toHaveProperty('deal_status')
  })

  it('forwards the URL selection to the API as the CSV the endpoint takes', () => {
    renderAt('deal_status=abandoned,refunded')

    expect(lastQuery().deal_status).toBe('abandoned,refunded')
  })

  it('hydrates a shared link: reload reproduces the same request', () => {
    renderAt('from=2026-03-01&to=2026-03-31&group=week&deal_status=abandoned')

    expect(lastQuery()).toEqual({
      group: 'week',
      from: '2026-03-01',
      to: '2026-03-31',
      deal_status: 'abandoned',
    })
  })

  it('drops empty segments rather than sending a trailing comma', () => {
    renderAt('deal_status=abandoned,')

    expect(lastQuery().deal_status).toBe('abandoned')
  })

  it('omits deal_status entirely when the param is present but blank', () => {
    // `?deal_status=` must not become `deal_status: ''` — the backend would read that as
    // blank and fall back anyway, but sending it makes the URL claim a filter is active.
    renderAt('deal_status=')

    expect(lastQuery()).not.toHaveProperty('deal_status')
  })

  describe('transaction-sheet date filter (independent from deposit-date range)', () => {
    it('forwards transaction_sheet_date_from/to from the URL to the API', () => {
      renderAt('transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15')

      expect(lastQuery().transaction_sheet_date_from).toBe('2026-08-01')
      expect(lastQuery().transaction_sheet_date_to).toBe('2026-08-15')
    })

    it('leaves the deposit-date params untouched when only the transaction-sheet date is set (regression)', () => {
      renderAt('from=2026-03-01&to=2026-03-31')

      expect(lastQuery()).toEqual({
        group: 'month',
        from: '2026-03-01',
        to: '2026-03-31',
      })
      expect(lastQuery()).not.toHaveProperty('transaction_sheet_date_from')
      expect(lastQuery()).not.toHaveProperty('transaction_sheet_date_to')
    })

    it('sends both date ranges together when both are set', () => {
      renderAt(
        'from=2026-03-01&to=2026-03-31&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15'
      )

      expect(lastQuery()).toEqual({
        group: 'month',
        from: '2026-03-01',
        to: '2026-03-31',
        transaction_sheet_date_from: '2026-08-01',
        transaction_sheet_date_to: '2026-08-15',
      })
    })
  })

  describe('filter badge', () => {
    it('does not count an empty status selection', () => {
      renderAt('')
      expect(lastBadge()).toBe(0)
    })

    it('counts the status selection as one active filter', () => {
      renderAt('deal_status=abandoned')
      expect(lastBadge()).toBe(1)
    })

    it('counts a date range and a status selection separately', () => {
      renderAt('from=2026-03-01&to=2026-03-31&deal_status=abandoned')
      expect(lastBadge()).toBe(2)
    })

    it('counts the date range alone as one', () => {
      renderAt('from=2026-03-01&to=2026-03-31')
      expect(lastBadge()).toBe(1)
    })

    it('does not count the grouping axis — it is required, never empty', () => {
      renderAt('group=year')
      expect(lastBadge()).toBe(0)
    })

    it('counts the transaction-sheet date range as its own active filter, independent of the deposit-date range', () => {
      renderAt('transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15')
      expect(lastBadge()).toBe(1)
    })

    it('counts the deposit-date range and the transaction-sheet date range separately when both are set', () => {
      renderAt(
        'from=2026-03-01&to=2026-03-31&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15'
      )
      expect(lastBadge()).toBe(2)
    })
  })

  describe('Excel export — file dựng ở backend (CR 86eykckwc follow-up)', () => {
    // Title banner + khối "điều kiện lọc" + dòng Tổng cộng + number-format cột tiền giờ đều
    // do backend dựng (StyledExportXLSXMixin) — FE chỉ còn việc chuyển đúng query params.
    it('forwards the exact same params the screen used to load, so the file can never disagree with what is on screen', async () => {
      renderAt('from=2026-03-01&to=2026-03-31&group=week&deal_status=abandoned')
      const [params] = await doExport()

      expect(params).toEqual(lastQuery())
    })

    it('names the file "..._tuan.xlsx" for group=week', async () => {
      renderAt('group=week')
      const [, filename] = await doExport()
      expect(filename).toBe('Bao_cao_tong_quan_doanh_thu_theo_tuan.xlsx')
    })

    it('names the file "..._nam.xlsx" for group=year', async () => {
      renderAt('group=year')
      const [, filename] = await doExport()
      expect(filename).toBe('Bao_cao_tong_quan_doanh_thu_theo_nam.xlsx')
    })

    it('names the file "..._thang.xlsx" by default', async () => {
      renderAt('')
      const [, filename] = await doExport()
      expect(filename).toBe('Bao_cao_tong_quan_doanh_thu_theo_thang.xlsx')
    })

    it('shows an error toast and re-enables the button when the download fails', async () => {
      mockExportRevenueTrend.mockRejectedValueOnce(new Error('network error'))
      renderAt('')
      const { customActions } = h.pageTitleProps[h.pageTitleProps.length - 1]
      const view = render(<>{customActions}</>)
      fireEvent.click(view.getByRole('button'))

      await waitFor(() => expect(view.getByRole('button')).not.toBeDisabled())
    })
  })
})

describe('ReportSalesOverviewPage — dòng Tổng cộng (CR 86eykckwc)', () => {
  const TWO_MONTHS = [
    {
      label: '2026-01',
      deal_count: 2,
      revenue_amount: '1000000',
      goods_amount: '2000000',
      reconciliation: '500000',
      remaining: '300000',
    },
    {
      label: '2026-02',
      deal_count: 3,
      revenue_amount: '1500000',
      goods_amount: '2500000',
      reconciliation: '600000',
      remaining: '400000',
    },
  ]

  /** Bảng dữ liệu là `table` đầu tiên trên trang; dòng Tổng cộng luôn là `row` cuối trong nó
   * (bảng "Diễn giải" bên dưới là một `table` riêng, không lẫn vào). */
  const lastRowOf = (getAllByRole: (role: string) => HTMLElement[]) => {
    const rows = within(getAllByRole('table')[0]).getAllByRole('row')
    return within(rows[rows.length - 1])
  }

  it('cộng đúng tổng 5 cột số của các kỳ đang hiển thị', () => {
    mockUseRevenueTrend.mockReturnValue({
      data: { points: TWO_MONTHS },
      isLoading: false,
      error: null,
    })

    const { getAllByRole } = renderAt('')
    const totalRow = lastRowOf(getAllByRole)

    // deal_count 2+3, revenue 1.000.000+1.500.000, goods 2.000.000+2.500.000,
    // reconciliation 500.000+600.000, remaining 300.000+400.000.
    expect(totalRow.getByText('Tổng cộng')).toBeInTheDocument()
    expect(totalRow.getByText('5')).toBeInTheDocument()
    expect(totalRow.getByText('2.500.000')).toBeInTheDocument()
    expect(totalRow.getByText('4.500.000')).toBeInTheDocument()
    expect(totalRow.getByText('1.100.000')).toBeInTheDocument()
    expect(totalRow.getByText('700.000')).toBeInTheDocument()
  })

  it('ẩn dòng Tổng cộng khi báo cáo không có kỳ nào (không hiện 0 giả)', () => {
    mockUseRevenueTrend.mockReturnValue({ data: { points: [] }, isLoading: false, error: null })

    const { queryByText } = renderAt('')
    expect(queryByText('Tổng cộng')).not.toBeInTheDocument()
  })

  it('tính lại đúng tổng khi tập điểm đổi (đổi bộ lọc / mức gom)', () => {
    mockUseRevenueTrend.mockReturnValue({
      data: { points: [TWO_MONTHS[0]] },
      isLoading: false,
      error: null,
    })
    const { getAllByRole: getAllByRoleBefore, unmount } = renderAt('')
    expect(lastRowOf(getAllByRoleBefore).getByText('2.000.000')).toBeInTheDocument()
    unmount()

    mockUseRevenueTrend.mockReturnValue({
      data: { points: TWO_MONTHS },
      isLoading: false,
      error: null,
    })
    const { getAllByRole: getAllByRoleAfter } = renderAt('')
    expect(lastRowOf(getAllByRoleAfter).getByText('4.500.000')).toBeInTheDocument()
  })

  // Dòng "Tổng cộng" trong file Excel giờ do backend dựng (RevenueTrendExportMixin từ CÙNG
  // aggregation `_revenue_trend_points`) — bao phủ ở apps/sales/tests/test_views/
  // test_admin_dashboard.py::TestRevenueTrendExport, không lặp lại ở đây.
})
