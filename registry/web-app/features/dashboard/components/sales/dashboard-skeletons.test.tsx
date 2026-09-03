import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RANKED_BAR_LAYOUT } from './dashboard-chart-parts'
import {
  RankedBarsSkeleton,
  RealtimeTilesSkeleton,
  StatCardsSkeleton,
  TrendChartSkeleton,
} from './dashboard-skeletons'

/**
 * Khung xương là thứ trình đọc màn hình KHÔNG được đọc: một dãy thanh xám đọc ra thành
 * "bảng rỗng" và người dùng hiểu là không có dữ liệu, trong khi thật ra đang tải.
 */
const expectHiddenFromScreenReaders = (testId: string) => {
  const root = screen.getByTestId(testId)
  expect(root).toHaveAttribute('aria-hidden', 'true')
  expect(root).toHaveAttribute('aria-busy', 'true')
}

const styleOf = (testId: string, prop: 'height' | 'width') =>
  screen.getAllByTestId(testId).map((el) => el.style[prop])

describe('RankedBarsSkeleton', () => {
  it('ẩn khỏi trình đọc màn hình và báo đang bận', () => {
    render(<RankedBarsSkeleton />)
    expectHiddenFromScreenReaders('ranked-bars-skeleton')
  })

  /**
   * Chiều cao mỗi dòng đọc từ chính `RANKED_BAR_LAYOUT` mà biểu đồ thật dùng. Chép số ra đây
   * thì lần đầu ai đó chỉnh `ROW_HEIGHT`, khung xương và biểu đồ lệch nhau — và cái lệch đó
   * chỉ lộ ra dưới dạng "trang giật một cái khi dữ liệu về", không test nào bắt.
   */
  it('mỗi dòng cao đúng bằng dòng của biểu đồ thật', () => {
    render(<RankedBarsSkeleton rows={3} />)

    expect(styleOf('ranked-skeleton-row', 'height')).toEqual(
      Array(3).fill(`${RANKED_BAR_LAYOUT.ROW_HEIGHT}px`)
    )
  })

  it('thanh ngắn dần — khung xương phải nói ra đây là biểu đồ XẾP HẠNG', () => {
    render(<RankedBarsSkeleton rows={4} />)

    const widths = styleOf('ranked-skeleton-bar', 'width').map(parseFloat)
    expect(widths).toHaveLength(4)
    expect(widths).toEqual([...widths].sort((a, b) => b - a))
  })

  it('số ô ở dải tổng theo tham số — hai biểu đồ xếp hạng có 3 và 4 ô khác nhau', () => {
    render(<RankedBarsSkeleton stats={4} />)

    expect(screen.getAllByTestId('ranked-skeleton-stat')).toHaveLength(4)
  })
})

describe('StatCardsSkeleton', () => {
  it('dựng đủ số thẻ được yêu cầu, không phải một hộp trống', () => {
    render(<StatCardsSkeleton count={10} />)

    expectHiddenFromScreenReaders('stat-cards-skeleton')
    expect(screen.getAllByTestId('stat-skeleton-card')).toHaveLength(10)
  })

  /** Cùng `min-h-[140px]` với thẻ thật ⇒ dữ liệu về không xê dịch một pixel nào. */
  it('mỗi thẻ giữ đúng chiều cao tối thiểu của thẻ thật', () => {
    render(<StatCardsSkeleton count={1} />)

    expect(screen.getByTestId('stat-skeleton-card')).toHaveClass('min-h-[140px]')
  })
})

describe('TrendChartSkeleton', () => {
  it('ẩn khỏi trình đọc màn hình', () => {
    render(<TrendChartSkeleton />)
    expectHiddenFromScreenReaders('trend-chart-skeleton')
  })

  /**
   * Cột cao thấp cố định theo chỉ số, KHÔNG random: khung xương random đổi hình mỗi lần
   * React render lại, thành ra nhảy múa ngay trong lúc đang chờ.
   */
  it('chiều cao cột không đổi giữa hai lần render, nhưng vẫn nhấp nhô', () => {
    const { unmount } = render(<TrendChartSkeleton bars={6} />)
    const first = styleOf('trend-skeleton-bar', 'height')
    unmount()

    render(<TrendChartSkeleton bars={6} />)

    expect(styleOf('trend-skeleton-bar', 'height')).toEqual(first)
    expect(new Set(first).size).toBeGreaterThan(1)
  })
})

describe('RealtimeTilesSkeleton', () => {
  it('dựng đủ số tile và ẩn khỏi trình đọc màn hình', () => {
    render(<RealtimeTilesSkeleton count={10} />)

    expectHiddenFromScreenReaders('realtime-tiles-skeleton')
    expect(screen.getAllByTestId('realtime-skeleton-tile')).toHaveLength(10)
  })

  /**
   * Lưới thật là MỘT hàng `flex-wrap`. Khung xương phải wrap y hệt, nếu không thì số dòng hai
   * bên lệch nhau và lúc dữ liệu về trang nhảy một cái.
   */
  it('wrap giống lưới thật thay vì tràn ra một dòng cứng', () => {
    render(<RealtimeTilesSkeleton count={10} />)

    expect(screen.getByTestId('realtime-tiles-skeleton')).toHaveClass('flex-wrap')
  })
})

describe('hiệu ứng quét', () => {
  /**
   * `animate-pulse` làm mọi thanh cùng mờ đi rồi cùng sáng lại, đọc ra như giao diện đang
   * lỗi. Dải quét chạy một hướng thì đọc ra "còn đang chạy". Nhánh `prefers-reduced-motion`
   * nằm ở CSS nên không kiểm được ở đây; test này chỉ canh đúng lớp được gắn.
   */
  it('mảnh khung xương mang lớp quét, không còn lớp nhấp nháy', () => {
    render(<RankedBarsSkeleton rows={2} />)

    screen.getAllByTestId('ranked-skeleton-bar').forEach((piece) => {
      expect(piece).toHaveClass('skeleton-shimmer')
      expect(piece).not.toHaveClass('animate-pulse')
    })
  })
})
