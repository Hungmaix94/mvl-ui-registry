import { describe, it, expect, vi, beforeEach } from 'vitest'

// Barrel `@/components/ui` kéo theo `src/lib/firebase.ts`, module này gọi `getMessaging()`
// ngay khi eval và ném trong jsdom (lỗi có sẵn). Chặn tại đây — cùng pattern với
// `ReportInvestorInvoiceReconciliationPage.test.tsx`.
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
import type { DealFilterFormData } from '@/features/sales/deals/components/DealFilterForm'
import DealListPage from './DealListPage'

const BASE_URL = '/sales/deals'

const mockUseDeals = vi.fn()
const mockOpenExportDialog = vi.fn()

vi.mock('@/features/sales/deals/services/deal-service', () => ({
  useDeals: (...args: unknown[]) => mockUseDeals(...args),
}))

vi.mock('@/features/sales/deals/_shares/hooks/useDealExport', () => ({
  useDealExport: () => ({ openExportDialog: mockOpenExportDialog, isExporting: false }),
}))

vi.mock('@/lib/ability.ts', () => ({ useAbility: () => ({ can: () => true }) }))

vi.mock('@/features/sales/deals/components/DealTable', () => ({
  default: () => <div data-testid="deal-table" />,
}))

/**
 * Bộ lọc thật được thay bằng stub phơi ra đúng `getValues` — các test dưới đây kiểm phần
 * việc của TRANG (URL ⇄ query param ⇄ badge), không kiểm nội bộ từng field chọn.
 */
const filterValues: { current: DealFilterFormData } = { current: {} }

vi.mock('@/features/sales/deals/components/DealFilterForm', () => ({
  default: forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
    useImperativeHandle(ref, () => ({
      getValues: () => filterValues.current,
      clearForm: () => {
        filterValues.current = {}
      },
    }))
    return <div data-testid="deal-filter-form" />
  }),
}))

function LocationProbe() {
  const { search } = useLocation()
  return <div data-testid="search-params">{search}</div>
}

function renderPage(initialUrl = `${BASE_URL}?page=1`) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <SidebarProvider>
        <DealListPage />
        <LocationProbe />
      </SidebarProvider>
    </MemoryRouter>
  )
}

/** Query param cuối cùng trang đưa cho hook danh sách. */
function lastApiParams() {
  return mockUseDeals.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined
}

function urlParams() {
  return new URLSearchParams(screen.getByTestId('search-params').textContent ?? '')
}

const FILTER_BUTTON = /^Bộ lọc/

async function openFilterDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: FILTER_BUTTON }))
  return screen.findByTestId('deal-filter-form')
}

beforeEach(() => {
  vi.clearAllMocks()
  filterValues.current = {}
  mockUseDeals.mockReturnValue({ data: undefined, isLoading: false, error: undefined })
})

describe('DealListPage — Ngày làm phiếu TTGD (độc lập với Ngày cọc)', () => {
  it('forwards transaction_sheet_date_from/to from the URL to the API', async () => {
    renderPage(
      `${BASE_URL}?page=1&transaction_sheet_date_from=01%2F08%2F2026&transaction_sheet_date_to=15%2F08%2F2026`
    )

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()).toMatchObject({
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  it('leaves deposit_date_from/to untouched when only transaction-sheet date is set (regression)', async () => {
    renderPage(`${BASE_URL}?page=1&deposit_date_from=01%2F07%2F2026&deposit_date_to=31%2F07%2F2026`)

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()).toMatchObject({
      deposit_date_from: '2026-07-01',
      deposit_date_to: '2026-07-31',
    })
    expect(lastApiParams()?.transaction_sheet_date_from).toBeUndefined()
  })

  it('sends both date-range pairs together when both are set', async () => {
    renderPage(
      `${BASE_URL}?page=1&deposit_date_from=01%2F07%2F2026&deposit_date_to=31%2F07%2F2026` +
        `&transaction_sheet_date_from=01%2F08%2F2026&transaction_sheet_date_to=15%2F08%2F2026`
    )

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()).toMatchObject({
      deposit_date_from: '2026-07-01',
      deposit_date_to: '2026-07-31',
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  it('bấm Áp dụng ghi transaction_sheet_date_from/to lên URL', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?page=1`)

    await openFilterDialog(user)
    filterValues.current = {
      transaction_sheet_date_from: '01/08/2026',
      transaction_sheet_date_to: '15/08/2026',
    }
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(urlParams().get('transaction_sheet_date_from')).toBe('01/08/2026'))
    expect(urlParams().get('transaction_sheet_date_to')).toBe('15/08/2026')
  })

  it('badge đếm transaction_sheet_date_from/to riêng, độc lập với deposit_date_from/to', async () => {
    renderPage(
      `${BASE_URL}?page=1&transaction_sheet_date_from=01%2F08%2F2026&transaction_sheet_date_to=15%2F08%2F2026`
    )

    expect(await screen.findByRole('button', { name: 'Bộ lọc 2' })).toBeInTheDocument()
  })

  it('xuất Excel kèm transaction_sheet_date_from/to đang áp dụng', async () => {
    const user = userEvent.setup()
    renderPage(
      `${BASE_URL}?page=1&transaction_sheet_date_from=01%2F08%2F2026&transaction_sheet_date_to=15%2F08%2F2026`
    )

    await user.click(screen.getByRole('button', { name: /Xuất/ }))

    expect(mockOpenExportDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_sheet_date_from: '2026-08-01',
        transaction_sheet_date_to: '2026-08-15',
      })
    )
  })
})
