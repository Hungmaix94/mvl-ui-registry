import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const queryParams: Record<string, unknown>[] = []
const exportTransactionsByProject = vi.fn()

type Row = {
  project: { id: number; name: string; investor?: { name: string } | null }
  deal_count: number
  revenue_amount: string
  fee_calculation_price: string
  goods_amount: string
  reconciliation_amount: string
  remaining_amount: string
}

let responseData: {
  count: number
  page: number
  page_size: number
  results: Row[]
}

vi.mock('@/features/sales/admin-dashboard/services/admin-dashboard-service', () => ({
  useAdminDashboardAllTransactionsByProject: (params: Record<string, unknown>) => {
    queryParams.push(params)
    return { data: responseData, isLoading: false }
  },
  getAdminDashboardService: () => ({ exportTransactionsByProject }),
}))

vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: () => true }) }))

const displayFormContent = vi.fn()
vi.mock('@/hooks/useDialog.ts', () => ({
  useDialog: () => ({ displayFormContent, displayClose: vi.fn() }),
}))

// Imported after the mocks above are registered.
import TransactionsByProjectChart from './TransactionsByProjectChart'

const makeRows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({
    project: { id: i + 1, name: `Dự án ${i + 1}`, investor: { name: 'CĐT A' } },
    deal_count: 1,
    revenue_amount: `${(n - i) * 1000000}`,
    fee_calculation_price: '2000000',
    goods_amount: '3000000',
    reconciliation_amount: '4000000',
    remaining_amount: '5000000',
  }))

const renderChart = () =>
  render(
    <MemoryRouter>
      <TransactionsByProjectChart />
    </MemoryRouter>
  )

/** Các hàng dữ liệu của bảng ẩn a11y (bỏ hàng tiêu đề). */
const dataRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

describe('TransactionsByProjectChart', () => {
  beforeEach(() => {
    queryParams.length = 0
    exportTransactionsByProject.mockClear()
    displayFormContent.mockClear()
    responseData = { count: 25, page: 1, page_size: 10, results: makeRows(25) }
  })

  it('vẽ MỌI dự án của bộ lọc trong MỘT request — dashboard không phân trang', () => {
    renderChart()

    expect(dataRows()).toHaveLength(25)
    // MỘT request, không có `page`. Việc gửi `page_size: 0` (hợp đồng "trả hết" của BE) nằm
    // trong `useAdminDashboardAllTransactionsByProject` — test mock hook đó nên nó được canh
    // ở đúng tầng service, xem `admin-dashboard-service.test.ts`.
    expect(queryParams).toHaveLength(1)
    expect(queryParams[0]).not.toHaveProperty('page')
  })

  it('không còn thanh phân trang trên khối này', () => {
    renderChart()

    expect(screen.queryByRole('button', { name: 'Trang sau' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Trang trước' })).not.toBeInTheDocument()
  })

  it('Xuất Excel dùng ĐÚNG bộ lọc đang hiện trên màn hình', async () => {
    const user = userEvent.setup()
    renderChart()

    await user.click(screen.getByRole('button', { name: 'Tải xuống' }))

    expect(exportTransactionsByProject).toHaveBeenCalledTimes(1)
    const exportParams = exportTransactionsByProject.mock.calls[0][0]
    expect(exportParams).not.toHaveProperty('page')
    // `toBe` chứ KHÔNG phải `toEqual`: chưa lọc gì thì cả hai vế đều là `{}`, mà `{}` bằng
    // `{}` là đúng vô điều kiện — phép so ấy rỗng. So ĐỒNG NHẤT THỨC thì chỉ xanh khi export
    // dùng lại đúng object của lượt tải dữ liệu, và đỏ ngay khi ai đó dựng bộ tham số riêng
    // cho export — tức đúng cái đường mà file Excel trôi khỏi màn hình.
    expect(exportParams).toBe(queryParams[0])
  })

  it('bộ lọc là nút phễu mở dialog, không phải hàng Select bày sẵn', async () => {
    const user = userEvent.setup()
    renderChart()

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bộ lọc' }))

    expect(displayFormContent).toHaveBeenCalledTimes(1)
    expect(displayFormContent.mock.calls[0][0]).toMatchObject({ title: 'Bộ lọc' })
  })

  it('xếp hạng theo doanh thu giảm dần, không giữ thứ tự API trả về', () => {
    const row = (id: number, name: string, revenue: string): Row => ({
      project: { id, name, investor: { name: 'CĐT A' } },
      deal_count: 1,
      revenue_amount: revenue,
      fee_calculation_price: '0',
      goods_amount: '0',
      reconciliation_amount: '0',
      remaining_amount: '0',
    })
    responseData = {
      count: 3,
      page: 1,
      page_size: 10,
      results: [
        row(1, 'Dự án thấp', '1000000'),
        row(2, 'Dự án cao', '9000000'),
        row(3, 'Dự án giữa', '5000000'),
      ],
    }
    renderChart()

    expect(dataRows().map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual([
      'Dự án cao',
      'Dự án giữa',
      'Dự án thấp',
    ])
  })

  it('giữ bản đọc được cho trình đọc màn hình: đủ các cột của SRS 18.7 US2', () => {
    renderChart()

    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent)
    expect(headers).toEqual([
      'Dự án',
      'Chủ đầu tư',
      'Số giao dịch',
      'Doanh thu (VND)',
      'Giá tính phí (VND)',
      'Tiền hàng (VND)',
      'Đối chiếu (VND)',
      'Còn lại (VND)',
    ])
  })

  it('không đánh rơi tiền hàng / đối chiếu / còn lại — ba cột SRS mà bảng cũ chưa hiện', () => {
    responseData = { count: 1, page: 1, page_size: 10, results: makeRows(1) }
    renderChart()

    const cells = within(dataRows()[0])
      .getAllByRole('cell')
      .map((cell) => cell.textContent)
    expect(cells.slice(5)).toEqual(['3.000.000', '4.000.000', '5.000.000'])
  })

  it('"Còn lại" âm vẫn rút gọn thành tỷ, không in nguyên dãy số phá dải tổng', () => {
    // "Còn lại" = đối chiếu trừ hoa hồng sale nên âm là chuyện bình thường. Trước đây
    // `formatCompactVnd` so thẳng `value >= ONE_BILLION` ⇒ số âm rơi xuống nhánh cuối và
    // hiện `-50.408.665.889` ngay cạnh `139,7 tỷ` (đã thấy trên dev 2026-08-24).
    responseData = {
      count: 1,
      page: 1,
      page_size: 10,
      results: [{ ...makeRows(1)[0], remaining_amount: '-50408665889' }],
    }
    renderChart()

    // Dải tổng rút gọn…
    expect(screen.getByText('-50,41 tỷ')).toBeInTheDocument()
    // …còn số đầy đủ vẫn phải nguyên vẹn ở bảng a11y, không bị làm tròn theo.
    const cells = within(dataRows()[0])
      .getAllByRole('cell')
      .map((cell) => cell.textContent)
    expect(cells[7]).toBe('-50.408.665.889')
  })

  it('dự án chưa gắn chủ đầu tư vẫn ra hàng, không rơi khỏi biểu đồ', () => {
    responseData = {
      count: 1,
      page: 1,
      page_size: 10,
      results: [{ ...makeRows(1)[0], project: { id: 9, name: 'Dự án lẻ', investor: null } }],
    }
    renderChart()

    expect(within(dataRows()[0]).getAllByRole('cell')[1]).toHaveTextContent('—')
  })

  it('ít dự án thì KHÔNG dựng khung cuộn — khung cuộn xén cụt tooltip', () => {
    // Tooltip cao ~170px (6 chỉ số). Lọc còn 1 dự án thì vùng vẽ chỉ 72px, nên `overflow-y-auto`
    // thường trực sẽ xén tooltip còn hai dòng — người dùng mất hẳn phần số, mà không có gì trên
    // màn hình nói rằng đang bị che. Kèm theo, `scrollbar-gutter` giữ chỗ cạnh một khung tí hon
    // đọc thành "ô xem có thanh cuộn" dù không cuộn được gì.
    responseData = { count: 1, page: 1, page_size: 1, results: makeRows(1) }
    renderChart()

    expect(screen.getByTestId('txn-chart-scroller')).not.toHaveClass('overflow-y-auto')
    expect(screen.getByTestId('txn-chart-scroller')).not.toHaveClass('[scrollbar-gutter:stable]')
    expect(screen.getByTestId('txn-chart-axis')).not.toHaveClass('[scrollbar-gutter:stable]')
  })

  it('nhiều dự án thì mới dựng khung cuộn, và máng phải bật ở CẢ hai lớp', () => {
    // Thiếu máng ở lớp thước trục là thanh cuộn ăn mất mấy pixel chiều rộng của lớp dưới,
    // rồi thước lệch dần sang phải so với các thanh.
    responseData = { count: 25, page: 1, page_size: 25, results: makeRows(25) }
    renderChart()

    expect(screen.getByTestId('txn-chart-scroller')).toHaveClass('overflow-y-auto')
    expect(screen.getByTestId('txn-chart-scroller')).toHaveClass('[scrollbar-gutter:stable]')
    expect(screen.getByTestId('txn-chart-axis')).toHaveClass('[scrollbar-gutter:stable]')
    // `scrollbar-gutter` chỉ áp cho SCROLL CONTAINER — `<div>` không khai `overflow` thì
    // trình duyệt bỏ qua im lặng và máng ở lớp thước thành vô nghĩa. Xem cùng khẳng định ở
    // `PerformanceByOrgChart.test.tsx`, nơi độ lệch đã đo được thật.
    expect(screen.getByTestId('txn-chart-axis')).toHaveClass('overflow-y-hidden')
  })

  it('hiện trạng thái rỗng thay vì khung biểu đồ trống khi API không trả dòng nào', () => {
    responseData = { count: 0, page: 1, page_size: 10, results: [] }
    renderChart()

    expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument()
  })
})

/**
 * Trục X thứ hai (số giao dịch) vẽ thành ĐƯỜNG nối giữa các dự án — cùng quy ước với
 * `PerformanceByOrgChart`. Phần vẽ nằm trong `<svg>` mà jsdom không dựng `ResponsiveContainer`,
 * nên ở đây chỉ canh được hai lớp HTML bọc quanh nó: thước của trục đếm và chú giải màu.
 */
describe('TransactionsByProjectChart — trục giao dịch', () => {
  beforeEach(() => {
    queryParams.length = 0
    responseData = { count: 3, page: 1, page_size: 3, results: makeRows(3) }
  })

  it('dựng thước RIÊNG cho số giao dịch, không dùng chung thước tiền', () => {
    renderChart()

    expect(screen.getByTestId('txn-chart-deal-ruler')).toBeInTheDocument()
    expect(screen.getByTestId('txn-chart-revenue-ruler')).toBeInTheDocument()
  })

  it('thước giao dịch in số ĐẾM, không in theo kiểu tiền', () => {
    renderChart()

    // 3 dự án × 1 giao dịch ⇒ đỉnh trục đếm là 1. Thước tiền cùng lúc đó in "tr" cho hàng
    // triệu — hai thước dùng chung một cách định dạng thì khẳng định dưới gãy.
    expect(screen.getByTestId('txn-chart-deal-ruler').textContent).toBe('01')
    expect(screen.getByTestId('txn-chart-revenue-ruler').textContent).toContain('tr')
  })

  it('có chú giải nói rõ thanh là doanh thu, đường là số giao dịch', () => {
    renderChart()

    const axis = screen.getByTestId('txn-chart-axis')
    expect(within(axis).getByText('Doanh thu')).toBeInTheDocument()
    expect(within(axis).getByText('Số giao dịch')).toBeInTheDocument()
  })
})

/**
 * Tooltip render vào LỚP PHỦ, không nằm trong khung cuộn.
 *
 * Đây là khẳng định giữ lại bài học đắt nhất của khối này: để tooltip bên trong khung
 * `overflow-y-auto` thì hover hai dòng cuối là nó **cụt 36px** — đo được trên dev, và
 * `allowEscapeViewBox` KHÔNG cứu được vì nó chỉ thoát viewBox của `<svg>`.
 */
describe('TransactionsByProjectChart — lớp phủ tooltip', () => {
  beforeEach(() => {
    queryParams.length = 0
    responseData = { count: 25, page: 1, page_size: 25, results: makeRows(25) }
  })

  it('lớp phủ nằm NGOÀI khung cuộn, không phải con của nó', () => {
    renderChart()

    const layer = screen.getByTestId('txn-chart-tooltip-layer')
    const plot = screen.getByTestId('txn-chart-plot')
    const scroller = screen.getByTestId('txn-chart-scroller')

    // KHÔNG nằm trong khung cuộn — đó là toàn bộ điểm của lớp phủ này.
    expect(within(scroller).queryByTestId('txn-chart-tooltip-layer')).toBeNull()
    // Nhưng phải cùng một khung bọc `relative` với khung cuộn, không thì `coordinate` của
    // Recharts đo từ một gốc khác và tooltip lệch đúng bằng khoảng cách hai gốc.
    expect(within(plot).getByTestId('txn-chart-scroller')).toBe(scroller)
    expect(within(plot).getByTestId('txn-chart-tooltip-layer')).toBe(layer)
    expect(layer).toHaveClass('absolute')
    // Nuốt chuột là hover chết ngay — biểu đồ nằm ngay dưới lớp phủ này.
    expect(layer).toHaveClass('pointer-events-none')
  })
})
