import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
import type { Deal, DealListSummary } from '@/features/sales/deals/services/deal-service'

/**
 * Dòng tổng dưới bảng "Danh sách giao dịch" (CR 86eykdvpg).
 *
 * Hai luật được canh ở đây, cả hai đều là loại lỗi chạy trót lọt và chỉ sai số:
 *
 * 1. Số trong dòng tổng đến từ khối `summary` của API — tính trên TOÀN BỘ tập đã lọc.
 *    Cộng tay các dòng của trang đang xem cũng ra một con số trông hợp lý, nhưng nó là
 *    tổng của trang chứ không phải của bộ lọc, và nó sẽ lệch với 4 thẻ ở đầu màn vốn đã
 *    đọc đúng khối này. Test dựng dữ liệu mà tổng-của-trang KHÁC HẲN summary để phân biệt
 *    được hai nguồn.
 *
 * 2. Cột phần trăm KHÔNG có ô tổng. Cộng phần trăm xuống một cột ra số vô nghĩa.
 */

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 1,
    code: 'HD000001',
    status: 'active',
    listed_price: '1000000',
    fee_calculation_price: '1000000',
    revenue_amount: '1000000',
    agency_fee_amount: '1000000',
    total_amount: '1000000',
    total_sales_fee: '1000000',
    total_advanced_amount: '1000000',
    invoiced_net_amount: '1000000',
    bonus_amount: '1000000',
    remaining_amount: '1000000',
    pct_revenue: '80.00',
    agency_fee_rate: '2.00',
    reconciliation_rate: '50.0',
    invoiced_reconciliation_pct: '50.00',
    remaining_reconciliation_pct: '50.00',
    sales_participants_summary: [],
    ...overrides,
  } as unknown as Deal
}

/**
 * Cố tình KHÔNG bằng tổng của `makeDeal()`: mỗi khoá mang một giá trị riêng biệt, đủ xa
 * 1.000.000 để nếu ai đó thay bằng phép cộng trang thì test đỏ chứ không trùng số ngẫu nhiên.
 */
const SUMMARY: DealListSummary = {
  deal_count: 348,
  excluded_deal_count: 7,
  listed_price: '111000000',
  fee_calculation_price: '222000000',
  revenue_amount: '333000000',
  agency_fee_amount: '444000000',
  total_amount: '555000000',
  total_sales_fee: '666000000.00000000',
  total_advanced_amount: '777000000.00',
  invoiced_net_amount: '888000000',
  bonus_amount: '999000000',
  remaining_amount: '123000000',
}

function renderTable(props: Partial<React.ComponentProps<typeof DealTable>> = {}) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <DealTable
          data={[makeDeal()]}
          isLoading={false}
          currentPage={1}
          pageSize={25}
          totalRecords={1}
          {...props}
        />
      </SidebarProvider>
    </MemoryRouter>
  )
}

/** Nội dung từng ô của dòng tổng, tách khỏi các ô cùng giá trị trong thân bảng. */
function summaryCells(): string[] {
  const summaryRow = screen.getByRole('row', { name: /TỔNG CỘNG/ })
  return within(summaryRow)
    .getAllByRole('cell')
    .map((cell) => cell.textContent?.trim() ?? '')
}

describe('DealTable — dòng tổng dưới bảng', () => {
  it('không hiện dòng tổng khi response chưa có summary', () => {
    // Arrange & Act — thà không có dòng nào còn hơn hiện một dòng toàn số 0 trông như thật
    renderTable({ summary: undefined })

    // Assert
    expect(screen.queryByRole('row', { name: /TỔNG CỘNG/ })).not.toBeInTheDocument()
  })

  it('hiện dòng tổng với nhãn "TỔNG CỘNG" khi đã có summary', () => {
    // Arrange & Act
    renderTable({ summary: SUMMARY, summaryRowCount: 348 })

    // Assert
    expect(screen.getByRole('row', { name: /TỔNG CỘNG/ })).toBeInTheDocument()
  })

  it('lấy số từ summary của API chứ không cộng các dòng đang hiển thị', () => {
    // Arrange & Act — mỗi dòng đều là 1.000.000; nếu cộng trang thì mọi ô tổng sẽ ra 1.000.000
    renderTable({ summary: SUMMARY, summaryRowCount: 348 })
    const cells = summaryCells().join(' | ')

    // Assert — đủ cả 10 cột tiền, đúng con số của summary
    for (const amount of [
      '111.000.000',
      '222.000.000',
      '333.000.000',
      '444.000.000',
      '555.000.000',
      '666.000.000',
      '777.000.000',
      '888.000.000',
      '999.000.000',
      '123.000.000',
    ]) {
      expect(cells).toContain(amount)
    }
  })

  it('KHÔNG tổng các cột phần trăm', () => {
    // Arrange & Act
    renderTable({ summary: SUMMARY, summaryRowCount: 348 })

    // Assert — mọi ô có nội dung đều là tiền hoặc nhãn; không ô nào mang dạng "%"
    expect(summaryCells().filter((text) => text.includes('%'))).toEqual([])
  })

  it('đếm theo deal_count (đã loại huỷ/bỏ), không phải theo số dòng của trang', () => {
    // Arrange & Act — trang chỉ có 1 dòng, nhưng bộ lọc khớp 348 deal
    renderTable({ summary: SUMMARY, summaryRowCount: 348 })

    // Assert
    expect(screen.getByRole('row', { name: /TỔNG CỘNG/ })).toHaveTextContent(
      'TỔNG CỘNG (348 bản ghi)'
    )
  })
})
