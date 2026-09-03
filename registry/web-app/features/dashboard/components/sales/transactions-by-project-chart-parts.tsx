import type { RefObject } from 'react'
import { formatNumber } from '@/utils/common'
import { REVENUE_TREND_COLORS } from './sales-admin-dashboard-constants'
import {
  formatCompactVnd,
  fullVnd,
  INK,
  TEXT_HALO,
  TooltipAnchor,
  TooltipCard,
  TooltipMetric,
  type RechartsLabelContentProps,
  type TooltipCoordinate,
} from './dashboard-chart-parts'

/**
 * Phần RIÊNG của `TransactionsByProjectChart`: nhãn tên dự án, nhãn giá trị và tooltip.
 * Thang đo, định dạng tiền và khung tooltip dùng chung ở `dashboard-chart-parts.tsx`.
 */

/**
 * Trần độ dài tên chủ đầu tư ở dòng phụ. `<text>` của SVG KHÔNG tự xuống dòng và cũng không
 * tự cắt bằng dấu ba chấm — một cái tên như "Công ty TNHH Phát triển Bất động sản Masterise
 * Homes" cứ thế chạy tràn qua cả cột giá trị. Tên đầy đủ vẫn còn trong tooltip và bảng a11y.
 */
const MAX_INVESTOR_NAME_CHARS = 34

function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text
}

export type ProjectRow = {
  /** Khoá duy nhất cho trục danh mục — dùng `project.id`, không dùng tên (tên có thể trùng). */
  key: string
  projectName: string
  /** Rỗng khi dự án chưa gắn chủ đầu tư. */
  investorName: string
  revenue: number
  dealCount: number
  feePrice: number
  goodsAmount: number
  reconciliationAmount: number
  remainingAmount: number
}

/**
 * Tên dự án in NGAY TRÊN thanh của chính nó, không nằm trong máng trục Y bên trái.
 *
 * Máng trái phải rộng ~200px cho tên dự án tiếng Việt, tức là cắt mất ngần ấy chiều rộng của
 * vùng vẽ — mà chiều rộng chính là thứ mã hoá doanh thu. Đưa tên lên trên thì thanh dài hết
 * khung và tên cũng không phải cắt bằng dấu ba chấm.
 *
 * Dòng phụ mờ giữ lại đúng những gì bảng cũ hiện thành cột riêng: chủ đầu tư, số giao dịch,
 * giá tính phí.
 *
 * Từ khi biểu đồ có trục X thứ hai, **số giao dịch ở đây là mỏ neo của đường**: đường chỉ cho
 * thấy HÌNH DẠNG (dự án nào nhô ra, dự án nào tụt), còn giá trị chính xác vẫn đọc ở dòng này.
 * Vì vậy nó mang đúng màu của đường — cùng màu thì mắt tự nối hai thứ lại, không phải dò
 * xuống chú giải.
 */
export function ProjectNameLabel({
  x,
  y,
  index,
  rows,
}: RechartsLabelContentProps & { rows: ProjectRow[] }) {
  const row = rows[index ?? -1]
  if (!row || x === undefined || y === undefined) return null

  const investor = row.investorName
    ? truncate(row.investorName, MAX_INVESTOR_NAME_CHARS)
    : 'Chưa gắn chủ đầu tư'

  return (
    <g>
      <text {...TEXT_HALO} x={x} y={y - 22} fontSize={13} fontWeight={600} fill={INK.strong}>
        {row.projectName}
      </text>
      {/* `TEXT_HALO`: đường số giao dịch chạy chéo qua vùng vẽ và cắt ngang chính hai dòng
          nhãn này — không viền nền thì cả tên dự án lẫn đường đều mất nét. */}
      <text
        {...TEXT_HALO}
        x={x}
        y={y - 8}
        fontSize={11}
        fontStyle={row.investorName ? 'normal' : 'italic'}
        fill={INK.muted}
      >
        {investor}
        <tspan fill={REVENUE_TREND_COLORS.dealCount} fontWeight={600}>
          {`  ·  ${formatNumber(row.dealCount)} giao dịch`}
        </tspan>
        {row.feePrice > 0 && <tspan>{`  ·  Giá tính phí ${formatCompactVnd(row.feePrice)}`}</tspan>}
      </text>
    </g>
  )
}

export function ProjectTooltip({
  active,
  payload,
  coordinate,
  viewportRef,
  hostRef,
}: {
  active?: boolean
  payload?: { payload?: ProjectRow }[]
  coordinate?: TooltipCoordinate
  viewportRef?: RefObject<HTMLDivElement | null>
  hostRef?: RefObject<HTMLDivElement | null>
}) {
  const row = active ? payload?.[0]?.payload : undefined
  if (!row) return null

  return (
    <TooltipAnchor coordinate={coordinate} viewportRef={viewportRef} hostRef={hostRef}>
      <TooltipCard>
        <p className="text-content-dark-1 font-semibold">{row.projectName}</p>
        <p className="text-content-dark-3 text-xs">{row.investorName || 'Chưa gắn chủ đầu tư'}</p>
        <div className="mt-1.5 flex flex-col gap-0.5">
          <TooltipMetric label="Doanh thu" value={fullVnd(row.revenue)} marker="revenue" />
          {/* `marker` từ khi số giao dịch được vẽ thành đường riêng: chấm xanh ở đây là thứ duy
            nhất nói dòng này ứng với đường nào trên biểu đồ. */}
          <TooltipMetric
            label="Số giao dịch"
            value={formatNumber(row.dealCount)}
            marker="dealCount"
          />
          <TooltipMetric label="Giá tính phí" value={fullVnd(row.feePrice)} />
          <TooltipMetric label="Tiền hàng" value={fullVnd(row.goodsAmount)} />
          <TooltipMetric label="Đối chiếu" value={fullVnd(row.reconciliationAmount)} />
          <TooltipMetric label="Còn lại" value={fullVnd(row.remainingAmount)} />
        </div>
      </TooltipCard>
    </TooltipAnchor>
  )
}
