import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// jsdom lacks ResizeObserver, which the Table/Sidebar layout relies on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

// Imported after the stub above is registered.
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import DealTable from './DealTable'
import type { Deal } from '@/features/sales/deals/services/deal-service'

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 1,
    code: 'HD000001',
    status: 'active',
    listed_price: '2000000000',
    fee_calculation_price: '2000000000',
    total_amount: '47000000',
    sales_participants_summary: [
      { name: 'Dương Mạnh Linh', participation_percentage: '60.00' },
      { name: 'Phan Đức Long', participation_percentage: '20.00' },
      { name: 'Lương Như Quỳnh', participation_percentage: '20.00' },
    ],
    ...overrides,
  } as unknown as Deal
}

function renderTable(data: Deal[]) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <DealTable
          data={data}
          isLoading={false}
          currentPage={1}
          pageSize={25}
          totalRecords={data.length}
        />
      </SidebarProvider>
    </MemoryRouter>
  )
}

describe('DealTable — cột "Họ và tên sale tổng hợp"', () => {
  it('thay hẳn cột "Đại lý" cũ', () => {
    renderTable([makeDeal()])

    expect(screen.getByText('Họ và tên sale tổng hợp')).toBeInTheDocument()
    // "Phí đại lý" vẫn còn, nên phải khớp CHÍNH XÁC nhãn cũ.
    expect(screen.queryByText('Đại lý')).not.toBeInTheDocument()
    expect(screen.getByText('Phí đại lý')).toBeInTheDocument()
  })

  it('hiện danh sách sale kèm tỷ lệ tham gia', () => {
    renderTable([makeDeal()])

    expect(
      screen.getByText('Dương Mạnh Linh 60% - Phan Đức Long 20% - Lương Như Quỳnh 20%')
    ).toBeInTheDocument()
  })

  it('deal F2 hiện tên sàn kèm tỷ lệ', () => {
    renderTable([
      makeDeal({
        sales_participants_summary: [
          { name: 'Sàn Đất Xanh Miền Bắc', participation_percentage: '100.00' },
        ],
      } as Partial<Deal>),
    ])

    expect(screen.getByText('Sàn Đất Xanh Miền Bắc 100%')).toBeInTheDocument()
  })

  it('hiện "-" khi deal chưa có sale nào', () => {
    renderTable([makeDeal({ sales_participants_summary: [] } as Partial<Deal>)])

    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })

  it('không vỡ khi BE chưa deploy trường mới', () => {
    renderTable([makeDeal({ sales_participants_summary: undefined } as Partial<Deal>)])

    expect(screen.getByText('Họ và tên sale tổng hợp')).toBeInTheDocument()
  })
})
