import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// jsdom lacks ResizeObserver, which the Table/Sidebar layout relies on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

// Imported after the stub above is registered.
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import AdvanceOutstandingReportTable from './AdvanceOutstandingReportTable'
import type {
  AdvanceOutstandingReportResponse,
  AdvanceOutstandingRow,
} from './advance-outstanding-types'

/**
 * `AdvanceOutstandingRow` is a generated schema with many fields; the table reads a known subset,
 * so the fixture declares just what's used and casts ONCE at the test boundary.
 */
function makeRow(overrides: Partial<AdvanceOutstandingRow> = {}): AdvanceOutstandingRow {
  return {
    advance_id: 101,
    advance_code: 'TU-101',
    advance_kind: 'HH',
    advance_status: 'PAID',
    recipient_line_id: 1,
    recipient_type: 'employee',
    recipient_name: 'Nguyễn Văn A',
    employee_code: 'NV001',
    department: 'Phòng Sale',
    reason: 'Ứng công tác',
    deal: { id: 9, code: 'DEAL-9' },
    deal_cancelled: false,
    paid_amount: '5000000',
    recovered_amount: '0',
    written_off_amount: '0',
    outstanding: '5000000',
    residual_resolution: '',
    disbursed_at: '2026-05-01T00:00:00Z',
    age_days: 20,
    aging_bucket: '0-30',
    ...overrides,
  } as unknown as AdvanceOutstandingRow
}

function renderTable(data: AdvanceOutstandingReportResponse) {
  return render(
    <SidebarProvider>
      <AdvanceOutstandingReportTable
        data={data}
        isLoading={false}
        pageSize={25}
        currentPageIndex={0}
        onPaginationChange={vi.fn()}
      />
    </SidebarProvider>
  )
}

describe('AdvanceOutstandingReportTable — header summary', () => {
  it('hiển thị tổng cần hoàn ứng từ BE, số phiếu (advance_id duy nhất) và tuổi nợ cũ nhất', () => {
    const data = {
      total_outstanding: '8000000',
      results: [
        makeRow({ advance_id: 101, age_days: 20, outstanding: '5000000' }),
        makeRow({ advance_id: 102, age_days: 65, outstanding: '3000000', deal_cancelled: true }),
      ],
    } as unknown as AdvanceOutstandingReportResponse

    renderTable(data)

    // Tổng cần hoàn ứng = total_outstanding (BE), không tự cộng từ dòng.
    expect(screen.getByText('Tổng cần hoàn ứng')).toBeInTheDocument()
    expect(screen.getAllByText(/8\D?000\D?000/).length).toBeGreaterThan(0)

    // 2 advance_id khác nhau ⇒ 2 phiếu; tuổi nợ cũ nhất = max(age_days) = 65.
    expect(screen.getByText('2 phiếu')).toBeInTheDocument()
    expect(screen.getByText('65 ngày')).toBeInTheDocument()
  })

  it('gộp các dòng cùng một phiếu (advance_id) khi đếm số phiếu', () => {
    const data = {
      total_outstanding: '9000000',
      results: [
        makeRow({ advance_id: 200, recipient_line_id: 1, age_days: 10 }),
        makeRow({ advance_id: 200, recipient_line_id: 2, age_days: 40 }),
      ],
    } as unknown as AdvanceOutstandingReportResponse

    renderTable(data)

    expect(screen.getByText('1 phiếu')).toBeInTheDocument()
    expect(screen.getByText('40 ngày')).toBeInTheDocument()
  })
})

describe('AdvanceOutstandingReportTable — bảng', () => {
  it('render cột "Còn lại" và số tiền outstanding của dòng (server-computed)', () => {
    const data = {
      total_outstanding: '5000000',
      results: [makeRow({ outstanding: '5000000' })],
    } as unknown as AdvanceOutstandingReportResponse

    renderTable(data)

    expect(screen.getByText('Còn lại')).toBeInTheDocument()
    expect(screen.getAllByText(/5\D?000\D?000/).length).toBeGreaterThan(0)
  })

  it('hiện badge "Deal đã hủy" khi deal_cancelled', () => {
    const data = {
      total_outstanding: '3000000',
      results: [makeRow({ deal_cancelled: true })],
    } as unknown as AdvanceOutstandingReportResponse

    renderTable(data)

    expect(screen.getByText('Deal đã hủy')).toBeInTheDocument()
  })

  it('đọc employee_code / department / reason trực tiếp từ schema (không cần fallback as-any)', () => {
    const data = {
      total_outstanding: '5000000',
      results: [makeRow({ employee_code: 'NV777', department: 'Phòng KT', reason: 'Ứng lương' })],
    } as unknown as AdvanceOutstandingReportResponse

    renderTable(data)

    expect(screen.getByText('NV777')).toBeInTheDocument()
    expect(screen.getByText('Phòng KT')).toBeInTheDocument()
    expect(screen.getByText('Ứng lương')).toBeInTheDocument()
  })
})
