import type { ReactNode } from 'react'

import { ReferenceCode } from '@/components/commons'
import { APP_PATH } from '@/routes'

/**
 * Ba ô định danh đứng đầu bảng worksheet kỳ — `Dự án` · `Mã BĐS` · `Chủ đầu tư / Nguồn hàng`.
 *
 * Dùng chung cho CẢ HAI màn (`CommissionSplitTable` và `DealPeriodAllocationWorksheetTable`) vì
 * CR STT17 bắt hai màn hiện đúng cùng một bộ cột; trước đây mỗi bảng tự chép một bản, và bản chép
 * chính là chỗ hai màn trôi khỏi nhau.
 *
 * ## Vì sao là `<a target="_blank">` chứ không phải `navigate()`
 *
 * Ba ô này trước dùng `<span onClick={() => navigate(...)}>`, tức là rời màn hiện tại (bug user
 * báo 20/08). Bảng worksheet là màn ĐỐI SOÁT: kế toán dò một dòng rất rộng, mở dự án hay căn ra
 * xem rồi quay lại dòng đang dò. Điều hướng trong tab hiện tại là mất kỳ đang chọn, mất bộ lọc,
 * mất vị trí cuộn — quay lại phải dựng lại từ đầu.
 *
 * Cột người bán ngay cạnh đã mở tab mới từ trước (`EmployeeProfileLink`, `CodeLink` trong
 * `WorksheetParticipantCells`), nên ba ô này còn lệch cả với hàng xóm của chính nó.
 *
 * Ba tính chất phải đi cùng nhau, thiếu cái nào cũng hỏng theo một kiểu:
 *
 * - `target="_blank"` + `rel="noopener noreferrer"` — mở tab mới mà không cho trang đích cầm
 *   `window.opener`.
 * - `href` thật (không phải `div` bắt click) — có thế thì chuột giữa / Ctrl+click / "mở tab mới"
 *   trong menu chuột phải mới chạy, và trình đọc màn hình mới gọi nó là link.
 * - `stopPropagation` — dòng bảng có `onRowClick` riêng; thiếu nó là một cú bấm vừa mở tab mới
 *   vừa điều hướng tab hiện tại sang trang chi tiết.
 */

/** Kiểu chung của một dòng worksheet ở phần định danh — khai tối thiểu đúng field đang đọc, để
 *  hai bảng truyền `row.original` vào mà không phải ép kiểu. */
export type WorksheetIdentityRow = {
  project_id?: number | null
  project_name?: string | null
  unit_number?: string | null
  prop_code?: string | null
  investor_id?: number | null
  investor_name?: string | null
}

const EMPTY = '—'

/**
 * Link mở tab mới cho một ô của bảng — nền chung của cả ba ô dưới đây.
 *
 * Không có `href` (bản ghi thiếu FK) thì trả về text thường: link trỏ tới `:id` không tồn tại chỉ
 * dẫn người dùng vào trang 404.
 */
function CellLink({
  href,
  children,
  className,
}: {
  href?: string
  children: ReactNode
  className: string
}) {
  if (!href) return <span className="text-content-dark-1 font-medium">{children}</span>

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={className}
    >
      {children}
    </a>
  )
}

/** Ô cột `Dự án` (B) — mở trang quản lý dự án ở tab mới. */
export function ProjectNameCell({ row }: { row: WorksheetIdentityRow }) {
  return (
    <CellLink
      href={
        row.project_id
          ? APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(row.project_id))
          : undefined
      }
      className="text-brand-primary-default hover:underline"
    >
      {row.project_name || EMPTY}
    </CellLink>
  )
}

/**
 * Ô cột `Mã BĐS` (C) — mở Bảng hàng đã lọc sẵn theo mã căn, ở tab mới.
 *
 * `ReferenceCode` dựng `Link` của react-router (điều hướng trong tab hiện tại) nên ở đây KHÔNG
 * truyền `linkTo`; mã được bọc ngoài bằng `CellLink`. Giữ `ReferenceCode` cho phần vỏ `<code>` để
 * pill mã căn ở đây vẫn y hệt mọi mã tham chiếu khác trong hệ thống.
 */
export function UnitNumberCell({ row }: { row: WorksheetIdentityRow }) {
  const unitNumber = row.unit_number || row.prop_code

  const badge = (
    <ReferenceCode
      code={unitNumber}
      fallback={EMPTY}
      className="[&_code]:bg-brand-primary-default/5 [&_code]:text-brand-primary-default hover:[&_code]:bg-brand-primary-default/10 w-full justify-start whitespace-nowrap [&_code]:text-xs [&_code]:font-semibold [&_code]:whitespace-nowrap [&_code]:transition-colors"
    />
  )

  if (!unitNumber) return badge

  return (
    <CellLink
      href={`${APP_PATH.PROJECT_PRODUCT_INVENTORIES}?search=${encodeURIComponent(unitNumber)}`}
      className="inline-flex w-full"
    >
      {badge}
    </CellLink>
  )
}

/** Ô cột `Chủ đầu tư / Nguồn hàng` (D) — mở trang chủ đầu tư ở tab mới. */
export function InvestorNameCell({ row }: { row: WorksheetIdentityRow }) {
  return (
    <CellLink
      href={
        row.investor_id
          ? APP_PATH.INVESTOR_MANAGEMENT_DETAIL.replace(':id', String(row.investor_id))
          : undefined
      }
      className="text-brand-primary-default font-medium hover:underline"
    >
      {row.investor_name || EMPTY}
    </CellLink>
  )
}
