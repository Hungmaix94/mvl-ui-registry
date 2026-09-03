import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { APP_PATH } from '@/routes/AppRoute.constant'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

const abilityMock = { can: vi.fn((_action: string, _subject?: string) => true) }
vi.mock('@/lib/ability', () => ({ useAbility: () => abilityMock }))

const summaryData = {
  month: 7,
  year: 2026,
  active_projects: 211,
  sold_this_month: 34,
  confirmed_reconciliation_amount: '3141028622',
  pending_bookings: 75,
  pending_deposits: 37,
  pending_transaction_sheets: 7,
  // Tử số: số phiếu đang dừng ở đúng bậc duyệt của người đang đăng nhập; null = không có quyền duyệt.
  pending_bookings_mine: 69 as number | null,
  pending_deposits_mine: 23 as number | null,
  pending_transaction_sheets_mine: null as number | null,
  bookings_today: 3,
  bookings_this_week: 11,
  deposits_today: 1,
  deposits_this_week: 9,
}

vi.mock('@/features/sales/admin-dashboard/services/admin-dashboard-service', () => ({
  useAdminDashboardSummary: () => ({ data: summaryData, isLoading: false }),
  useAdminDashboardPendingReconciliations: () => ({ data: { count: 26 }, isLoading: false }),
}))

// Nạp sau khi các mock ở trên đã đăng ký.
import SalesAdminSummaryTiles from './SalesAdminSummaryTiles'

const setup = () =>
  render(
    <MemoryRouter>
      <SalesAdminSummaryTiles />
    </MemoryRouter>
  )

const clickTile = (label: string) => fireEvent.click(screen.getByText(label))

describe('SalesAdminSummaryTiles', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    abilityMock.can.mockReset()
    abilityMock.can.mockReturnValue(true)
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15, 10, 0)) // Thứ 4, 15/07/2026
  })

  afterEach(() => vi.useRealTimers())

  /**
   * Đây là yêu cầu đã đổi hành vi: thẻ cũ hiện "69 / 75" (của tôi / tổng mọi bậc). Badge tile chỉ
   * còn một con số, và con số người duyệt cần là phần việc của chính họ — mẫu số bị bỏ hẳn.
   */
  it('ô hàng chờ chỉ hiện số của chính người dùng, không còn mẫu số tổng', () => {
    setup()

    expect(screen.getByText('69')).toBeInTheDocument()
    expect(screen.getByText('23')).toBeInTheDocument()
    expect(screen.queryByText('69 / 75')).not.toBeInTheDocument()
    expect(screen.queryByText('75')).not.toBeInTheDocument()
  })

  /**
   * `*_mine === null` nghĩa là người dùng không duyệt ở bậc nào cả. Khi đó ô không được im lặng
   * hiện 0 — nó đổi nhãn sang "chờ xử lý" và đếm tổng, đúng như thẻ cũ đã làm.
   */
  it('đổi nhãn sang "chờ xử lý" và đếm tổng khi người dùng không có quyền duyệt', () => {
    setup()

    expect(screen.getByText('Phiếu giao dịch chờ xử lý')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.queryByText('Phiếu giao dịch chờ tôi duyệt')).not.toBeInTheDocument()
  })

  /**
   * Số hàng trăm phải hiện nguyên vẹn: badge mặc định của lưới HRM cắt ở "99+", và "211 dự án"
   * cắt như thế là mất thông tin chứ không phải rút gọn.
   */
  it('hiện đủ số hàng trăm trên badge thay vì "99+"', () => {
    setup()

    expect(screen.getByText('211')).toBeInTheDocument()
    expect(screen.queryByText('99+')).not.toBeInTheDocument()
  })

  it('dựng ô "Đối soát chờ duyệt" từ count của endpoint đối soát chờ duyệt', () => {
    setup()

    expect(screen.getByText('Đối soát chờ duyệt')).toBeInTheDocument()
    expect(screen.getByText('26')).toBeInTheDocument()
  })

  it.each([
    ['Booking chờ tôi duyệt', `${APP_PATH.PROJECT_BOOKING_CONTRACT}?awaiting_me=true`],
    ['Đặt cọc chờ tôi duyệt', `${APP_PATH.DEPOSIT_CONTRACT}?awaiting_me=true`],
    ['Phiếu giao dịch chờ xử lý', `${APP_PATH.TRANSACTION_SHEET}?awaiting_me=true`],
    ['Dự án đang mở bán', `${APP_PATH.PROJECT_MANAGEMENT}?is_active=true`],
    ['Đã bán trong tháng', `${APP_PATH.DEAL}?sold=true&deposit_month=7&deposit_year=2026`],
    [
      'Booking hôm nay',
      `${APP_PATH.PROJECT_BOOKING_CONTRACT}?booking_date_from=2026-07-15&booking_date_to=2026-07-15`,
    ],
    [
      'Đặt cọc tuần này',
      `${APP_PATH.DEPOSIT_CONTRACT}?contract_date_from=2026-07-13&contract_date_to=2026-07-19`,
    ],
  ])('ô %s mở danh sách đã lọc sẵn', (label, expectedUrl) => {
    setup()
    clickTile(label)
    expect(navigateMock).toHaveBeenCalledWith(expectedUrl)
  })

  /**
   * Tập trạng thái "chờ duyệt" do BE định nghĩa; FE không biết nó gồm những trạng thái nào. Gắn
   * một `status` tự đoán vào URL là dựng ra một danh sách không khớp con số trên badge.
   */
  it('ô "Đối soát chờ duyệt" mở danh sách đối soát không kèm bộ lọc trạng thái tự đoán', () => {
    setup()
    clickTile('Đối soát chờ duyệt')
    expect(navigateMock).toHaveBeenCalledWith(APP_PATH.INVESTOR_RECONCILIATION)
  })

  describe('phân quyền', () => {
    it('bỏ hẳn ô đối soát khi thiếu quyền pending_reconciliations', () => {
      abilityMock.can.mockImplementation((action) => action !== 'pending_reconciliations')
      setup()

      expect(screen.queryByText('Đối soát chờ duyệt')).not.toBeInTheDocument()
      expect(screen.getByText('Dự án đang mở bán')).toBeInTheDocument()
    })

    it('chỉ còn ô đối soát khi thiếu quyền summary', () => {
      abilityMock.can.mockImplementation((action) => action === 'pending_reconciliations')
      setup()

      expect(screen.getByText('Đối soát chờ duyệt')).toBeInTheDocument()
      expect(screen.queryByText('Dự án đang mở bán')).not.toBeInTheDocument()
      expect(screen.queryByText('Booking chờ tôi duyệt')).not.toBeInTheDocument()
    })

    it('không dựng gì khi thiếu cả hai quyền', () => {
      abilityMock.can.mockReturnValue(false)
      const { container } = setup()

      expect(container).toBeEmptyDOMElement()
    })
  })
})
