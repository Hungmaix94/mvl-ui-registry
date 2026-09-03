import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { APP_PATH } from '@/routes/AppRoute.constant'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/features/sales/admin-dashboard/services/admin-dashboard-service', () => ({
  useAdminDashboardSummary: () => ({
    data: { month: 7, year: 2026, confirmed_reconciliation_amount: '3141028622' },
    isLoading: false,
  }),
}))

import SalesConfirmedReconciliationCard from './SalesConfirmedReconciliationCard'

const setup = () =>
  render(
    <MemoryRouter>
      <SalesConfirmedReconciliationCard />
    </MemoryRouter>
  )

describe('SalesConfirmedReconciliationCard', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15, 10, 0)) // Thứ 4, 15/07/2026
  })

  afterEach(() => vi.useRealTimers())

  /**
   * Lý do ô này KHÔNG chuyển sang tile như phần còn lại của Tổng quan Sales: badge tròn vài chục
   * pixel không chứa nổi một số tiền hàng tỉ, mà số tiền bị cắt bớt chữ số thì đọc thành một số
   * tiền khác.
   */
  it('hiện đủ số tiền đã định dạng, không rút gọn', () => {
    setup()

    expect(screen.getByText('Đối soát đã xác nhận')).toBeInTheDocument()
    expect(screen.getByText('3.141.028.622')).toBeInTheDocument()
    expect(screen.getByText('VND')).toBeInTheDocument()
  })

  /**
   * Kỳ số liệu phải HIỆN trên dải, không nấp trong tooltip như thẻ cũ: một số tiền không kèm kỳ
   * là một số tiền không đọc được, và tooltip thì bàn phím lẫn màn cảm ứng đều khó với tới.
   */
  it('nêu rõ kỳ của số liệu ngay trên dải', () => {
    setup()

    expect(screen.getByText('Tháng 7/2026')).toBeInTheDocument()
  })

  /**
   * Cả dải là MỘT nút: bấm chỗ nào cũng mở đúng danh sách. Trước đây nó là một `div` có `onClick`
   * — chuột thì được, còn Tab + Enter thì không tới được.
   */
  it('là một control bấm được bằng bàn phím, không phải div gắn onClick', () => {
    setup()

    const strip = screen.getByRole('button', { name: /Đối soát đã xác nhận/ })
    expect(strip).toHaveAttribute('type', 'button')
  })

  it('mở danh sách đối soát đã xác nhận của tháng hiện tại', () => {
    setup()

    fireEvent.click(screen.getByText('Đối soát đã xác nhận'))

    expect(navigateMock).toHaveBeenCalledWith(
      `${APP_PATH.INVESTOR_RECONCILIATION}?status=confirmed&reconciliation_date_from=2026-07-01&reconciliation_date_to=2026-07-31`
    )
  })
})
