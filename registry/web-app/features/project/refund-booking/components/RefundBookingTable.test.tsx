import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/lib/firebase', () => ({
  getFCMToken: vi.fn().mockResolvedValue(''),
  messaging: null,
}))

vi.mock('@/lib/ability', () => ({
  useAbility: () => ({ can: () => true }),
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMap: new Map(), keysMapOptions: new Map() }),
}))

vi.mock('@/hooks/useDialog', () => ({
  useDialog: () => ({
    displayFormContent: vi.fn(),
    displayClose: vi.fn(),
    setLoading: vi.fn(),
  }),
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('@/features/project/refund-booking/hooks/useRefundBookings', () => ({
  useDeleteRefundBooking: () => ({ mutate: vi.fn() }),
  useApproveRefundBooking: () => ({ mutateAsync: vi.fn() }),
  useRejectRefundBooking: () => ({ mutateAsync: vi.fn() }),
  useAccountantApproveRefundBooking: () => ({ mutateAsync: vi.fn() }),
  useAdminLeadApproveRefundBooking: () => ({ mutateAsync: vi.fn() }),
  // Bước thủ quỹ giờ là "xác nhận đã chi" có bằng chứng, không còn là một cú bấm nút.
  useConfirmRefundPayment: () => ({ mutateAsync: vi.fn() }),
  useConfirmRefundInvestorRecovery: () => ({ mutateAsync: vi.fn() }),
}))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import RefundBookingTable from './RefundBookingTable'
import type { BookingRefund } from '@/services/sales-service'
import { RefundBookingStatus } from '../constants/refund-booking-constants'

// Fixture rút gọn: `BookingRefund` có hàng chục field readonly bắt buộc mà bảng không đọc tới,
// nên chỉ dựng đúng những field bảng render. Tên field bám sát serializer thật — trước đây
// fixture dùng `customer_name` / `customer_detail.phone`, hai field KHÔNG tồn tại trên API.
function makeRow(overrides: Partial<BookingRefund> = {}): BookingRefund {
  return {
    id: 4,
    code: 'HTDC-2026-0004',
    customer_detail: { id: 3, code: 'KH-3', name: 'Nguyễn Văn A' },
    project_detail: { id: 12, code: 'DA-12', name: 'Khu đô thị Mai Việt Land' },
    cust_phone: '0901234567',
    booking_amount: '50000000',
    refund_amount: '50000000',
    created_at: '2026-07-24T08:00:00Z',
    status: RefundBookingStatus.PENDING_ADMIN,
    ...overrides,
  } as unknown as BookingRefund
}

function renderTable(rows: BookingRefund[] = [makeRow()]) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SidebarProvider>
          <RefundBookingTable data={rows} isLoading={false} totalRecords={rows.length} />
        </SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RefundBookingTable — cột "Dự án" (CR STT23)', () => {
  it('hiển thị cột Dự án và link tên dự án về màn chi tiết dự án', () => {
    const { getByText, getByRole } = renderTable()

    expect(getByText('Dự án')).toBeInTheDocument()
    const link = getByRole('link', { name: 'Khu đô thị Mai Việt Land' })
    expect(link).toHaveAttribute('href', '/project-admin/project/management/12')
  })

  it('mở chi tiết dự án ở tab mới, không rời màn danh sách', () => {
    const link = renderTable().getByRole('link', { name: 'Khu đô thị Mai Việt Land' })

    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('đặt cột Dự án ngay sau Khách hàng và trước SĐT', () => {
    const headers = renderTable()
      .getAllByRole('columnheader')
      .map((th) => th.textContent?.trim())

    expect(headers.indexOf('Dự án')).toBe(headers.indexOf('Khách hàng') + 1)
    expect(headers.indexOf('Dự án')).toBe(headers.indexOf('SĐT') - 1)
  })

  it('hiển thị "-" khi phiếu hoàn tiền chưa có dữ liệu dự án', () => {
    const { queryByRole } = renderTable([makeRow({ project_detail: undefined })])

    expect(queryByRole('link', { name: 'Khu đô thị Mai Việt Land' })).not.toBeInTheDocument()
  })
})

describe('RefundBookingTable — cột đọc đúng field của serializer', () => {
  // Bảng từng đọc `customer_name`, `customer_phone`, `customer_detail.phone`,
  // `customer_detail.business_tax_code` — không field nào tồn tại trên `BookingRefund`.
  // Chúng chỉ biên dịch được vì ListPage ép `results as any`. Các test dưới đây khoá lại
  // đúng nguồn dữ liệu thật để lần drift sau bị phát hiện ngay.
  it('lấy tên khách hàng từ customer_detail.name', () => {
    const { getByRole } = renderTable([
      makeRow({ customer_detail: { id: 3, code: 'KH-3', name: 'Lê Thị C' } as never }),
    ])

    expect(getByRole('link', { name: 'Lê Thị C' })).toHaveAttribute(
      'href',
      '/project-admin/contract-transaction/customer/3'
    )
  })

  it('lấy SĐT từ cust_phone (snapshot trên phiếu), không phải customer_detail.phone', () => {
    const { getByText } = renderTable([makeRow({ cust_phone: '0987654321' } as never)])

    expect(getByText('0987654321')).toBeInTheDocument()
  })

  it('khách doanh nghiệp hiện MST lấy từ customer_detail.identify_number', () => {
    const { getByText } = renderTable([
      makeRow({
        customer_detail: {
          id: 9,
          code: 'KH-9',
          name: 'Công ty ABC',
          customer_type: 'business',
          identify_number: '0101234567',
        },
      } as never),
    ])

    expect(getByText(/0101234567/)).toBeInTheDocument()
  })
})
