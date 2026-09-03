import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import {
  ChartTooltip,
  OrgNameLabel,
  orgBreadcrumb,
  type ChartRow,
} from './performance-by-org-chart-parts'

const makeRow = (overrides: Partial<ChartRow> = {}): ChartRow => ({
  key: 'k1',
  orgName: 'Phòng Kinh Doanh 9',
  isUnattributed: false,
  periodLabel: '',
  branchName: 'Hà Nội',
  blockName: 'Khối Kinh doanh',
  revenue: 2_000_000,
  dealCount: 3,
  ...overrides,
})

describe('orgBreadcrumb', () => {
  it('xem theo phòng ban thì đủ cả hai cấp, cấp TRÊN đứng trước', () => {
    expect(orgBreadcrumb(makeRow())).toBe('Hà Nội › Khối Kinh doanh')
  })

  it('xem theo khối thì chỉ còn chi nhánh', () => {
    expect(orgBreadcrumb(makeRow({ blockName: '' }))).toBe('Hà Nội')
  })

  it('xem theo chi nhánh thì rỗng — và KHÔNG để lại dấu phân cách lửng', () => {
    // Nối thẳng bằng `join` mà không lọc rỗng sẽ ra " › " hoặc "Hà Nội › " treo lơ lửng.
    expect(orgBreadcrumb(makeRow({ branchName: '', blockName: '' }))).toBe('')
    expect(orgBreadcrumb(makeRow({ branchName: 'Hà Nội', blockName: '' }))).toBe('Hà Nội')
  })
})

describe('ChartTooltip — nói rõ đơn vị này thuộc đâu', () => {
  it('gọi TÊN CẤP hẳn hoi, không bắt suy ra từ thứ tự', () => {
    render(<ChartTooltip active payload={[{ payload: makeRow() }]} />)

    expect(within(screen.getByTestId('org-parent-branch')).getByText('Hà Nội')).toBeInTheDocument()
    expect(
      within(screen.getByTestId('org-parent-block')).getByText('Khối Kinh doanh')
    ).toBeInTheDocument()
  })

  it('không có cấp trên thì bỏ hẳn cụm đó, không hiện nhãn với ô trống', () => {
    render(
      <ChartTooltip active payload={[{ payload: makeRow({ branchName: '', blockName: '' }) }]} />
    )

    expect(screen.queryByText('Chi nhánh')).not.toBeInTheDocument()
    expect(screen.queryByText('Khối')).not.toBeInTheDocument()
    // Số liệu thì vẫn phải còn.
    expect(screen.getByText('Doanh thu:')).toBeInTheDocument()
  })

  it('xem theo khối thì chỉ hiện Chi nhánh', () => {
    render(<ChartTooltip active payload={[{ payload: makeRow({ blockName: '' }) }]} />)

    expect(screen.getByText('Chi nhánh')).toBeInTheDocument()
    expect(screen.queryByText('Khối')).not.toBeInTheDocument()
  })

  /**
   * Tooltip là chỗ người ta mở ra để đọc cho rõ. Cắt tên ở đây thì tên đầy đủ không còn xem
   * được ở đâu nữa — nhãn trên biểu đồ vốn đã cắt vì hẹp.
   */
  it('KHÔNG cắt tên cấp trên dù dài', () => {
    const longName = 'Chi nhánh Thành phố Hồ Chí Minh — Khu vực phía Nam mở rộng'
    render(<ChartTooltip active payload={[{ payload: makeRow({ branchName: longName }) }]} />)

    expect(screen.getByText(longName)).toBeInTheDocument()
  })
})

/** `OrgNameLabel` trả về `<g>` nên phải bọc trong `<svg>`, không thì DOM bỏ qua. */
const renderLabel = (row: ChartRow, showPeriod = false) =>
  render(
    <svg>
      <OrgNameLabel x={0} y={40} index={0} rows={[row]} showPeriod={showPeriod} />
    </svg>
  )

describe('OrgNameLabel — dòng phụ dưới tên', () => {
  it('in số giao dịch TRƯỚC rồi mới tới đường dẫn tổ chức', () => {
    renderLabel(makeRow())

    // Số đứng trước để nó bắt đầu ở cùng một hoành độ trên mọi dòng — đặt sau một chuỗi dài
    // ngắn khác nhau thì mỗi dòng một chỗ, hết so sánh theo cột được.
    expect(screen.getByTestId('org-label-sub').textContent).toBe(
      '3 giao dịch   ·   Hà Nội › Khối Kinh doanh'
    )
  })

  it('không có cấp trên thì dòng phụ chỉ còn số, không có dấu chấm giữa treo lơ lửng', () => {
    renderLabel(makeRow({ branchName: '', blockName: '' }))

    expect(screen.getByTestId('org-label-sub').textContent).toBe('3 giao dịch')
  })

  /**
   * Từ khi có trục X thứ hai, ĐƯỜNG số giao dịch chạy chéo qua vùng vẽ và cắt ngang chính hai
   * dòng nhãn này — đã thấy trên dữ liệu dev: đoạn 7 giao dịch tụt xuống 1 chém qua tên phòng
   * và cả tên phòng lẫn đường đều mất nét. Viền nền là thứ duy nhất cứu được, vì `<svg>` không
   * có z-index theo lớp nội dung và đổi thứ tự vẽ thì đường lại chui xuống dưới thanh.
   */
  it('chữ có viền nền để đọc được khi đường giao dịch chạy ngay dưới', () => {
    renderLabel(makeRow())

    for (const testId of ['org-label-title', 'org-label-sub']) {
      const text = screen.getByTestId(testId)
      // `paint-order: stroke` vẽ viền TRƯỚC rồi mới tô ruột — thiếu nó thì viền đè lên nét
      // chữ và chữ béo ra thay vì được tách khỏi nền.
      expect(text.getAttribute('paint-order')).toBe('stroke')
      expect(text.getAttribute('stroke')).toBe('#ffffff')
    }
  })

  it('đường dẫn quá dài thì cắt bằng dấu ba chấm — `<text>` của SVG không tự xuống dòng', () => {
    renderLabel(
      makeRow({
        branchName: 'Chi nhánh Thành phố Hồ Chí Minh mở rộng',
        blockName: 'Khối Kinh doanh số 12',
      })
    )

    const sub = screen.getByTestId('org-label-sub').textContent ?? ''
    expect(sub).toContain('…')
    expect(sub).toContain('3 giao dịch')
  })
})
