import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const queryParams: Record<string, unknown>[] = []
let isLoading = false
const exportPerformance = vi.fn()

let responseData: {
  count: number
  page: number
  page_size: number
  results: {
    org_id: number
    org_name: string
    branch_name?: string
    block_name?: string
    deal_count: number
    revenue_amount: string
    period_label?: string
  }[]
}

vi.mock('@/features/sales/admin-dashboard/services/admin-dashboard-service', () => ({
  useAdminDashboardAllPerformance: (params: Record<string, unknown>) => {
    queryParams.push(params)
    return { data: responseData, isLoading }
  },
  getAdminDashboardService: () => ({ exportPerformance }),
}))

vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: () => true }) }))

const displayFormContent = vi.fn()
vi.mock('@/hooks/useDialog.ts', () => ({
  useDialog: () => ({ displayFormContent, displayClose: vi.fn() }),
}))

// Imported after the mocks above are registered.
import PerformanceByOrgChart from './PerformanceByOrgChart'

const makeRows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    org_id: i + 1,
    org_name: `Phòng ${i + 1}`,
    deal_count: 1,
    revenue_amount: '1000000',
    period_label: '2026-08',
  }))

const renderChart = () =>
  render(
    <MemoryRouter>
      <PerformanceByOrgChart />
    </MemoryRouter>
  )

/** Các hàng dữ liệu của bảng ẩn a11y (bỏ hàng tiêu đề). */
const dataRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

const headers = () =>
  within(screen.getByRole('table'))
    .getAllByRole('columnheader')
    .map((cell) => cell.textContent)

describe('PerformanceByOrgChart', () => {
  beforeEach(() => {
    queryParams.length = 0
    isLoading = false
    exportPerformance.mockClear()
    displayFormContent.mockClear()
    responseData = { count: 31, page: 1, page_size: 10, results: makeRows(10) }
  })

  /**
   * Vòng xoay chung nằm trong hộp cao cố định 280px, trong khi khối thật cao theo số dòng —
   * dữ liệu về là trang nhảy một cái. Và trong lúc chờ nó không nói được gì về thứ sắp hiện.
   */
  it('đang tải thì dựng khung xương của ĐÚNG biểu đồ này, không phải vòng xoay chung', () => {
    isLoading = true
    renderChart()

    expect(screen.getByTestId('ranked-bars-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('loading-spinner-box')).not.toBeInTheDocument()
  })

  it('vẽ MỌI dòng của bộ lọc trong MỘT request — dashboard không phân trang', () => {
    renderChart()

    // Xếp hạng cắt ở trang 1 là xếp hạng SAI: tổ chức đứng đầu có thể nằm ở trang 2, mà biểu
    // đồ vẫn nhìn như đầy đủ. `page_size: 0` do hook service gắn (canh ở tầng service).
    expect(dataRows()).toHaveLength(10)
    expect(queryParams).toHaveLength(1)
    expect(queryParams[0]).not.toHaveProperty('page')
  })

  it('không còn thanh phân trang trên khối này', () => {
    renderChart()

    expect(screen.queryByRole('button', { name: 'Trang sau' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Trang trước' })).not.toBeInTheDocument()
  })

  it('ít dòng thì KHÔNG dựng khung cuộn — khung cuộn xén cụt tooltip', () => {
    // Cùng lỗi đã gặp ở "Giao dịch theo dự án": tooltip cao hơn cả vùng vẽ khi ít dòng, nên
    // `overflow-y-auto` thường trực cắt mất phần số, và `scrollbar-gutter` giữ chỗ cạnh một
    // khung tí hon đọc thành "ô xem có thanh cuộn" dù không cuộn được gì.
    responseData = { count: 3, page: 1, page_size: 3, results: makeRows(3) }
    renderChart()

    expect(screen.getByTestId('perf-chart-scroller')).not.toHaveClass('overflow-y-auto')
    expect(screen.getByTestId('perf-chart-axis')).not.toHaveClass('[scrollbar-gutter:stable]')
  })

  it('nhiều dòng thì mới dựng khung cuộn, và máng phải bật ở CẢ hai lớp', () => {
    // Thiếu máng ở lớp thước trục là thanh cuộn ăn mất mấy pixel chiều rộng của lớp dưới,
    // rồi thước lệch dần sang phải so với các thanh.
    responseData = { count: 25, page: 1, page_size: 25, results: makeRows(25) }
    renderChart()

    expect(screen.getByTestId('perf-chart-scroller')).toHaveClass('overflow-y-auto')
    expect(screen.getByTestId('perf-chart-axis')).toHaveClass('[scrollbar-gutter:stable]')
    /**
     * `overflow-y-hidden` là ĐIỀU KIỆN để dòng trên có tác dụng, không phải trang trí:
     * `scrollbar-gutter` chỉ áp cho scroll container, `<div>` không khai `overflow` thì
     * trình duyệt bỏ qua IM LẶNG. Bỏ class này ra là thước lệch 0 · 2 · 4 · 6 · 8px so với
     * lưới dọc — đo được trên dev, và không có gì trên màn hình báo là nó sai.
     */
    expect(screen.getByTestId('perf-chart-axis')).toHaveClass('overflow-y-hidden')
  })

  it('Xuất Excel dùng ĐÚNG bộ lọc đang hiện trên màn hình', async () => {
    const user = userEvent.setup()
    renderChart()

    await user.click(screen.getByRole('button', { name: 'Tải xuống' }))

    expect(exportPerformance).toHaveBeenCalledTimes(1)
    const exportParams = exportPerformance.mock.calls[0][0]
    expect(exportParams).not.toHaveProperty('page')
    // `toBe` chứ không phải `toEqual`: hai bộ tham số rỗng vẫn "bằng nhau", nên phép so ấy
    // rỗng. So đồng nhất thức thì đỏ ngay khi ai đó dựng bộ tham số riêng cho export — đúng
    // cái đường mà file Excel trôi khỏi màn hình.
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
    responseData = {
      count: 3,
      page: 1,
      page_size: 10,
      results: [
        { org_id: 1, org_name: 'Phòng thấp', deal_count: 1, revenue_amount: '1000000' },
        { org_id: 2, org_name: 'Phòng cao', deal_count: 9, revenue_amount: '9000000' },
        { org_id: 3, org_name: 'Phòng giữa', deal_count: 5, revenue_amount: '5000000' },
      ],
    }
    renderChart()

    expect(dataRows().map((row) => within(row).getAllByRole('cell')[1].textContent)).toEqual([
      'Phòng cao',
      'Phòng giữa',
      'Phòng thấp',
    ])
  })

  it('một tổ chức xuất hiện ở nhiều kỳ vẫn ra đủ số hàng, không bị gộp làm một', () => {
    responseData = {
      count: 2,
      page: 1,
      page_size: 10,
      results: [
        {
          org_id: 7,
          org_name: 'Phòng KD 1',
          deal_count: 3,
          revenue_amount: '3000000',
          period_label: '2026-07',
        },
        {
          org_id: 7,
          org_name: 'Phòng KD 1',
          deal_count: 4,
          revenue_amount: '4000000',
          period_label: '2026-08',
        },
      ],
    }
    renderChart()

    const periods = dataRows().map((row) => within(row).getAllByRole('cell')[0].textContent)
    expect(periods).toEqual(['2026-08', '2026-07'])
  })

  it('không có cấp trên thì KHÔNG dựng cột cấp trên — trình đọc màn hình khỏi nghe ô rỗng', () => {
    // Xem theo chi nhánh thì không còn gì bên trên, và BE trả `branch_name`/`block_name` rỗng.
    renderChart()

    expect(headers()).toEqual(['Kỳ', 'Tổ chức', 'Số giao dịch', 'Doanh thu (VND)'])
  })

  /**
   * Màn mở lên là đã lọc kỳ hiện tại, nên `filterCount > 0` và trạng thái rỗng phải nói
   * "không khớp BỘ LỌC" chứ không phải "không có dữ liệu" — hai câu chỉ người dùng đi hai
   * hướng khác nhau, và ở đây hướng đúng là nới bộ lọc ra, không phải đi hỏi tại sao hệ
   * thống trống rỗng.
   */
  it('rỗng vì bộ lọc thì nói đúng là do bộ lọc, không nói trống như thể chưa có dữ liệu', () => {
    responseData = { count: 0, page: 1, page_size: 10, results: [] }
    renderChart()

    expect(screen.getByText('Không tìm thấy dữ liệu')).toBeInTheDocument()
    expect(screen.getByText('Không có kết quả phù hợp với bộ lọc đã chọn.')).toBeInTheDocument()
  })
})

describe('PerformanceByOrgChart — cấp trên của đơn vị', () => {
  beforeEach(() => {
    queryParams.length = 0
    displayFormContent.mockClear()
  })

  it('xem theo phòng ban thì bảng a11y có cả Chi nhánh lẫn Khối, đặt trước cột Tổ chức', () => {
    responseData = {
      count: 1,
      page: 1,
      page_size: 10,
      results: [
        {
          org_id: 1,
          org_name: 'Phòng Kinh Doanh 9',
          branch_name: 'Hà Nội',
          block_name: 'Khối Kinh doanh',
          deal_count: 3,
          revenue_amount: '1000000',
        },
      ],
    }
    renderChart()

    // Cấp trên đứng TRƯỚC đơn vị để đọc xuôi theo cây, giống thứ tự cột của file Excel.
    expect(headers()).toEqual([
      'Kỳ',
      'Chi nhánh',
      'Khối',
      'Tổ chức',
      'Số giao dịch',
      'Doanh thu (VND)',
    ])
    const cells = within(dataRows()[0])
      .getAllByRole('cell')
      .map((c) => c.textContent)
    expect(cells.slice(0, 4)).toEqual(['—', 'Hà Nội', 'Khối Kinh doanh', 'Phòng Kinh Doanh 9'])
  })

  it('xem theo khối thì chỉ dựng cột Chi nhánh — trên khối không có khối nào nữa', () => {
    responseData = {
      count: 1,
      page: 1,
      page_size: 10,
      results: [
        {
          org_id: 1,
          org_name: 'Khối Kinh doanh',
          branch_name: 'Hà Nội',
          block_name: '',
          deal_count: 3,
          revenue_amount: '1000000',
        },
      ],
    }
    renderChart()

    expect(headers()).toEqual(['Kỳ', 'Chi nhánh', 'Tổ chức', 'Số giao dịch', 'Doanh thu (VND)'])
  })

  /**
   * Đây là ca thúc đẩy cả tính năng: hai phòng TRÙNG TÊN ở hai chi nhánh. Không có cấp trên
   * thì hai dòng đọc y hệt nhau và người xem không có cách nào biết dòng nào là của mình.
   */
  it('hai phòng trùng tên ở hai chi nhánh phân biệt được bằng cấp trên', () => {
    responseData = {
      count: 2,
      page: 1,
      page_size: 10,
      results: [
        {
          org_id: 1,
          org_name: 'Phòng Kinh Doanh 9',
          branch_name: 'Hà Nội',
          block_name: 'Khối Kinh doanh',
          deal_count: 3,
          revenue_amount: '2000000',
        },
        {
          org_id: 2,
          org_name: 'Phòng Kinh Doanh 9',
          branch_name: 'Hải Phòng',
          block_name: 'Khối Kinh doanh',
          deal_count: 1,
          revenue_amount: '1000000',
        },
      ],
    }
    renderChart()

    const branchColumn = dataRows().map((row) => within(row).getAllByRole('cell')[1].textContent)
    expect(branchColumn).toEqual(['Hà Nội', 'Hải Phòng'])
  })
})

/**
 * Trục X thứ hai (số giao dịch) vẽ thành ĐƯỜNG nối giữa các phòng ban.
 *
 * Bản thân đường nằm trong `<svg>` mà jsdom không dựng `ResponsiveContainer`, nên không test
 * được ở đây. Thứ test được — và cũng là thứ dễ hỏng im lặng nhất — là hai lớp HTML bọc quanh
 * nó: thước của trục đếm và chú giải màu. Thiếu một trong hai thì trên màn hình có một đường
 * xanh không ai biết nó đo cái gì.
 */
describe('PerformanceByOrgChart — trục giao dịch', () => {
  beforeEach(() => {
    queryParams.length = 0
    isLoading = false
    responseData = { count: 3, page: 1, page_size: 3, results: makeRows(3) }
  })

  it('dựng thước RIÊNG cho số giao dịch, không dùng chung thước tiền', () => {
    renderChart()

    expect(screen.getByTestId('perf-chart-deal-ruler')).toBeInTheDocument()
    expect(screen.getByTestId('perf-chart-revenue-ruler')).toBeInTheDocument()
  })

  it('thước giao dịch in số ĐẾM, không in theo kiểu tiền', () => {
    // 3 dòng × 1 giao dịch: đỉnh trục đếm là 1. Thước tiền cùng lúc đó in "1 tr" cho 1.000.000
    // — nếu hai thước dùng chung một cách định dạng thì khẳng định dưới gãy.
    renderChart()

    const dealRuler = screen.getByTestId('perf-chart-deal-ruler')
    expect(dealRuler.textContent).toBe('01')
    expect(screen.getByTestId('perf-chart-revenue-ruler').textContent).toContain('tr')
  })

  it('thước giao dịch KHÔNG in vạch lẻ khi cả bộ lọc chỉ có vài giao dịch', () => {
    // Ca thật đã suýt xảy ra: max = 1 giao dịch, nếu dùng thang của trục tiền thì thước ra
    // `0 · 0,25 · 0,5 · 0,75 · 1` — một phần tư giao dịch.
    responseData = {
      count: 1,
      page: 1,
      page_size: 1,
      results: [{ org_id: 1, org_name: 'Phòng 1', deal_count: 1, revenue_amount: '1000000' }],
    }
    renderChart()

    expect(screen.getByTestId('perf-chart-deal-ruler').textContent).not.toContain(',')
  })

  it('có chú giải nói rõ thanh là doanh thu, đường là số giao dịch', () => {
    renderChart()

    // Chú giải dựng bằng HTML ngoài vùng cuộn, KHÔNG dùng `<Legend>` của Recharts: `<Legend>`
    // nằm trong `<svg>` bị cuộn dọc nên sẽ trôi mất đúng lúc cần đọc nhất.
    const axis = screen.getByTestId('perf-chart-axis')
    expect(within(axis).getByText('Doanh thu')).toBeInTheDocument()
    expect(within(axis).getByText('Số giao dịch')).toBeInTheDocument()
  })

  /**
   * Tooltip render vào LỚP PHỦ, không nằm trong khung cuộn — xem cùng khẳng định ở
   * `TransactionsByProjectChart.test.tsx`, nơi độ cụt 36px đã đo được thật. Khối này từng
   * "không sao" chỉ vì tooltip của nó thấp hơn 32px, tức là may chứ không phải dựng đúng.
   */
  it('tooltip render vào lớp phủ NGOÀI khung cuộn', () => {
    responseData = { count: 25, page: 1, page_size: 25, results: makeRows(25) }
    renderChart()

    const layer = screen.getByTestId('perf-chart-tooltip-layer')
    const plot = screen.getByTestId('perf-chart-plot')
    const scroller = screen.getByTestId('perf-chart-scroller')

    // KHÔNG nằm trong khung cuộn — đó là toàn bộ điểm của lớp phủ này.
    expect(within(scroller).queryByTestId('perf-chart-tooltip-layer')).toBeNull()
    // Nhưng phải cùng một khung bọc `relative` với khung cuộn, không thì `coordinate` của
    // Recharts đo từ một gốc khác và tooltip lệch đúng bằng khoảng cách hai gốc.
    expect(within(plot).getByTestId('perf-chart-scroller')).toBe(scroller)
    expect(within(plot).getByTestId('perf-chart-tooltip-layer')).toBe(layer)
    expect(layer).toHaveClass('absolute')
    expect(layer).toHaveClass('pointer-events-none')
  })
})
