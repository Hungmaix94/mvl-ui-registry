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
 * CR 86eymaa3v — màn danh sách giao dịch:
 *   - cột "Tổng phí trả sale" đổi tên thành "Tổng tiền trả sale"
 *   - thêm cột "Tổng phí HH trả sale" hiển thị %
 *
 * Cái bẫy đắt nhất ở đây là hai cột nghe rất giống nhau nhưng KHÔNG phải một cặp
 * tiền/tỷ lệ: cột tiền chỉ cộng sale nội bộ, cột % cộng tỷ lệ của mọi bên phân chia.
 * Nên có test canh riêng cả hai cùng tồn tại và đọc đúng hai khoá khác nhau.
 */

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 1,
    code: 'HD000001',
    status: 'active',
    listed_price: '2000000000',
    fee_calculation_price: '2000000000',
    total_amount: '47000000',
    total_sales_fee: '31000000',
    total_sales_fee_pct: '3.500',
    sales_participants_summary: [],
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

describe('DealTable — phí hoa hồng trả sale (CR 86eymaa3v)', () => {
  it('đổi tên cột tiền thành "Tổng tiền trả sale", không còn tên cũ', () => {
    renderTable([makeDeal()])

    expect(screen.getByText('Tổng tiền trả sale')).toBeInTheDocument()
    expect(screen.queryByText('Tổng phí trả sale')).not.toBeInTheDocument()
  })

  it('có cột mới "Tổng phí HH trả sale"', () => {
    renderTable([makeDeal()])

    expect(screen.getByText('Tổng phí HH trả sale')).toBeInTheDocument()
  })

  it('hai cột cùng tồn tại và đọc HAI khoá khác nhau', () => {
    // Không phải cặp tiền/tỷ lệ: 31.000.000đ và 3,5% không suy ra được nhau.
    renderTable([makeDeal({ total_sales_fee: '31000000', total_sales_fee_pct: '3.500' })])

    expect(screen.getByText('3,5%')).toBeInTheDocument()
    expect(screen.getByText('31.000.000')).toBeInTheDocument()
  })

  it('giữ đủ 3 chữ số thập phân của tỷ lệ', () => {
    // BE nâng percentage lên 3dp từ 2026-08-12 cho tỷ lệ F2; format cắt còn 2 là mất số.
    renderTable([makeDeal({ total_sales_fee_pct: '0.125' })])

    expect(screen.getByText('0,125%')).toBeInTheDocument()
  })

  it('deal chưa có phân chia nào hiện 0%, không phải gạch ngang', () => {
    // BE Coalesce về "0.000" — 0% nghĩa là "chưa thoả thuận gì", khác hẳn với
    // "không tải được số", nên không được render thành "-".
    renderTable([makeDeal({ total_sales_fee_pct: '0.000' })])

    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('không vỡ khi BE chưa deploy trường mới', () => {
    const deal = makeDeal()
    delete (deal as Record<string, unknown>).total_sales_fee_pct

    expect(() => renderTable([deal])).not.toThrow()
    expect(screen.getByText('Tổng phí HH trả sale')).toBeInTheDocument()
  })
})
