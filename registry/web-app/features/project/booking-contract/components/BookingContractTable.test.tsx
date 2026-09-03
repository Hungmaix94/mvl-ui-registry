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
  default: () => ({ keysMapOptions: new Map() }),
}))

vi.mock('@/hooks/useDialog', () => ({
  useDialog: () => ({
    displayFormContent: vi.fn(),
    displayClose: vi.fn(),
    setLoading: vi.fn(),
    displayConfirm: vi.fn(),
  }),
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('@/services/sales-service', () => ({
  useDeleteBooking: () => ({ mutate: vi.fn() }),
  useApproveBooking: () => ({ mutateAsync: vi.fn() }),
  useRejectBooking: () => ({ mutateAsync: vi.fn() }),
  useAccountantApproveBooking: () => ({ mutateAsync: vi.fn() }),
  useAdminLeadApproveBooking: () => ({ mutateAsync: vi.fn() }),
}))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import BookingContractTable from './BookingContractTable'
import type { Booking } from '@/services/sales-service'

function makeRow(overrides: Record<string, unknown> = {}): Booking {
  return {
    id: 7,
    code: 'HDDC-2026-0007',
    contract_number: 'PDC-001',
    customer_detail: { id: 3, name: 'Nguyễn Văn A' },
    project_detail: { id: 12, code: 'DA-12', name: 'Khu đô thị Mai Việt Land' },
    product_inventory_detail: { id: 55, code: 'BDS-55', unit_number: 'A-12-05' },
    booking_date: '2026-07-24',
    payment_amount: '50000000',
    booking_status: 'booked',
    approval_status: 'approved',
    ...overrides,
  } as unknown as Booking
}

function renderTable(props: Record<string, unknown> = {}, rows: Booking[] = [makeRow()]) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SidebarProvider>
          <BookingContractTable
            data={rows}
            isLoading={false}
            totalRecords={rows.length}
            {...props}
          />
        </SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('BookingContractTable — cột "Dự án" (CR STT22)', () => {
  it('hiển thị cột Dự án và link tên dự án về màn chi tiết dự án', () => {
    const { getByText, getByRole } = renderTable()

    expect(getByText('Dự án')).toBeInTheDocument()
    const link = getByRole('link', { name: 'Khu đô thị Mai Việt Land' })
    expect(link).toHaveAttribute('href', '/project-admin/project/management/12')
  })

  it('mở chi tiết dự án ở tab mới, không rời màn danh sách', () => {
    const { getByRole } = renderTable()
    const link = getByRole('link', { name: 'Khu đô thị Mai Việt Land' })

    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('đặt cột Dự án ngay sau Tên khách hàng và trước Mã bất động sản', () => {
    const { getAllByRole } = renderTable()
    const headers = getAllByRole('columnheader').map((th) => th.textContent?.trim())

    expect(headers.indexOf('Dự án')).toBe(headers.indexOf('Tên khách hàng') + 1)
    expect(headers.indexOf('Dự án')).toBe(headers.indexOf('Mã bất động sản') - 1)
  })

  it('hiển thị "-" khi hợp đồng chưa gắn dự án', () => {
    const { queryByRole } = renderTable({}, [makeRow({ project_detail: null })])

    expect(queryByRole('link', { name: 'Khu đô thị Mai Việt Land' })).not.toBeInTheDocument()
  })

  it('ẩn cột Dự án khi showProjectColumn={false} (bảng nhúng trong chi tiết bất động sản)', () => {
    const { queryByText } = renderTable({ showProjectColumn: false })

    expect(queryByText('Dự án')).not.toBeInTheDocument()
  })
})
