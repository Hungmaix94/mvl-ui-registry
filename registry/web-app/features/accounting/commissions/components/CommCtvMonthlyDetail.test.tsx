import { describe, it, expect, vi } from 'vitest'

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
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CommCtvMonthlyDetail } from './CommCtvMonthlyDetail'

const mockSendCommissionEmail = vi.fn()

vi.mock('@/store', () => ({
  useAuth: () => ({ user: { permissions: ['*'] } }),
  useConstants: () => ({ constants: {} }),
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMap: new Map(), keysMapOptions: new Map() }),
}))

vi.mock('@/utils/auth', () => ({
  hasPermission: () => true,
}))

vi.mock('@/features/accounting/collaborators/services/collaborator-service', () => ({
  useCollaborator: () => ({ data: undefined }),
}))

vi.mock('../hooks/useConfirmMonthlySummaryAction', () => ({
  useConfirmMonthlySummaryAction: () => ({ handleConfirm: vi.fn(), isConfirming: false }),
}))

vi.mock('@/features/accounting/monthly-summaries/services/monthly-summary-service', () => ({
  useUpdateCtvDealMailRecipient: () => ({ mutateAsync: vi.fn() }),
  useSendCommissionEmail: () => ({ mutateAsync: mockSendCommissionEmail }),
  useMonthlySummary: () => ({ data: undefined }),
}))

// Hai dialog này chỉ gắn vào cuối cây, không liên quan bảng F2 — nhưng kéo theo cả
// service/query thật. Vô hiệu để test bám đúng phần đang kiểm.
vi.mock('./CommMonthlySummaryHoldDialog', () => ({
  CommMonthlySummaryHoldDialog: () => null,
}))
vi.mock('./CommMonthlySummaryAdvanceDialog', () => ({
  CommMonthlySummaryAdvanceDialog: () => null,
  // The detail screen labels its trigger button from this module; stubbing the component alone
  // would leave the label `undefined` and quietly blank the button.
  ADVANCE_REQUEST_ACTION_LABEL: 'Đề xuất tạm ứng hoa hồng',
  ADVANCE_REQUEST_ACTION_LABEL_SHORT: 'Đề xuất tạm ứng',
}))

vi.mock('@/hooks/useDialog.ts', () => ({
  useDialog: () => ({ displayConfirm: vi.fn() }),
}))

/** Một deal CTV nhận hộ hoa hồng của sàn F2 — bucket `f2`, KHÔNG phải `sale`. */
const f2Deal = {
  deal_id: 2897,
  deal_code: 'HD06-2026-001780',
  subtotal: '15816726',
  project: { name: 'Dự án Làng Vân' },
  customer: { fullname: 'Tập đoàn Á Châu' },
  receipt_dates: ['2026-07-29'],
  items: [
    {
      line_id: 108362,
      pct_type: 'pct_f2_commission',
      amount: '16872727',
      original_beneficiary: { type: 'exchange', id: 2015, name: 'Sàn Tuấn Anh 66' },
    },
  ],
  ctv_recipient_employee_id: null,
  ctv_recipient_employee_name: null,
  ctv_recipient_email: 'ketoanmaiviet@gmail.com',
  ctv_recipient_sent_at: null,
}

const summary = {
  id: 208,
  year: 2026,
  month: 7,
  status: 'CONFIRMED',
  beneficiary_collaborator: 136,
  beneficiary_collaborator_detail: { fullname: 'Hà Bích Ngọc' },
  sources: {
    sale: { by_deal: {}, subtotal: '0' },
    f2: { by_deal: { '2897': f2Deal }, subtotal: '15816726' },
  },
} as any

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <CommCtvMonthlyDetail summary={summary} />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

/** Bảng ② "Hoa hồng F2 nhận hộ sàn" — bảng thứ hai, sau ① "Các deal CTV đã chốt". */
function f2Table() {
  const tables = screen.getAllByRole('table')
  expect(tables).toHaveLength(2)
  return tables[1]
}

function rowContaining(table: HTMLElement, text: string) {
  const row = within(table)
    .getAllByRole('row')
    .find((candidate) => within(candidate).queryByText(text) !== null)
  expect(row).toBeDefined()
  return row as HTMLElement
}

describe('CommCtvMonthlyDetail — bảng "Hoa hồng F2 nhận hộ sàn"', () => {
  /**
   * CR STT33 chỉ gắn cột gửi mail vào bảng "Các deal CTV đã chốt", nên bảng F2 nhận hộ
   * không có người nhận / email / nút gửi (ClickUp 86eyexcr3, QA comment 90180245319284).
   */
  it('hiển thị đủ 3 cột gửi mail như bảng deal CTV đã chốt', () => {
    renderDetail()

    const headers = within(f2Table())
      .getAllByRole('columnheader')
      .map((th) => th.textContent?.trim())

    expect(headers).toContain('Nhân viên nhận mail')
    expect(headers).toContain('Email')
    expect(headers).toContain('Gửi mail')
  })

  it('hiển thị hòm mail kế toán làm mặc định, không gắn nhân viên nào', () => {
    renderDetail()

    const row = rowContaining(f2Table(), 'HD06-2026-001780')
    expect(within(row).getAllByText('ketoanmaiviet@gmail.com').length).toBeGreaterThan(0)
  })

  it('có nút "Gửi" cho từng deal nhận hộ', () => {
    renderDetail()

    const row = rowContaining(f2Table(), 'HD06-2026-001780')
    expect(within(row).getByText('Gửi')).toBeTruthy()
  })

  it('hàng TỔNG phủ hết bề ngang bảng sau khi thêm cột', () => {
    renderDetail()

    const table = f2Table()
    const totalRow = rowContaining(table, 'TỔNG')
    const spans = within(totalRow)
      .getAllByRole('cell')
      .reduce((acc, cell) => acc + Number(cell.getAttribute('colspan') || 1), 0)

    expect(spans).toBe(within(table).getAllByRole('columnheader').length)
  })
})
