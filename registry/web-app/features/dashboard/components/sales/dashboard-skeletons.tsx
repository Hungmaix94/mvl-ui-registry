import { SkeletonBar, SkeletonBox } from '@/components/commons/Skeleton'
import { RANKED_BAR_LAYOUT } from './dashboard-chart-parts'

/**
 * Khung xương cho các khối của dashboard Sales.
 *
 * Nguyên tắc chung của cả file: **khung xương phải chiếm đúng chỗ mà nội dung thật sẽ chiếm.**
 * Một vòng xoay căn giữa trong hộp cao cố định thì lúc dữ liệu về, cả trang nhảy một cái —
 * và trong lúc chờ nó không nói được gì về thứ sắp hiện ra. Khung xương dựng theo đúng bố cục
 * thật thì mắt đã kịp học chỗ nào là gì trước khi số đổ vào.
 *
 * Mỗi khung xương gắn `aria-busy` + `aria-hidden` ở gốc: trình đọc màn hình nghe một "bảng
 * rỗng" hay một dãy thanh xám là hiểu sai thành "không có dữ liệu".
 */

/** Chiều rộng thanh giảm dần — biểu đồ này là XẾP HẠNG, khung xương phải nói ra điều đó. */
const RANKED_BAR_WIDTHS = ['92%', '74%', '61%', '48%', '36%', '27%', '19%', '12%']

/** Dải tổng 3 ô ở đầu khối biểu đồ xếp hạng. */
function SummaryStripSkeleton({ stats = 3 }: { stats?: number }) {
  return (
    <div className="bg-background-2 border-border-1 grid grid-cols-2 gap-4 rounded-lg border px-4 py-3 sm:grid-cols-3">
      {Array.from({ length: stats }).map((_, i) => (
        <div key={i} data-testid="ranked-skeleton-stat" className="flex flex-col gap-2">
          <SkeletonBar className="h-2.5 w-20" />
          <SkeletonBar className="h-5 w-28" />
          <SkeletonBar className="h-2 w-24" />
        </div>
      ))}
    </div>
  )
}

/**
 * Khung xương của biểu đồ thanh ngang xếp hạng (`PerformanceByOrgChart`,
 * `TransactionsByProjectChart`).
 *
 * Dùng chính `RANKED_BAR_LAYOUT` mà biểu đồ thật dùng, nên chiều cao khớp từng dòng một —
 * chép số ra đây là hai nửa lệch nhau ngay lần đầu ai đó chỉnh `ROW_HEIGHT`.
 */
export function RankedBarsSkeleton({ rows = 6, stats = 3 }: { rows?: number; stats?: number }) {
  const visibleRows = Math.min(rows, RANKED_BAR_WIDTHS.length)

  return (
    <div
      data-testid="ranked-bars-skeleton"
      aria-busy="true"
      aria-hidden
      className="flex flex-col gap-5"
    >
      <SummaryStripSkeleton stats={stats} />

      <div className="flex flex-col gap-1">
        {/* Thước trục: 5 mốc rải đều, đúng chỗ thước thật sẽ nằm. */}
        <div
          className="flex justify-between"
          style={{
            paddingLeft: RANKED_BAR_LAYOUT.AXIS_ZERO_GUTTER,
            paddingRight: RANKED_BAR_LAYOUT.VALUE_LABEL_GUTTER,
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBar key={i} className="h-2 w-8" />
          ))}
        </div>

        <div style={{ paddingTop: RANKED_BAR_LAYOUT.TOP_MARGIN }}>
          {Array.from({ length: visibleRows }).map((_, i) => (
            <div
              key={i}
              data-testid="ranked-skeleton-row"
              className="flex flex-col justify-end"
              style={{ height: RANKED_BAR_LAYOUT.ROW_HEIGHT }}
            >
              {/* Tên đơn vị nằm NGAY TRÊN thanh của nó, giống biểu đồ thật. */}
              <div
                className="mb-1.5 flex flex-col gap-1"
                style={{ paddingLeft: RANKED_BAR_LAYOUT.AXIS_ZERO_GUTTER }}
              >
                <SkeletonBar className="h-3" style={{ width: `${34 - i * 2}%` }} />
                <SkeletonBar className="h-2" style={{ width: `${24 - i * 2}%` }} />
              </div>
              <div
                className="flex items-center gap-3"
                style={{ paddingLeft: RANKED_BAR_LAYOUT.AXIS_ZERO_GUTTER }}
              >
                <SkeletonBox
                  data-testid="ranked-skeleton-bar"
                  className="rounded-r"
                  style={{
                    width: RANKED_BAR_WIDTHS[i],
                    height: RANKED_BAR_LAYOUT.BAR_SIZE,
                    maxWidth: `calc(100% - ${RANKED_BAR_LAYOUT.VALUE_LABEL_GUTTER}px)`,
                  }}
                />
                <SkeletonBar className="h-3 w-14 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Khung xương của biểu đồ đường/cột theo thời gian (`RevenueTrendChart`).
 *
 * Khác hẳn khung xương xếp hạng, và **cố ý** khác: hai khối này đọc theo hai cách khác nhau,
 * nên lúc chờ chúng cũng phải nhìn khác nhau. Dùng chung một khung xương là dạy sai bố cục
 * rồi bắt mắt học lại khi dữ liệu về.
 */
export function TrendChartSkeleton({ bars = 8, height = 300 }: { bars?: number; height?: number }) {
  /**
   * Cao thấp không đều nhưng **cố định theo chỉ số** — không random. Khung xương random sẽ
   * đổi hình mỗi lần React render lại, thành ra nhảy múa ngay trong lúc đang chờ.
   */
  const heights = [46, 72, 58, 88, 64, 96, 52, 78, 66, 84, 57, 92]

  return (
    <div
      data-testid="trend-chart-skeleton"
      aria-busy="true"
      aria-hidden
      className="flex flex-col gap-3"
    >
      <div className="flex items-end gap-3" style={{ height }}>
        {/* Nhãn trục dọc bên trái. */}
        <div className="flex h-full flex-col justify-between py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBar key={i} className="h-2 w-8" />
          ))}
        </div>
        <div className="flex h-full flex-1 items-end justify-between gap-2">
          {Array.from({ length: bars }).map((_, i) => (
            <SkeletonBox
              key={i}
              data-testid="trend-skeleton-bar"
              className="w-full max-w-10 rounded-t"
              style={{ height: `${heights[i % heights.length]}%` }}
            />
          ))}
        </div>
      </div>
      {/* Nhãn trục ngang + chú giải. */}
      <div className="flex justify-between pl-11">
        {Array.from({ length: bars }).map((_, i) => (
          <SkeletonBar key={i} className="h-2 w-10" />
        ))}
      </div>
      <div className="flex justify-center gap-6 pt-1">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <SkeletonBox className="size-3 rounded-sm" />
            <SkeletonBar className="h-2 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Khung xương cho thẻ số liệu (`SalesConfirmedReconciliationCard`).
 *
 * Giữ nguyên `min-h-[140px]`, nền `bg-background-3` và lưới 1/2/3 cột của thẻ thật, nên lúc
 * dữ liệu về không có một pixel nào xê dịch. Đây là chỗ vòng xoay cũ sai nhiều nhất: nó dựng
 * một hộp cao 140px **cho cả lưới**, trong khi lưới thật cao gấp mấy lần ⇒ trang giật mạnh.
 */
export function StatCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      data-testid="stat-cards-skeleton"
      aria-busy="true"
      aria-hidden
      className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          data-testid="stat-skeleton-card"
          className="bg-background-3 flex min-h-[140px] gap-[10px] rounded p-5"
        >
          <div className="flex flex-1 flex-col justify-between gap-4">
            <SkeletonBar className="h-3 w-32" />
            <div className="flex items-end gap-2">
              <SkeletonBar className="h-7 w-24" />
              <SkeletonBar className="h-3 w-12" />
            </div>
          </div>
          <SkeletonBox className="size-8 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  )
}

/**
 * Khung xương cho lưới tile realtime (`SalesAdminSummaryTiles`).
 *
 * Một hàng `flex-wrap` đúng như lưới thật, nên số dòng khung xương tự khớp với số dòng tile ở mọi
 * bề rộng màn — không phải đoán trước, và lúc dữ liệu về không đẩy trang trôi.
 *
 * Mỗi ô lặp đúng hình của `RealtimeButton`: vòng tròn 50px + hai dòng nhãn 12px.
 */
export function RealtimeTilesSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div
      data-testid="realtime-tiles-skeleton"
      aria-busy="true"
      aria-hidden
      className="flex flex-wrap gap-6"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          data-testid="realtime-skeleton-tile"
          className="flex w-[120px] flex-col items-center gap-1"
        >
          <SkeletonBox className="size-[50px] rounded-full" />
          <SkeletonBar className="mt-1 h-2.5 w-20" />
          <SkeletonBar className="h-2.5 w-14" />
        </div>
      ))}
    </div>
  )
}
