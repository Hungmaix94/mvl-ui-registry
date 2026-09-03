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

/**
 * `DealList` is a generated schema; the table reads a known subset, so the fixture declares
 * just what's used and casts ONCE at the test boundary.
 *
 * Numbers mirror the BE test: base (`total_amount`) 47.000.000, invoiced 11.750.000 -> 25%.
 */
function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 1,
    code: 'HD000001',
    status: 'active',
    listed_price: '2000000000',
    fee_calculation_price: '2000000000',
    total_amount: '47000000',
    total_sales_fee: '0',
    total_advanced_amount: '0',
    reconciliation_rate: '80',
    invoiced_reconciliation_pct: '25.00',
    invoiced_net_amount: '11750000',
    bonus_amount: '8000000',
    remaining_amount: '35250000',
    remaining_reconciliation_pct: '75.00',
    ...overrides,
  } as unknown as Deal
}

function renderTable(data: Deal[]) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <DealTable data={data} isLoading={false} currentPage={1} pageSize={25} totalRecords={data.length} />
      </SidebarProvider>
    </MemoryRouter>
  )
}

describe('DealTable — cột đối chiếu theo hoá đơn', () => {
  it('render đủ 5 tiêu đề cột mới', () => {
    renderTable([makeDeal()])

    for (const header of [
      'Phần trăm đối chiếu (theo HĐ)',
      'Thành tiền đối chiếu (theo HĐ)',
      'Thưởng',
      'Còn lại',
      'Phần trăm đối chiếu còn lại (theo HĐ)',
    ]) {
      expect(screen.getByText(header)).toBeInTheDocument()
    }
  })

  it('format tiền theo VND và phần trăm theo quy tắc floor 2 số lẻ', () => {
    renderTable([makeDeal()])

    expect(screen.getByText('11.750.000')).toBeInTheDocument()
    expect(screen.getByText('8.000.000')).toBeInTheDocument()
    expect(screen.getByText('35.250.000')).toBeInTheDocument()
    // Hai cột % cộng đúng 100 — cùng một gốc tiền.
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('cắt % xuống 2 số lẻ thay vì làm tròn lên', () => {
    // BE trả 33,339 -> phải hiện 33,33 (floor), không phải 33,34.
    renderTable([makeDeal({ invoiced_reconciliation_pct: '33.339' })])

    expect(screen.getByText('33,33%')).toBeInTheDocument()
    expect(screen.queryByText('33,34%')).not.toBeInTheDocument()
  })

  it('hiện em-dash khi % là null (mẫu số bằng 0), không hiện 0%', () => {
    renderTable([
      makeDeal({
        total_amount: '0',
        invoiced_reconciliation_pct: null,
        remaining_reconciliation_pct: null,
      }),
    ])

    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('tô đỏ "Còn lại" khi khác 0 và để màu thường khi bằng 0', () => {
    const { rerender } = renderTable([makeDeal()])
    expect(screen.getByText('35.250.000')).toHaveClass('text-action-primary-red-default')

    rerender(
      <MemoryRouter>
        <SidebarProvider>
          <DealTable
            data={[
              // The other two money columns default to '0' in the fixture; give them
              // distinct values so the '0' looked up below can only be "Còn lại".
              makeDeal({ remaining_amount: '0', total_sales_fee: '111', total_advanced_amount: '222' }),
            ]}
            isLoading={false}
            currentPage={1}
            pageSize={25}
            totalRecords={1}
          />
        </SidebarProvider>
      </MemoryRouter>
    )
    expect(screen.getByText('0')).toHaveClass('text-content-dark-1')
  })
})
