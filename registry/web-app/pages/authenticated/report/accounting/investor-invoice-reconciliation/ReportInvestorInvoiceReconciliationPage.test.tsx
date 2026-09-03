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

import { forwardRef, useImperativeHandle } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import type { InvestorInvoiceReconciliationFilterFormData } from '@/features/report/accounting/investor-invoice-reconciliation/InvestorInvoiceReconciliationFilter'
import ReportInvestorInvoiceReconciliationPage from './ReportInvestorInvoiceReconciliationPage'

const BASE_URL = '/accounting/report/investor-invoice-reconciliation'
const PAGE_QS = 'page=1&page_size=25'
const PROJECT_ID = '196'

const mockUseReport = vi.fn()
const mockUseSummary = vi.fn()
const mockOpenExportDialog = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('@/features/accounting/reports/services/report-service', () => ({
  useInvestorInvoiceReconciliationReport: (...args: unknown[]) => mockUseReport(...args),
  useInvestorInvoiceReconciliationSummary: (...args: unknown[]) => mockUseSummary(...args),
}))

vi.mock('@/features/accounting/_shares/hooks/useAccountingListExport', () => ({
  useAccountingListExport: () => ({
    openExportDialog: (...args: unknown[]) => mockOpenExportDialog(...args),
    isExporting: false,
  }),
}))

vi.mock(
  '@/features/report/accounting/investor-invoice-reconciliation/InvestorInvoiceReconciliationReportTable',
  () => ({ default: () => <div data-testid="investor-invoice-table" /> })
)

/**
 * Bộ lọc thật được thay bằng stub phơi ra đúng `getValues` / `clearForm` — các test dưới đây
 * kiểm phần việc của TRANG (URL ⇄ query param ⇄ badge), không kiểm nội bộ ô chọn dự án.
 */
const filterValues: { current: InvestorInvoiceReconciliationFilterFormData } = { current: {} }
const seededValues: { current: unknown } = { current: undefined }

vi.mock(
  '@/features/report/accounting/investor-invoice-reconciliation/InvestorInvoiceReconciliationFilter',
  () => ({
    default: forwardRef(
      ({ initialValues }: { initialValues?: unknown }, ref: React.Ref<unknown>) => {
        seededValues.current = initialValues
        useImperativeHandle(ref, () => ({
          getValues: () => filterValues.current,
          clearForm: () => {
            filterValues.current = { has_remaining: false }
          },
        }))
        return <div data-testid="investor-invoice-filter" />
      }
    ),
  })
)

function LocationProbe() {
  const { search } = useLocation()
  return <div data-testid="search-params">{search}</div>
}

function renderPage(initialUrl = `${BASE_URL}?${PAGE_QS}`) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <SidebarProvider>
        <ReportInvestorInvoiceReconciliationPage />
        <LocationProbe />
      </SidebarProvider>
    </MemoryRouter>
  )
}

/** Query param cuối cùng trang đưa cho hook danh sách (có page/page_size). */
function lastApiParams() {
  return mockUseReport.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined
}

/** Query param cuối cùng trang đưa cho hook `/summary/` (không có page/page_size). */
function lastSummaryParams() {
  return mockUseSummary.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined
}

function urlParams() {
  return new URLSearchParams(screen.getByTestId('search-params').textContent ?? '')
}

/** Khi có tiêu chí đang áp dụng, nút mọc thêm badge số nên tên khả truy cập là "Bộ lọc <n>". */
const FILTER_BUTTON = /^Bộ lọc/

async function openFilterDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: FILTER_BUTTON }))
  return screen.findByTestId('investor-invoice-filter')
}

beforeEach(() => {
  vi.clearAllMocks()
  filterValues.current = {}
  seededValues.current = undefined
  mockUseReport.mockReturnValue({ data: undefined, isLoading: false })
  mockUseSummary.mockReturnValue({ data: undefined })
})

describe('ReportInvestorInvoiceReconciliationPage — has_remaining đọc từ URL', () => {
  it('mặc định KHÔNG gửi has_remaining — báo cáo liệt kê mọi căn', async () => {
    renderPage()

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()?.has_remaining).toBeUndefined()
  })

  it.each(['has_remaining=true', 'has_remaining=1'])(
    'URL %s thì gửi has_remaining=true',
    async (query) => {
      renderPage(`${BASE_URL}?${PAGE_QS}&${query}`)

      await waitFor(() => expect(lastApiParams()).toBeDefined())
      expect(lastApiParams()).toMatchObject({ has_remaining: true })
    }
  )

  it.each(['has_remaining=false', 'has_remaining=0', 'has_remaining='])(
    'URL %s thì bỏ hẳn param, không gửi false',
    async (query) => {
      renderPage(`${BASE_URL}?${PAGE_QS}&${query}`)

      await waitFor(() => expect(lastApiParams()).toBeDefined())
      expect(lastApiParams()?.has_remaining).toBeUndefined()
    }
  )

  it('dòng tổng cuối bảng lọc theo cùng tiêu chí — nếu không, footer sẽ cộng cả căn đã ẩn', async () => {
    renderPage(`${BASE_URL}?${PAGE_QS}&has_remaining=true`)

    await waitFor(() => expect(lastSummaryParams()).toBeDefined())
    expect(lastSummaryParams()).toMatchObject({ has_remaining: true })
    // `/summary/` bỏ qua page/page_size, nên chúng không được lọt vào key của nó.
    expect(lastSummaryParams()?.page).toBeUndefined()
    expect(lastSummaryParams()?.page_size).toBeUndefined()
  })

  it('kết hợp được với bộ lọc dự án', async () => {
    renderPage(`${BASE_URL}?${PAGE_QS}&project=${PROJECT_ID}&has_remaining=true`)

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()).toMatchObject({ project: Number(PROJECT_ID), has_remaining: true })
  })
})

describe('ReportInvestorInvoiceReconciliationPage — Ngày làm phiếu TTGD (độc lập với Ngày ký HĐ cọc)', () => {
  it('forwards transaction_sheet_date_from/to from the URL to the API', async () => {
    renderPage(
      `${BASE_URL}?${PAGE_QS}&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15`
    )

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()).toMatchObject({
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  it('leaves contract_date_from/to untouched when only transaction-sheet date is set (regression)', async () => {
    renderPage(`${BASE_URL}?${PAGE_QS}&contract_date_from=2026-07-01&contract_date_to=2026-07-31`)

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()).toMatchObject({
      contract_date_from: '2026-07-01',
      contract_date_to: '2026-07-31',
    })
    expect(lastApiParams()?.transaction_sheet_date_from).toBeUndefined()
  })

  it('sends both date-range pairs together when both are set', async () => {
    renderPage(
      `${BASE_URL}?${PAGE_QS}&contract_date_from=2026-07-01&contract_date_to=2026-07-31` +
        `&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15`
    )

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()).toMatchObject({
      contract_date_from: '2026-07-01',
      contract_date_to: '2026-07-31',
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  it('bấm Áp dụng ghi transaction_sheet_date_from/to lên URL', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?${PAGE_QS}`)

    await openFilterDialog(user)
    filterValues.current = {
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    }
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(urlParams().get('transaction_sheet_date_from')).toBe('2026-08-01'))
    expect(urlParams().get('transaction_sheet_date_to')).toBe('2026-08-15')
  })

  it('"Xoá bộ lọc" gỡ luôn transaction_sheet_date_from/to khỏi URL', async () => {
    const user = userEvent.setup()
    renderPage(
      `${BASE_URL}?${PAGE_QS}&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15`
    )

    await openFilterDialog(user)
    await user.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(urlParams().has('transaction_sheet_date_from')).toBe(false))
    expect(urlParams().has('transaction_sheet_date_to')).toBe(false)
  })

  it('badge đếm transaction_sheet_date_from/to riêng, độc lập với contract_date_from/to', async () => {
    renderPage(
      `${BASE_URL}?${PAGE_QS}&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15`
    )

    expect(await screen.findByRole('button', { name: 'Bộ lọc 2' })).toBeInTheDocument()
  })

  it('xuất Excel kèm transaction_sheet_date_from/to đang áp dụng', async () => {
    const user = userEvent.setup()
    renderPage(
      `${BASE_URL}?${PAGE_QS}&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15`
    )

    await user.click(screen.getByRole('button', { name: 'Xuất file' }))

    expect(mockOpenExportDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_sheet_date_from: '2026-08-01',
        transaction_sheet_date_to: '2026-08-15',
      })
    )
  })
})

describe('ReportInvestorInvoiceReconciliationPage — dialog bộ lọc', () => {
  it('seed trạng thái đang bật vào dialog khi mở lại', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?${PAGE_QS}&has_remaining=true`)

    await openFilterDialog(user)

    expect(seededValues.current).toMatchObject({ has_remaining: true })
  })

  it('bấm Áp dụng khi đang tick thì ghi has_remaining=true lên URL và về trang 1', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?page=3&page_size=25`)

    await openFilterDialog(user)
    filterValues.current = { has_remaining: true }
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(urlParams().get('has_remaining')).toBe('true'))
    // Lọc xong mà vẫn đứng ở trang 3 thì tập kết quả đã hẹp lại có thể không còn trang đó.
    expect(urlParams().get('page')).toBe('1')
  })

  it('bỏ tick thì gỡ hẳn param khỏi URL, không để lại has_remaining=false', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?${PAGE_QS}&has_remaining=true`)

    await openFilterDialog(user)
    filterValues.current = { has_remaining: false }
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(urlParams().has('has_remaining')).toBe(false))
    expect(lastApiParams()?.has_remaining).toBeUndefined()
  })

  it('"Xoá bộ lọc" trả màn về mặc định — tắt lọc, danh sách đầy đủ trở lại', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?${PAGE_QS}&project=${PROJECT_ID}&has_remaining=true`)

    await openFilterDialog(user)
    await user.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(urlParams().has('has_remaining')).toBe(false))
    expect(urlParams().has('project')).toBe(false)
    expect(lastApiParams()?.has_remaining).toBeUndefined()
  })
})

describe('ReportInvestorInvoiceReconciliationPage — badge số tiêu chí', () => {
  it('mở màn không có số vì bộ lọc mặc định tắt', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: 'Bộ lọc' })).toBeInTheDocument()
  })

  it('đếm 1 khi chỉ bật "còn lại > 0"', async () => {
    renderPage(`${BASE_URL}?${PAGE_QS}&has_remaining=true`)

    expect(await screen.findByRole('button', { name: 'Bộ lọc 1' })).toBeInTheDocument()
  })

  it('đếm 2 khi lọc cả dự án lẫn "còn lại > 0"', async () => {
    renderPage(`${BASE_URL}?${PAGE_QS}&project=${PROJECT_ID}&has_remaining=true`)

    expect(await screen.findByRole('button', { name: 'Bộ lọc 2' })).toBeInTheDocument()
  })

  it('không đếm has_remaining=false — param có mặt nhưng không cắt dòng nào', async () => {
    renderPage(`${BASE_URL}?${PAGE_QS}&has_remaining=false`)

    expect(await screen.findByRole('button', { name: 'Bộ lọc' })).toBeInTheDocument()
  })
})

describe('ReportInvestorInvoiceReconciliationPage — xuất Excel', () => {
  it('xuất kèm has_remaining đang áp dụng — file phải khớp bảng đang xem', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?${PAGE_QS}&has_remaining=true`)

    await user.click(screen.getByRole('button', { name: 'Xuất file' }))

    expect(mockOpenExportDialog).toHaveBeenCalledWith(
      expect.objectContaining({ has_remaining: true })
    )
  })

  it('không kèm has_remaining khi bộ lọc đang tắt, và không bao giờ kèm trang đang xem', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?page=2&page_size=25`)

    await user.click(screen.getByRole('button', { name: 'Xuất file' }))

    const params = mockOpenExportDialog.mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(params.has_remaining).toBeUndefined()
    expect(params.page).toBeUndefined()
  })
})
