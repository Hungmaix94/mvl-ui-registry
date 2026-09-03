import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * Guard cấp MÀN cho tab "Lô áp dụng" của Chi tiết giao dịch (ClickUp 86eyp3uzc).
 *
 * `lad-event.test.ts` đã phủ kỹ hai helper, nhưng lỗi gốc của ticket KHÔNG nằm ở logic tính tiêu đề
 * — nó nằm ở chỗ component **bỏ qua** `batch_name`, một field đã có sẵn trong response. Helper đúng
 * mà component không gọi thì test helper vẫn xanh còn màn hình vẫn sai; chỉ test render bắt được.
 *
 * Cách phân biệt "chuỗi được dùng làm TIÊU ĐỀ" với "chuỗi nằm ở dòng lý do": ô tiêu đề là ô duy
 * nhất có `fontWeight: 700`. Kiểm bằng nội dung không thôi là chưa đủ — lý do vẫn được render hợp
 * lệ ở cuối thẻ, nên `queryByText(<lý do>)` không phân biệt được hai ca.
 *
 * Dữ liệu chép từ API đang chạy (đo 20/08/2026):
 * `GET /api/sales/deals/{1571,2853}/commission-config/` → `history[]`.
 */

vi.mock('@/features/project/sale-allocations/components/tbc/CurrentTbcConfigCard', () => ({
  default: () => null,
}))

const HISTORY = [
  // deal 1571 v1 — bản khởi tạo, không thuộc lô nào
  {
    id: 1,
    version_number: 1,
    source: 'creation',
    batch_code: null,
    batch_name: null,
    batch_id: null,
    batch_sales_allocation_id: null,
    reason: '',
    pct_agency_fee: '6.00',
    created_at: '2026-06-15T10:47:00Z',
  },
  // deal 1571 — lô CHƯA đặt tên nhưng có lý do ⇒ tiêu đề rơi về lý do
  {
    id: 2,
    version_number: 2,
    source: 'bulk_retro',
    batch_code: 'LAD-2026-0075',
    batch_name: '',
    batch_id: 102,
    batch_sales_allocation_id: 1927,
    reason: 'test ko VAT',
    pct_agency_fee: '5.00',
    created_at: '2026-06-16T03:32:00Z',
  },
  // deal 1571 — lô CÓ tên ⇒ tiêu đề phải là TÊN LÔ (đúng thứ ticket đòi)
  {
    id: 3,
    version_number: 3,
    source: 'bulk_retro',
    batch_code: 'LAD-2026-0077',
    batch_name: 'Lô Áp dụng bắt đầu 17/6',
    batch_id: 104,
    batch_sales_allocation_id: 1927,
    reason: 'Lô Áp dụng bắt đầu 17/6',
    pct_agency_fee: '5.10',
    created_at: '2026-06-16T04:41:00Z',
  },
  // deal 2853 v3 — tên lô và lý do LỆCH nhau: ca duy nhất phân biệt được "đọc batch_name" với
  // "đọc reason". Lô này thiếu id ⇒ mã lô phải là text thường, không phải link chết.
  {
    id: 4,
    version_number: 4,
    source: 'bulk_retro',
    batch_code: 'LAD-2026-0143',
    batch_name: 'TC08',
    batch_id: null,
    batch_sales_allocation_id: null,
    reason: '4-8',
    pct_agency_fee: '5.20',
    created_at: '2026-06-16T05:10:00Z',
  },
]

vi.mock('../services/deal-service', () => ({
  useDealCommissionConfigList: () => ({
    data: { data: { current: HISTORY[3], history: HISTORY } },
    isLoading: false,
    error: null,
  }),
  useDealWorkspace: () => ({
    data: { pricing: { fee_calculation_price: '2000000000', listed_price: '2000000000' } },
  }),
}))

const { default: DealLadTab } = await import('./DealLadTab')

const renderTab = () =>
  render(
    <MemoryRouter>
      <DealLadTab dealId={1571} />
    </MemoryRouter>
  )

/** Ô tiêu đề của thẻ LAD là ô duy nhất in đậm `fontWeight: 700`. */
const TITLE_STYLE = { fontWeight: '700' }

describe('DealLadTab — tên lô trên thẻ LAD (86eyp3uzc)', () => {
  it('lô CÓ tên ⇒ tên lô là TIÊU ĐỀ thẻ, không phải nhãn kỹ thuật ghép %', () => {
    renderTab()
    expect(screen.getByText('Lô Áp dụng bắt đầu 17/6')).toHaveStyle(TITLE_STYLE)
    // Nhãn cũ ("Hồi tố nội bộ — LAD-2026-0077 (+0,10%)") là đúng thứ ticket báo là che mất tên lô.
    expect(screen.queryByText(/^Hồi tố nội bộ —/)).not.toBeInTheDocument()
  })

  it('tiêu đề đọc `batch_name`, KHÔNG phải `reason` — hai field lệch nhau trong dữ liệu thật', () => {
    renderTab()
    // batch_name = "TC08", reason = "4-8". Cả hai đều hiện trên thẻ, nhưng chỉ TC08 được in đậm.
    expect(screen.getByText('TC08')).toHaveStyle(TITLE_STYLE)
    expect(screen.getByText('4-8')).not.toHaveStyle(TITLE_STYLE)
  })

  it('lô CHƯA đặt tên ⇒ tiêu đề rơi về lý do, không để trống', () => {
    renderTab()
    expect(screen.getByText('test ko VAT')).toHaveStyle(TITLE_STYLE)
  })

  it('bản ghi `creation` giữ nhãn cố định, không mượn tên lô nào', () => {
    renderTab()
    expect(screen.getByText('Khởi tạo từ Hợp đồng môi giới gốc')).toHaveStyle(TITLE_STYLE)
  })

  it('mã lô đủ id ⇒ link sang chi tiết LAD; thiếu id ⇒ text thường, không tạo link chết', () => {
    renderTab()
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['LAD-2026-0075', 'LAD-2026-0077'])
    expect(links[1]).toHaveAttribute(
      'href',
      expect.stringContaining('lad_view=detail&batch_id=104') as unknown as string
    )
    // LAD-2026-0143 thiếu batch_id ⇒ không được nằm trong danh sách link.
    expect(links.map((l) => l.textContent)).not.toContain('LAD-2026-0143')
  })
})
