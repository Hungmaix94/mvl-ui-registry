import { useState } from 'react'
import { Link } from 'react-router-dom'
// Đọc thẳng module hằng, KHÔNG qua barrel `@/routes`: barrel kéo `AppRoute.tsx` (cả cây route
// của app), tạo vòng import khiến `APP_PATH` còn undefined lúc module này eval trong test.
import { APP_PATH } from '@/routes/AppRoute.constant'
import { IconCaretdown } from '@/assets/icons'
import { formatNumber } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import {
  getDealUnitLabel,
  type DealPayableGroup,
  type DealCommissionSource,
} from '../utils/summary-breakdown'

/**
 * Ô dùng chung cho BA bảng deal của cụm HH theo tháng — Sale (20.14), CTV (hai bảng: HH CTV +
 * HH F2 nhận hộ sàn) và F2.
 *
 * Ba màn có cột TIỀN khác nhau (Sale: HH bán hàng/thưởng nóng/thưởng/thưởng MV · CTV: HH CTV +
 * HĐ CTV + gửi mail · F2: % F2 + HĐ đầu vào), nhưng bốn cột đầu thì giống hệt nhau về mặt
 * nghiệp vụ. Trước 26/08/2026 mỗi màn tự viết lại nên lệch nhau lặng lẽ: chỉ Sale có link mã
 * căn + phiếu chia, chỉ F2 link tên dự án, CTV nhét badge nhận hộ vào cột "Mã deal" còn Sale
 * đã tách cột riêng. Sửa một chỗ mà quên hai chỗ kia là lỗi mặc định của bố cục cũ — nên các ô
 * này sống ở đây, không copy vào từng bảng.
 */

/** Nhãn cột dùng chung — để ba bảng không đặt tên khác nhau cho cùng một thứ. */
export const DEAL_COLUMN_LABELS = {
  code: 'Mã deal',
  project: 'Dự án',
  source: 'Đứng tên / Nhận hộ',
} as const

/**
 * Cột "Mã deal": mã deal · mã căn · phiếu chia — cả ba đều là link.
 *
 * `unit_id` và `worksheet_id` do BE trả trên MỌI bucket deal-grain (`_deal_group_header` +
 * `_attach_deal_period_worksheet` chạy cho sale/mgmt.tbc/f2), nên ba màn dùng chung được.
 * Thiếu id thì hiện chữ thường, không dựng link chết.
 */
export const DealCodeCell = ({
  deal,
  canViewSplitSheet,
}: {
  deal: DealPayableGroup
  canViewSplitSheet: boolean
}) => {
  const unitLabel = getDealUnitLabel(deal)
  const worksheetPath =
    canViewSplitSheet && deal.worksheet_id
      ? APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET_DETAIL.replace(':id', String(deal.worksheet_id))
      : null

  return (
    <>
      {deal.deal_id ? (
        <Link
          to={APP_PATH.DEAL_DETAIL.replace(':id', String(deal.deal_id))}
          className="text-brand-primary font-medium hover:underline"
        >
          <code className="text-xs">{deal.deal_code || 'N/A'}</code>
        </Link>
      ) : (
        <code className="text-xs">{deal.deal_code || 'N/A'}</code>
      )}
      {unitLabel &&
        (deal.unit_id ? (
          <Link
            to={APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(':id', String(deal.unit_id))}
            className="text-brand-primary block text-[11px] hover:underline"
            title="Xem chi tiết căn"
          >
            {unitLabel}
          </Link>
        ) : (
          <div className="text-[11px] text-neutral-500">{unitLabel}</div>
        ))}
      {/* Tiền của dòng này sinh ra từ phiếu chia (deal × kỳ). Trước 26/08/2026 không màn nào
          có entry point sang đó, khách phải tự mò mã phiếu. */}
      {worksheetPath && (
        <Link
          to={worksheetPath}
          className="mt-0.5 block text-[11px] text-violet-600 hover:underline"
          title="Xem phân bổ tiền thực nhận của kỳ này"
        >
          Phiếu chia {deal.worksheet_code || `#${deal.worksheet_id}`}
        </Link>
      )}
    </>
  )
}

/**
 * Cột "Dự án": tên dự án (link) + khách hàng ở dòng phụ.
 *
 * Tiêu đề cột là **"Dự án"**, không phải "Dự án · KH": tên khách chỉ là dòng chú thích dưới
 * tên dự án, giống mã căn nằm dưới mã deal — không phải một cột thứ hai bị dồn vào.
 */
export const DealProjectCell = ({ deal }: { deal: DealPayableGroup }) => {
  const projectName = deal.project?.name || '—'
  const customerName =
    (deal as any).customer_name || (deal as any).customer?.fullname || (deal as any).customer?.name

  return (
    <div className="w-[190px]">
      <div className="truncate font-medium text-neutral-800" title={projectName}>
        {deal.project?.id ? (
          <Link
            to={APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(deal.project.id))}
            className="text-brand-primary hover:underline"
          >
            {projectName}
          </Link>
        ) : (
          projectName
        )}
      </div>
      <div className="truncate text-[11px] text-neutral-400" title={customerName || ''}>
        {customerName || '—'}
      </div>
    </div>
  )
}

/** "60%" — tỷ lệ nhận hộ chỉ hiện khi KHÁC trọn suất; 100% là mặc định, in ra chỉ gây nhiễu. */
export const formatPartialProxyPct = (pct: number | null): string | null =>
  pct == null || pct >= 100 ? null : `${formatNumber(pct, { maximumFractionDigits: 2 })}%`

/**
 * Bộ màu của pill nguồn — CÙNG cặp màu với bảng chia thực nhận (màn 20.8,
 * `RecipientPayoutTable` / `RecipientSplitEditor`) để kế toán đi giữa hai màn không phải học
 * lại quy ước: xanh lá = chính chủ, hổ phách = nhận hộ.
 *
 * `green-100/green-800` và `amber-100/amber-800` của Tailwind ĐÚNG BẰNG bốn mã hex bảng 20.8
 * ghi cứng (#DCFCE7/#166534, #FEF3C7/#92400E) — dùng lớp tiện ích thay vì hex để không vi phạm
 * luật "không hardcode màu" của AGENTS.md mà vẫn ra đúng một màu.
 */
const SOURCE_PILL_BASE =
  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap'
const OWN_PILL = `${SOURCE_PILL_BASE} bg-green-100 text-green-800`
const PROXY_PILL = `${SOURCE_PILL_BASE} bg-amber-100 text-amber-800`

/**
 * Nguồn HH của một dòng: pill NGẮN (quan hệ + tỷ lệ) rồi tên người đứng tên ở dòng dưới.
 *
 * Cố ý KHÔNG nhồi tên vào trong pill. Bảng kê 45 kỳ 08/2026 có "Nhận hộ · NV Nguyễn Quỳnh
 * Trang · 50%" — 34 ký tự trong cột hẹp, pill wrap giữa chừng và vỡ luôn viền bo. Pill giờ dài
 * tối đa "nhận hộ 50%" nên `whitespace-nowrap` là đủ, còn tên có ô riêng để `truncate`.
 *
 * Chữ thường ("chính chủ" / "nhận hộ") cũng là để khớp bảng chia thực nhận.
 */
export const DealSourceBadge = ({ source }: { source: DealCommissionSource }) => {
  const partial = formatPartialProxyPct(source.proxyPct)
  if (!source.isProxy) {
    return <span className={OWN_PILL}>chính chủ</span>
  }
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span
        className={PROXY_PILL}
        title={
          partial
            ? `Nhận hộ ${partial} suất của người đứng tên gốc trong kỳ này`
            : 'Nhận hộ trọn suất của người đứng tên gốc trong kỳ này'
        }
      >
        {partial ? `nhận hộ ${partial}` : 'nhận hộ'}
      </span>
      <span className="w-full truncate text-[11px] text-neutral-700" title={source.label}>
        {source.ownerLabel}
      </span>
    </div>
  )
}

/**
 * Nhãn gộp của dòng deal nhiều nguồn.
 *
 * Có nguồn chính chủ thì KHÔNG được gọi cả dòng là "nhận hộ N người": người vừa đứng bán vừa
 * nhận hộ người khác là một trường hợp riêng, đọc nhầm thành nhận hộ hết là hiểu sai ai bán.
 */
export function summariseSources(sources: DealCommissionSource[]): string {
  const proxyCount = sources.filter((source) => source.isProxy).length
  return proxyCount === sources.length
    ? `nhận hộ ${proxyCount} người`
    : `chính chủ + nhận hộ ${proxyCount}`
}

/**
 * Cột "Đứng tên / Nhận hộ" — dùng chung cho cả ba màn.
 *
 * Một nguồn → badge phẳng (chính chủ, hoặc nhận hộ đúng một người).
 *
 * Từ hai nguồn trở lên, LUÔN phải thấy đủ mọi người đứng tên — bản cũ chỉ hiện người đầu tiên
 * (`getDealProxyInfo` = `items.find`) nên một người nhận hộ ba sale đọc ra như nhận hộ một
 * người. Hai cách trình bày, tuỳ bảng gọi có dựng được dòng con hay không:
 *
 * - có `onToggle` (bảng Sale) → nút gộp, bung ra dòng con kèm số tiền của TỪNG nguồn;
 * - không có `onToggle` (hai bảng CTV, bảng F2 — cột tiền của chúng không tách theo nguồn
 *   được) → xếp chồng đủ badge ngay trong ô.
 */
export const DealSourceCell = ({
  sources,
  isExpanded = false,
  onToggle,
  dealLabel,
}: {
  sources: DealCommissionSource[]
  isExpanded?: boolean
  onToggle?: () => void
  dealLabel: string
}) => {
  if (sources.length <= 1) {
    return (
      <div className="w-[190px]">
        {sources[0] ? (
          <DealSourceBadge source={sources[0]} />
        ) : (
          <span className="text-neutral-400">—</span>
        )}
      </div>
    )
  }
  if (!onToggle) {
    return (
      <div className="flex w-[190px] flex-col gap-1.5">
        {sources.map((source) => (
          <DealSourceBadge key={source.key} source={source} />
        ))}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={`Xem chi tiết từng người đứng tên của deal ${dealLabel}`}
      className="flex w-[190px] items-center gap-1.5 text-left"
    >
      <IconCaretdown
        size={12}
        className={`flex-shrink-0 text-neutral-400 transition-transform duration-200 ${
          isExpanded ? '' : '-rotate-90'
        }`}
      />
      <span className={PROXY_PILL}>{summariseSources(sources)}</span>
    </button>
  )
}

/**
 * Ngày CĐT thu tiền trong kỳ, hiện dưới ô "% tiền về (đã thu)".
 *
 * Không còn là một cột riêng: ba màn từng dành hẳn một cột cho nó, và riêng màn Sale in cứng
 * "—" dù BE trả `receipt_dates` từ lâu. Ngày thu là thứ GIẢI THÍCH con số % tiền về, nên nằm
 * ngay dưới nó thay vì chiếm cột trong bảng vốn đã 13-15 cột.
 */
export const DealReceiptDates = ({ dates }: { dates?: string[] | null }) => {
  if (!dates || dates.length === 0) return null
  const [first, ...rest] = dates
  return (
    <div
      className="mt-0.5 text-[10px] whitespace-nowrap text-neutral-400"
      title={dates.map((d) => formatDate(d)).join(' · ')}
    >
      {formatDate(first)}
      {rest.length > 0 ? ` +${rest.length}` : ''}
    </div>
  )
}

/**
 * Bảng này có deal nào là "nhận hộ" không?
 *
 * Dùng để ẩn cột "Đứng tên / Nhận hộ" ở màn F2: người hưởng là SÀN, và trên thực tế sàn luôn
 * tự đứng tên — một cột chỉ toàn "chính chủ" là nhiễu thuần tuý. Nhưng `_dispatch_f2` đi qua
 * đúng `_append_to_deal_group` như hai bucket kia, nên nhận hộ ở đây là chuyện CÓ THỂ xảy ra;
 * xoá hẳn cột sẽ khiến ca đó âm thầm hiện sai số y như lỗi đã sửa ở màn Sale. Vì vậy: ẩn theo
 * DỮ LIỆU, không ẩn theo màn.
 */
export function hasAnyProxySource(
  // Kiểu tối thiểu, KHÔNG phải `DealPayableGroup[]`: màn F2 đọc thẳng `summary.sources` do
  // schema sinh tự động, ở đó `original_beneficiary.type` là `string` chứ không phải union nên
  // gán vào `DealPayableGroup` không lọt. Hàm này chỉ cần đúng một cờ boolean.
  deals: { items?: { received_on_behalf?: boolean }[] }[]
): boolean {
  return deals.some((deal) => (deal.items || []).some((item) => item.received_on_behalf))
}

/** Trạng thái bung/thu của các dòng deal — dùng chung để ba bảng cư xử giống nhau. */
export function useExpandedDeals() {
  const [expandedDealIds, setExpandedDealIds] = useState<Set<number>>(new Set())
  const toggleDeal = (dealId: number) =>
    setExpandedDealIds((current) => {
      const next = new Set(current)
      if (next.has(dealId)) next.delete(dealId)
      else next.add(dealId)
      return next
    })
  return { isExpanded: (dealId: number) => expandedDealIds.has(dealId), toggleDeal }
}
