import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const h = vi.hoisted(() => ({
  queryParams: [] as Record<string, unknown>[],
  /** Nội dung dialog mà hook bộ lọc đẩy sang `useDialog` — rỗng nghĩa là chưa ai mở. */
  dialogs: [] as { title: string; content: ReactNode }[],
}))

vi.mock('@/features/sales/admin-dashboard/services/admin-dashboard-service', () => ({
  useAdminDashboardRevenueTrend: (params: Record<string, unknown>) => {
    h.queryParams.push(params)
    return { data: { points: [] }, isLoading: false }
  },
}))

vi.mock('@/hooks/useDialog.ts', () => ({
  useDialog: () => ({
    displayFormContent: (args: { title: string; content: ReactNode }) => h.dialogs.push(args),
    displayClose: vi.fn(),
  }),
}))

// Imported after the mocks above are registered.
import RevenueTrendChart from './RevenueTrendChart'

const lastParams = () => h.queryParams[h.queryParams.length - 1]

beforeEach(() => {
  h.queryParams.length = 0
  h.dialogs.length = 0
})

/**
 * Khối này từng bày ba ô lọc thẳng trên thanh tiêu đề, trong khi hai khối còn lại của CÙNG
 * trang dùng nút phễu + dialog. Một trang hai cách lọc thì người dùng học được nút phễu ở
 * khối dưới rồi lên khối trên đi tìm một nút không có. Các test dưới khoá lại pattern chung.
 */
describe('RevenueTrendChart — lọc bằng nút phễu như hai khối kia', () => {
  it('có nút "Bộ lọc" mở dialog, không còn ô lọc nào bày trên thanh tiêu đề', async () => {
    render(<RevenueTrendChart />)

    const filterButton = screen.getByRole('button', { name: /Bộ lọc/i })
    expect(h.dialogs).toHaveLength(0)

    await userEvent.click(filterButton)

    expect(h.dialogs).toHaveLength(1)
    expect(h.dialogs[0].title).toBe('Bộ lọc')
  })

  it('nhãn hai ô ngày nằm TRONG dialog, không nằm trên thanh tiêu đề', () => {
    render(<RevenueTrendChart />)

    // Chưa mở dialog thì không nhãn nào được vẽ ra — đây là điểm khác cốt lõi so với bản cũ,
    // và cũng là thứ khiến thanh tiêu đề hết bị ba ô đẩy cho tràn dòng ở màn hẹp.
    expect(screen.queryByText('Thời gian (tính theo ngày cọc)')).toBeNull()
    expect(screen.queryByText('Ngày làm phiếu TTGD')).toBeNull()
  })

  it('phụ đề nói ra biểu đồ đang vẽ phạm vi nào, cách nhóm nào', () => {
    render(<RevenueTrendChart />)

    // Ba ô lọc đã vào dialog nên phụ đề là chỗ DUY NHẤT còn nói được điều này khi dialog đóng.
    expect(screen.getByText('Tất cả thời gian · Theo tháng')).toBeTruthy()
  })

  it('mặc định gọi API với `group=month` và KHÔNG kèm tham số TTGD', () => {
    render(<RevenueTrendChart />)

    expect(lastParams()).toMatchObject({ group: 'month' })
    expect(lastParams()).not.toHaveProperty('transaction_sheet_date_from')
    expect(lastParams()).not.toHaveProperty('transaction_sheet_date_to')
  })

  it('badge đếm sạch khi chưa lọc — `group` không phải điều kiện thu hẹp', () => {
    render(<RevenueTrendChart />)

    // `AmountBadge` chỉ được vẽ khi `filterCount > 0`; mặc định `group=month` vẫn phải là 0.
    expect(screen.queryByText('1')).toBeNull()
  })
})
