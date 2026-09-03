import type { RefObject } from 'react'
import { cn } from '@/utils'
import { formatNumber } from '@/utils/common'
import { REVENUE_TREND_COLORS } from './sales-admin-dashboard-constants'
import {
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
 * Phần RIÊNG của `PerformanceByOrgChart`: nhãn tên tổ chức và tooltip.
 * Thang đo, nhãn giá trị, thước trục và khung tooltip dùng chung ở `dashboard-chart-parts.tsx`
 * — hai biểu đồ xếp hạng của dashboard phải đọc được bằng cùng một quy ước.
 */

/**
 * Trần độ dài tên tổ chức ở dòng tiêu đề. `<text>` của SVG KHÔNG tự xuống dòng và cũng không
 * tự cắt bằng dấu ba chấm, nên tên phòng dài sẽ chạy tràn qua cả cột giá trị. Tên đầy đủ vẫn
 * còn trong tooltip và bảng a11y.
 */
const MAX_ORG_NAME_CHARS = 42

/**
 * Trần cho đường dẫn tổ chức ở dòng phụ. Rộng hơn tên vì dòng phụ chữ nhỏ hơn và không phải
 * chừa chỗ cho cột giá trị bên phải. Bản đầy đủ vẫn nằm trong tooltip và bảng a11y.
 */
const MAX_BREADCRUMB_CHARS = 46

function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text
}

export type ChartRow = {
  /** Khoá duy nhất cho trục danh mục: `org_name` lặp lại ở nhiều kỳ nên không dùng làm khoá. */
  key: string
  orgName: string
  /** Rỗng khi API không gắn được bản ghi vào tổ chức nào. */
  isUnattributed: boolean
  periodLabel: string
  /**
   * Tên các cấp NẰM TRÊN đơn vị này (BE PR #3375). Rỗng ở cấp không còn gì bên trên: xem
   * theo chi nhánh thì cả hai rỗng, xem theo khối thì chỉ còn chi nhánh.
   *
   * Có mặt vì "Phòng Kinh Doanh 9" đứng một mình không cho biết nó thuộc đâu — và nhiều chi
   * nhánh có phòng trùng tên thật, nên hai thanh cạnh nhau đọc y hệt mà là hai đơn vị khác.
   */
  branchName: string
  blockName: string
  revenue: number
  dealCount: number
}

/**
 * Đường dẫn tổ chức gọn cho nhãn trên biểu đồ: `Hà Nội › Khối Kinh doanh 9`.
 *
 * Chỗ hẹp nên bỏ nhãn cấp ("Chi nhánh", "Khối") và để thứ tự nói thay — trái là cấp trên.
 * Tooltip thì rộng nên ở đó gọi tên cấp hẳn hoi, không bắt người đọc suy ra.
 */
export function orgBreadcrumb(row: ChartRow): string {
  return [row.branchName, row.blockName].filter(Boolean).join(' › ')
}

/**
 * Tên tổ chức in NGAY TRÊN thanh của chính nó thay vì nằm trong máng trục Y bên trái.
 *
 * Máng trái phải rộng ~180px cho tên phòng tiếng Việt, tức là cắt mất ngần ấy chiều rộng
 * của vùng vẽ — mà chiều rộng chính là thứ mã hoá doanh thu. Đưa tên lên trên thì thanh dài
 * hết khung và tên cũng không còn phải cắt bớt bằng dấu ba chấm.
 *
 * Dòng phụ mờ mang **số giao dịch dưới dạng CHỮ**. Trước đây nó được mã hoá bằng độ lớn một
 * cái chấm (lollipop); bỏ đi vì đọc độ lớn chấm không ra được con số, mà đây đúng là khối
 * người ta cần đọc số.
 *
 * Từ khi biểu đồ có trục X thứ hai, con số này còn là **mỏ neo của đường giao dịch**: đường
 * chỉ cho thấy HÌNH DẠNG (phòng nào nhô ra, phòng nào tụt), còn giá trị chính xác vẫn đọc ở
 * đây. Vì vậy nó mang đúng màu của đường — hai thứ cùng màu thì mắt tự nối chúng lại, không
 * phải dò xuống chú giải.
 */
export function OrgNameLabel({
  x,
  y,
  index,
  rows,
  showPeriod,
}: RechartsLabelContentProps & { rows: ChartRow[]; showPeriod: boolean }) {
  const row = rows[index ?? -1]
  if (!row || x === undefined || y === undefined) return null

  const name = truncate(row.orgName, MAX_ORG_NAME_CHARS)
  const title = showPeriod && row.periodLabel ? `${name}  ·  ${row.periodLabel}` : name
  const breadcrumb = orgBreadcrumb(row)

  return (
    <g>
      <text
        data-testid="org-label-title"
        {...TEXT_HALO}
        x={x}
        y={y - 22}
        fontSize={13}
        fontWeight={row.isUnattributed ? 400 : 600}
        fontStyle={row.isUnattributed ? 'italic' : 'normal'}
        fill={row.isUnattributed ? INK.muted : INK.strong}
      >
        {title}
      </text>
      {/*
        Số giao dịch đứng TRƯỚC đường dẫn tổ chức, dù đường dẫn mới là thứ bổ nghĩa cho cái
        tên ngay trên nó. Lý do: con số phải bắt đầu ở cùng một hoành độ trên mọi dòng thì
        mắt mới so được theo cột; đặt sau một chuỗi dài ngắn khác nhau là nó nhảy mỗi dòng
        một chỗ và hết so sánh được.
      */}
      <text
        data-testid="org-label-sub"
        {...TEXT_HALO}
        x={x}
        y={y - 8}
        fontSize={11}
        fill={INK.muted}
      >
        <tspan fill={REVENUE_TREND_COLORS.dealCount} fontWeight={600}>
          {`${formatNumber(row.dealCount)} giao dịch`}
        </tspan>
        {breadcrumb && <tspan>{`   ·   ${truncate(breadcrumb, MAX_BREADCRUMB_CHARS)}`}</tspan>}
      </text>
    </g>
  )
}

export function ChartTooltip({
  active,
  payload,
  coordinate,
  viewportRef,
  hostRef,
}: {
  active?: boolean
  payload?: { payload?: ChartRow }[]
  coordinate?: TooltipCoordinate
  viewportRef?: RefObject<HTMLDivElement | null>
  hostRef?: RefObject<HTMLDivElement | null>
}) {
  const row = active ? payload?.[0]?.payload : undefined
  if (!row) return null

  /**
   * Cấp trên in ĐẦY ĐỦ, không cắt: tooltip là chỗ người ta mở ra để đọc cho rõ, cắt ở đây
   * thì chẳng còn nơi nào xem được tên thật. Nhãn cấp ("Chi nhánh", "Khối") gọi tên hẳn hoi
   * thay vì để dấu `›` như nhãn trên biểu đồ — đúng câu người dùng đang hỏi là "phòng này
   * thuộc khối nào, chi nhánh nào", nên trả lời bằng đúng hai chữ đó.
   */
  const parents = [
    { key: 'branch', level: 'Chi nhánh', name: row.branchName },
    { key: 'block', level: 'Khối', name: row.blockName },
  ].filter((parent) => parent.name)

  return (
    <TooltipAnchor coordinate={coordinate} viewportRef={viewportRef} hostRef={hostRef}>
      <TooltipCard>
        <p className="text-content-dark-1 font-semibold">{row.orgName}</p>
        {row.periodLabel && <p className="text-content-dark-3 text-xs">{row.periodLabel}</p>}

        {parents.length > 0 && (
          <dl className="border-border-1 mt-1.5 flex flex-col gap-0.5 border-t pt-1.5 text-xs">
            {parents.map((parent) => (
              <div key={parent.key} data-testid={`org-parent-${parent.key}`} className="flex gap-2">
                <dt className="text-content-dark-3 w-16 shrink-0">{parent.level}</dt>
                <dd className="text-content-dark-2 m-0">{parent.name}</dd>
              </div>
            ))}
          </dl>
        )}

        <div
          className={cn(
            'flex flex-col gap-0.5',
            parents.length > 0 ? 'border-border-1 mt-1.5 border-t pt-1.5' : 'mt-1.5'
          )}
        >
          <TooltipMetric label="Doanh thu" value={fullVnd(row.revenue)} marker="revenue" />
          {/* Có `marker` từ khi số giao dịch được vẽ thành đường riêng: chấm xanh ở đây là thứ
            duy nhất nói dòng này ứng với đường nào trên biểu đồ, chứ không phải trang trí. */}
          <TooltipMetric
            label="Số giao dịch"
            value={formatNumber(row.dealCount)}
            marker="dealCount"
          />
        </div>
      </TooltipCard>
    </TooltipAnchor>
  )
}
