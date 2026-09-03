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
import { MemoryRouter } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import BranchF2ReportPage from './BranchF2ReportPage'

const BASE_URL = '/accounting/report/branch-f2-report'
const PERIOD_QS = 'year=2026&month=5&tab=f2'

const mockUseF2DebtReport = vi.fn()

vi.mock('@/features/accounting/reports/services/report-service', () => ({
  usePartnerDebtReport: () => ({ data: { results: [] }, isLoading: false }),
  useF2DebtReport: (...args: unknown[]) => mockUseF2DebtReport(...args),
}))

vi.mock('@/features/accounting/accounting-periods/services/accounting-period-service', () => ({
  useCurrentAccountingPeriod: () => ({ data: { id: 1, year: 2026, month: 5 }, isLoading: false }),
  useAllAccountingPeriods: () => ({ data: [{ id: 1, year: 2026, month: 5 }] }),
}))

vi.mock('@/hooks/useExchangeSelect', () => ({
  useExchangeSelect: () => ({
    exchangeOptions: [{ value: '5', label: 'Sàn ABC' }],
  }),
}))

// F2SourceType app-constant — cùng shape thật (keysMap.get(key) -> Record<value, label>),
// khớp với label BE trả (docs: apps/realestate/locale/vi — "Nguồn sàn liên kết"/"Nguồn công
// ty"/"Nguồn giám đốc kinh doanh").
vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({
    keysMap: new Map([
      [
        'F2SourceType',
        {
          linked: 'Nguồn sàn liên kết',
          company: 'Nguồn công ty',
          director: 'Nguồn giám đốc kinh doanh',
        },
      ],
    ]),
  }),
}))

function renderPage(initialUrl = `${BASE_URL}?${PERIOD_QS}`) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <SidebarProvider>
        <BranchF2ReportPage />
      </SidebarProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BranchF2ReportPage — tách hiển thị theo 3 loại nguồn F2 (ClickUp 86exzg79v)', () => {
  it('hiện 1 dòng riêng cho mỗi nguồn của cùng 1 sàn, không gộp chung', async () => {
    mockUseF2DebtReport.mockReturnValue({
      isLoading: false,
      data: {
        results: [
          {
            payee_exchange_id: 5,
            f2_source: 'company',
            f2_source_director_id: null,
            f2_source_director_name: null,
            outstanding: '5000000',
            total_expected: '9000000',
            total_paid: '4000000',
          },
          {
            payee_exchange_id: 5,
            f2_source: 'director',
            f2_source_director_id: 42,
            f2_source_director_name: 'Nguyễn Văn A',
            outstanding: '1000000',
            total_expected: '1000000',
            total_paid: '0',
          },
        ],
      },
    })

    renderPage()

    expect(await screen.findByText('Nguồn công ty')).toBeInTheDocument()
    // Dòng nguồn giám đốc hiện kèm tên giám đốc, không chỉ nhãn "Nguồn giám đốc kinh doanh" trơn.
    expect(await screen.findByText('Nguồn giám đốc kinh doanh — Nguyễn Văn A')).toBeInTheDocument()
    // Cả 2 dòng đều thuộc sàn "Sàn ABC" — tên sàn xuất hiện 2 lần (2 dòng), không bị gộp mất.
    expect(screen.getAllByText('Sàn ABC')).toHaveLength(2)
  })

  it('nguồn NULL/legacy (chưa phân loại) hiện nhãn SLK thay vì trống', async () => {
    mockUseF2DebtReport.mockReturnValue({
      isLoading: false,
      data: {
        results: [
          {
            payee_exchange_id: 5,
            f2_source: 'linked',
            f2_source_director_id: null,
            f2_source_director_name: null,
            outstanding: '2000000',
            total_expected: '2000000',
            total_paid: '0',
          },
        ],
      },
    })

    renderPage()

    expect(await screen.findByText('Nguồn sàn liên kết')).toBeInTheDocument()
  })
})
