import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import { ONE_BILLION, REVENUE_TREND_COLORS } from './sales-admin-dashboard-constants'

/**
 * Phần dùng chung của HAI biểu đồ thanh ngang xếp hạng trên dashboard Sales
 * (`PerformanceByOrgChart`, `TransactionsByProjectChart`): helper thuần về thang đo/định dạng
 * + các mảnh không phụ thuộc vào việc một hàng là "tổ chức" hay "dự án".
 *
 * Hai biểu đồ nằm CÙNG một màn hình nên phải đọc được bằng một quy ước duy nhất — cách chia
 * trục và cách rút gọn tiền lệch nhau một chút là người xem phải học lại cách đọc ở nửa dưới
 * trang. Giữ chúng ở một chỗ để không thể lệch.
 *
 * Phần RIÊNG của từng biểu đồ (nhãn tên hàng, tooltip) nằm ở `*-chart-parts.tsx` tương ứng.
 */

const ONE_MILLION = 1_000_000

/** Số khoảng chia mong muốn trên trục. 4 khoảng = 5 vạch, đủ đọc mà không rối. */
const AXIS_TICK_COUNT = 4

/**
 * Bố cục của MỘT dải trong biểu đồ thanh xếp hạng — dùng chung cho cả hai khối.
 *
 * Để ở một chỗ vì đây là thứ quyết định hai khối có ĐỌC GIỐNG NHAU hay không. Chép đôi
 * sang từng file thì chỉ cần ai đó chỉnh `ROW_HEIGHT` một bên là nửa trên và nửa dưới của
 * dashboard lệch nhịp, mà không có test nào bắt được.
 */
export const RANKED_BAR_LAYOUT = {
  /** Hai dòng nhãn (tên + dòng phụ) nằm trên, rồi đến thanh. */
  ROW_HEIGHT: 58,
  /** Số dòng hiện trọn trước khi phải cuộn — xem ghi chú ở chỗ dựng khung cuộn. */
  VISIBLE_ROWS: 8,
  /** Chừa phải cho nhãn tiền in sau đầu thanh; thiếu chỗ là chữ bị cắt ở mép khung. */
  VALUE_LABEL_GUTTER: 88,
  /**
   * Chừa trái vừa đủ cho nhãn `0` của thước trục. Máng trục Y rộng 0 nên vùng vẽ bắt đầu
   * ngay mép SVG; không chừa thì nhãn `0` canh giữa mốc 0 bị cắt mất một nửa.
   */
  AXIS_ZERO_GUTTER: 12,
  /** Thanh mảnh: đủ đọc độ dài, không át hai dòng nhãn bên trên. */
  BAR_SIZE: 12,
  /**
   * Chừa trên cho DÒNG TÊN của hàng đầu tiên. Nhãn tên vẽ ở `y - 22` so với tâm thanh, mà
   * tâm thanh hàng đầu chỉ cách mép vùng vẽ `ROW_HEIGHT / 2` — để `0` thì dòng tên rơi ra
   * ngoài `<svg>` và bị cắt ngang (đã thấy ở dữ liệu thật).
   */
  TOP_MARGIN: 14,
} as const

/**
 * Mực dùng cho phần vẽ trong `<svg>`. SVG không nhận class Tailwind nên buộc phải là hex;
 * các giá trị này bám theo `--color-content-dark-1/-3` và `--color-border-1`.
 */
export const INK = {
  strong: '#262626',
  muted: '#8c8c8c',
  grid: '#f1f1f1',
  baseline: '#d8d8d8',
  /**
   * Nền thẻ, dùng làm VIỀN cho chữ vẽ trong `<svg>` (xem `OrgNameLabel`). Từ khi có đường số
   * giao dịch chạy chéo qua vùng vẽ, chữ nằm trên đường đọc không ra — `<svg>` không có
   * `z-index` theo lớp nội dung nên cách duy nhất là viền chữ bằng chính màu nền.
   */
  paper: '#ffffff',
} as const

/**
 * Viền nền quanh chữ vẽ trong `<svg>`, để chữ đọc được khi có nét khác chạy ngay dưới nó
 * (ở đây: ĐƯỜNG số giao dịch của `PerformanceByOrgChart`).
 *
 * `paintOrder="stroke"` vẽ viền TRƯỚC rồi mới tô ruột chữ, nên viền nằm sau nét chứ không
 * làm chữ béo ra. Không có nó thì đoạn đường dốc (7 giao dịch tụt xuống 1) chém ngang hai
 * dòng nhãn và cả tên phòng lẫn đường đều mất nét — đã thấy trên dữ liệu dev thật.
 *
 * Không xử được bằng thứ tự vẽ: `<svg>` không có z-index theo lớp nội dung, mà khai `<Line>`
 * trước `<Bar>` thì đường chui xuống DƯỚI thanh — mất tín hiệu ở đúng những dòng doanh thu
 * cao. Biểu đồ không có đường (`TransactionsByProjectChart`) dùng chung cũng vô hại: viền
 * trùng màu nền thẻ.
 */
export const TEXT_HALO = {
  stroke: INK.paper,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  paintOrder: 'stroke',
} as const

/**
 * Id của HAI trục X trên các biểu đồ xếp hạng: thanh đo bằng trục tiền, đường đo bằng trục
 * đếm. Cả hai biểu đồ dashboard dùng chung để không thể lệch tên.
 *
 * Có từ hai trục trở lên thì MỌI mảnh Recharts phải khai `xAxisId` — kể cả `CartesianGrid` và
 * `ReferenceLine`. Quên một mảnh là Recharts lặng lẽ dựng trục `0` ẩn với domain tự đoán, và
 * thứ vẽ ra vẫn "trông hợp lý": sai mà không có lỗi nào bật lên.
 */
export const REVENUE_X_AXIS = 'revenue'
export const DEAL_X_AXIS = 'deals'

/**
 * Bộ prop Recharts truyền vào `LabelList.content`.
 *
 * Khai tường minh thay vì `object`: với `object` thì TypeScript không kiểm được `x`/`y`/`index`
 * có thật sự tới hay không, mà mọi guard trong nhãn đều `return null` — Recharts đổi tên prop
 * là nhãn biến mất IM LẶNG, không lỗi, và không test nào bắt được (jsdom không dựng
 * `ResponsiveContainer` nên phần vẽ không hề chạy trong test).
 */
export type RechartsLabelContentProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  index?: number
}

/**
 * Tiền rút gọn cho chỗ hẹp: `2,71 tỷ` / `339 tr`. Số đầy đủ vẫn còn trong tooltip, trong
 * bảng ẩn a11y và trong file Excel, nên rút gọn ở đây không làm mất dữ liệu của ai.
 */
export function formatCompactVnd(value: number): string {
  if (!value) return '0'

  /**
   * So sánh trên TRỊ TUYỆT ĐỐI. So thẳng `value >= ONE_BILLION` thì mọi số âm rơi hết xuống
   * nhánh cuối và in ra nguyên dạng — dải tổng của "Giao dịch theo dự án" đã hiện
   * `-50.408.665.889` giữa hàng `139,7 tỷ` / `167,94 tỷ`, phá cả cột. "Còn lại" = đối chiếu
   * trừ hoa hồng sale nên âm là chuyện bình thường, không phải dữ liệu hỏng.
   */
  const sign = value < 0 ? '-' : ''
  const magnitude = Math.abs(value)

  if (magnitude >= ONE_BILLION) {
    return `${sign}${formatNumber(magnitude / ONE_BILLION, { maximumFractionDigits: 2 })} tỷ`
  }
  if (magnitude >= ONE_MILLION) {
    return `${sign}${formatNumber(magnitude / ONE_MILLION, { maximumFractionDigits: 0 })} tr`
  }
  return formatNumber(value)
}

/**
 * Trục chia theo mốc "đẹp" (1 / 2 / 2,5 / 5 × 10^n) thay vì để Recharts tự chia.
 *
 * Hai lý do, không phải thẩm mỹ: mốc lẻ kiểu `0 · 677 tr · 1,35 tỷ` thì mắt không nội suy
 * được vị trí một cái chấm nằm giữa hai vạch; và đỉnh trục luôn LỚN HƠN giá trị lớn nhất nên
 * chấm to nhất không bao giờ dính vào mốc cuối.
 */
export function buildNiceAxis(maxValue: number): { max: number; ticks: number[] } {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return { max: 1, ticks: [0, 1] }

  const rawStep = maxValue / AXIS_TICK_COUNT
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const niceMultiplier =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  const step = niceMultiplier * magnitude

  /**
   * `step` phải dương và hữu hạn TRƯỚC khi vào vòng lặp cộng dồn bên dưới. `magnitude` là
   * `10 ** Math.floor(Math.log10(rawStep))`, underflow về 0 với `rawStep` cực nhỏ ⇒ `step`
   * bằng 0 ⇒ `value += step` không bao giờ tới đích ⇒ **treo tab**, không throw, không có gì
   * trên màn hình cho biết chuyện gì đang xảy ra. Tiền VND không chạm tới ngưỡng đó, nhưng
   * cái giá của việc sai ở đây quá cao so với một dòng guard.
   */
  if (!Number.isFinite(step) || step <= 0) return { max: maxValue, ticks: [0, maxValue] }

  const max = Math.ceil(maxValue / step) * step
  const ticks: number[] = []
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(value)
  return { max, ticks }
}

/**
 * Mốc "đẹp" cho một trục ĐẾM (số giao dịch) — chỉ 1 / 2 / 5 × 10^n, không có 2,5.
 *
 * Không dùng lại `buildNiceAxis` được: nó cho phép bước 2,5 và cho phép bước nhỏ hơn 1, nên
 * một tập tối đa 9 giao dịch ra thước `0 · 2,5 · 5 · 7,5 · 10` và tập tối đa 1 giao dịch ra
 * `0 · 0,25 · …` — **nửa giao dịch không tồn tại**, đọc lên là sai đơn vị chứ không phải xấu.
 * Bước luôn ≥ 1 và luôn nguyên, nên mọi vạch đều là một con số đếm được.
 */
const COUNT_NICE_MULTIPLIERS = [1, 2, 5] as const

export function buildNiceCountAxis(maxValue: number): { max: number; ticks: number[] } {
  const safeMax = Number.isFinite(maxValue) ? Math.max(0, Math.ceil(maxValue)) : 0
  // Trục rỗng vẫn phải có bề rộng: `max = 0` thì mọi điểm chia cho 0 → `NaN` toạ độ.
  if (safeMax <= 0) return { max: 1, ticks: [0, 1] }

  const rawStep = safeMax / AXIS_TICK_COUNT
  // `Math.max(0, …)` chặn số mũ ÂM — đó chính là chỗ đẻ ra bước 0,25 khi tổng đếm rất nhỏ.
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(rawStep)))
  const normalized = rawStep / magnitude
  const multiplier = COUNT_NICE_MULTIPLIERS.find((value) => normalized <= value) ?? 10
  const step = Math.max(1, multiplier * magnitude)

  const max = Math.ceil(safeMax / step) * step
  const ticks: number[] = []
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(value)
  return { max, ticks }
}

export function SummaryStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-content-dark-3 text-[11px] tracking-wide uppercase">{label}</span>
      <span className="typo-body-lg-semibold text-content-dark-1 tabular-nums">{value}</span>
      {hint && <span className="text-content-dark-3 text-xs tabular-nums">{hint}</span>}
    </div>
  )
}

/** Một dòng số trong tooltip: chấm/gạch màu + nhãn + giá trị đậm. */
/**
 * Doanh thu in ngay sau đầu thanh — đọc được con số mà không phải dóng ngược lên trục.
 * Dùng chung cho cả hai biểu đồ thanh xếp hạng của dashboard Sales.
 */
export function RevenueBarLabel({
  x,
  y,
  width,
  height,
  index,
  rows,
}: RechartsLabelContentProps & { rows: { revenue: number }[] }) {
  const row = rows[index ?? -1]
  if (!row || x === undefined || y === undefined || width === undefined) return null

  return (
    <text
      {...TEXT_HALO}
      x={x + width + 8}
      y={y + (height ?? 0) / 2}
      dominantBaseline="central"
      fontSize={13}
      fontWeight={600}
      fill={INK.strong}
    >
      {formatCompactVnd(row.revenue)}
    </text>
  )
}

export function TooltipMetric({
  label,
  value,
  marker,
}: {
  label: string
  value: string
  marker?: 'revenue' | 'dealCount'
}) {
  return (
    <p className="text-content-dark-2 flex items-center gap-2">
      {marker === 'revenue' && (
        <span
          className="h-[3px] w-3 shrink-0 rounded-full"
          style={{ backgroundColor: REVENUE_TREND_COLORS.revenue }}
        />
      )}
      {marker === 'dealCount' && (
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: REVENUE_TREND_COLORS.dealCount }}
        />
      )}
      {label}:
      <span className="text-content-dark-1 ml-auto font-semibold tabular-nums">{value}</span>
    </p>
  )
}

/** Khoảng hở giữa con trỏ và mép tooltip. Dính sát quá thì tooltip che mất chính cái thanh. */
const TOOLTIP_CURSOR_GAP = 12

/**
 * Toạ độ Recharts bơm vào `content` của `<Tooltip>` — gốc là góc trên-trái của `<svg>`.
 */
export type TooltipCoordinate = { x?: number; y?: number }

/**
 * Đặt tooltip vào LỚP PHỦ nằm ngoài khung cuộn, và tự lật khi sát mép.
 *
 * Vì sao phải tự làm thay vì để Recharts lo: tooltip mặc định render bên trong
 * `.recharts-wrapper`, mà wrapper đó nằm trong khung `overflow-y-auto` ⇒ **khung cuộn XÉN
 * tooltip**. `allowEscapeViewBox` không cứu được: nó chỉ cho thoát khỏi viewBox của `<svg>`,
 * không thoát khỏi một DOM ancestor có `overflow`. Đo trên dev: hover hai dòng cuối trong
 * khung là tooltip cụt 36px, và khối "Hiệu suất theo tổ chức" chỉ thoát nhờ tooltip của nó
 * thấp hơn 32px — tức là may, không phải dựng đúng.
 *
 * Cách chữa là `portal` (Recharts 3): tooltip được render vào một lớp phủ ĐẶT NGOÀI khung
 * cuộn nên không ai xén nó. Đổi lại, khi có `portal` thì **Recharts bỏ toàn bộ style định
 * vị** — chỗ này phải tự đặt.
 *
 * Đổi hệ toạ độ: `coordinate` tính từ gốc `<svg>`, mà `<svg>` bị đẩy lên `scrollTop` pixel so
 * với lớp phủ ⇒ `top = coordinate.y - scrollTop`.
 *
 * Lật bằng `calc(-100% - gap)` chứ KHÔNG đo kích thước tooltip: `100%` trong `translate` là
 * kích thước của chính phần tử, nên trình duyệt tự tính — không cần `useLayoutEffect`, không
 * có nhịp render thừa làm tooltip nháy một khung hình ở sai chỗ.
 */
export function TooltipAnchor({
  coordinate,
  viewportRef,
  hostRef,
  children,
}: {
  coordinate?: TooltipCoordinate
  /**
   * Lớp phủ nhận tooltip. Portal bằng REF chứ không bằng prop `portal` của Recharts: prop đó
   * cần một `HTMLElement`, mà node chỉ có sau khi mount ⇒ phải giữ trong state ⇒ thêm một
   * lượt render lúc mount. Lượt render thừa đó gọi lại hook dữ liệu và làm đỏ đúng cái test
   * canh "một lượt tải". Ref thì không kích hoạt render, mà tooltip vốn chỉ dựng khi rê chuột
   * — lúc đó mount đã xong từ lâu nên `hostRef.current` luôn có.
   *
   * Bỏ trống (test dựng tooltip trần) thì render tại chỗ, không portal.
   */
  hostRef?: RefObject<HTMLDivElement | null>
  /**
   * Khung cuộn của biểu đồ — nguồn của `scrollTop` và của kích thước vùng nhìn thấy.
   * Bỏ trống (test dựng tooltip trần) thì neo ở đúng `coordinate`, không lật — jsdom không
   * dựng `ResponsiveContainer` nên ở đó chẳng có khung nào để lật theo.
   */
  viewportRef?: RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  const viewport = viewportRef?.current
  const left = coordinate?.x ?? 0
  const top = (coordinate?.y ?? 0) - (viewport?.scrollTop ?? 0)

  // Nửa dưới thì lật lên, nửa phải thì lật sang trái — chỉ khi đã đo được vùng nhìn thấy.
  const flipUp = (viewport?.clientHeight ?? 0) > 0 && top > viewport!.clientHeight / 2
  const flipLeft = (viewport?.clientWidth ?? 0) > 0 && left > viewport!.clientWidth * 0.6

  const shift = (flip: boolean) =>
    flip ? `calc(-100% - ${TOOLTIP_CURSOR_GAP}px)` : `${TOOLTIP_CURSOR_GAP}px`

  const anchored = (
    <div className="absolute top-0 left-0" style={{ transform: `translate(${left}px, ${top}px)` }}>
      <div style={{ transform: `translate(${shift(flipLeft)}, ${shift(flipUp)})` }}>{children}</div>
    </div>
  )

  const host = hostRef?.current
  return host ? createPortal(anchored, host) : anchored
}

/** Khung tooltip dùng chung — nội dung bên trong do từng biểu đồ tự dựng. */
export function TooltipCard({ children }: { children: ReactNode }) {
  return (
    <div className="border-border-1 min-w-56 rounded-lg border bg-white px-3 py-2 text-[13px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
      {children}
    </div>
  )
}

/** Tiền đầy đủ kèm đơn vị, dùng trong tooltip. */
export function fullVnd(value: number): string {
  return `${formatCurrencyVND(value)} VND`
}

/**
 * Chú giải hai chuỗi (thanh doanh thu + đường số giao dịch), dùng chung cho cả hai biểu đồ
 * xếp hạng của dashboard Sales.
 *
 * Không dùng `<Legend>` của Recharts: nó nằm TRONG `<svg>`, mà `<svg>` ở hai khối này bị cuộn
 * dọc và đã `aria-hidden` cả cụm — chú giải sẽ trôi mất khi cuộn xuống, đúng lúc người ta cần
 * nó nhất. Dựng bằng HTML ở ngoài vùng cuộn thì nó đứng yên cùng hai thước trục.
 */
export function RevenueDealSeriesLegend() {
  return (
    <div className="text-content-dark-3 flex items-center justify-end gap-4 text-[11px]">
      <span className="flex items-center gap-1.5">
        <span
          className="h-[3px] w-4 shrink-0 rounded-full"
          style={{ backgroundColor: REVENUE_TREND_COLORS.revenue }}
        />
        Doanh thu
      </span>
      <span className="flex items-center gap-1.5">
        {/* Gạch có chấm giữa — nhại đúng hình `<Line dot>` để không phải đoán. */}
        <span className="relative flex h-2 w-4 shrink-0 items-center">
          <span
            className="h-[2px] w-full rounded-full"
            style={{ backgroundColor: REVENUE_TREND_COLORS.dealCount }}
          />
          <span
            className="absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full"
            style={{ backgroundColor: REVENUE_TREND_COLORS.dealCount }}
          />
        </span>
        Số giao dịch
      </span>
    </div>
  )
}

/**
 * Thước trục ngang vẽ bằng HTML, đặt NGOÀI vùng cuộn của biểu đồ.
 *
 * Vì sao không để `<XAxis>` của Recharts lo: khối "Giao dịch theo dự án" bỏ phân trang nên
 * danh sách dài phải cuộn dọc bên trong khung — trục nằm trong `<svg>` sẽ cuộn mất theo, và
 * từ dòng thứ 11 trở đi người đọc không còn mốc nào để dóng độ dài thanh.
 *
 * Vị trí mỗi vạch tính bằng `calc()` theo ĐÚNG công thức vùng vẽ của Recharts
 * (`width - margin.left - margin.right`), nên hai lớp khớp nhau tuyệt đối miễn là chiều rộng
 * hai khung bằng nhau — nhớ đặt `scrollbar-gutter: stable` cho cả hai, không thì thanh cuộn
 * ăn mất mấy pixel của khung dưới và thước lệch dần về bên phải.
 */
export function HorizontalAxisRuler({
  ticks,
  max,
  leftGutter,
  rightGutter,
  formatTick = formatCompactVnd,
  color,
  testId,
}: {
  ticks: number[]
  max: number
  leftGutter: number
  rightGutter: number
  /** Bắt buộc khi biểu đồ có hai thước xếp chồng — không có thì test không phân biệt nổi. */
  testId?: string
  /** Mặc định là tiền rút gọn — trục ĐẾM truyền `formatNumber` vào để khỏi ra "1 tr giao dịch". */
  formatTick?: (value: number) => string
  /**
   * Mực của dãy số. Bỏ trống = mực chữ phụ mặc định. Chỉ truyền khi biểu đồ có TỪ HAI trục
   * trở lên: lúc đó hai thước xếp chồng nhau và không còn gì nói vạch nào thuộc chuỗi nào,
   * nên số phải mang đúng màu của chuỗi nó đo.
   */
  color?: string
}) {
  return (
    <div data-testid={testId} className="text-content-dark-3 relative h-4 text-[11px]">
      {ticks.map((tick) => (
        <span
          key={tick}
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap tabular-nums"
          style={{
            left: `calc(${leftGutter}px + (100% - ${leftGutter + rightGutter}px) * ${
              max > 0 ? tick / max : 0
            })`,
            color,
          }}
        >
          {formatTick(tick)}
        </span>
      ))}
    </div>
  )
}
