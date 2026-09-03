import { Link } from 'react-router-dom'

import { APP_PATH } from '@/routes/AppRoute.constant'

/**
 * Mã đối chiếu (cột "Mã đối chiếu" trên các bảng listing CĐT/F2/CTV) → mở CHI TIẾT CÙNG TAB khi có
 * quyền + có path (khác `renderDetailLink`-kiểu-mở-tab-mới dùng cho entity khác — đây là điều hướng
 * nội bộ trong cùng feature). `stopPropagation` để không bị hàng bên dưới mở nhầm menu thao tác (Table
 * dùng chung luôn ưu tiên menu 3-chấm khi hàng có `rowActions` — xem docs/ai/reference.md).
 */
export function renderReconCodeLink(label: string, path: string | null) {
  return path ? (
    <Link
      to={path}
      className="text-action-primary-default font-medium hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </Link>
  ) : (
    <span>{label}</span>
  )
}

/**
 * Phiếu đối chiếu CĐT gốc mà một phiếu F2/CTV sinh ra từ đó — nguồn của cột/dòng "Sinh từ"
 * (UAT 1.10 P3, ClickUp 86eyb9a4z). BE trả cặp field này trên CẢ serializer list lẫn detail của
 * F2/CTV sheet, nên list và chi tiết dùng chung một hàm render.
 */
export type ReconParentSheetSource = {
  /** PK của `InvestorReconciliationSheet` — id BẢNG, đúng thứ route chi tiết CĐT nhận. */
  readonly investor_sheet: number | null
  readonly investor_sheet_detail: { readonly code: string } | null
}

/**
 * Render "Sinh từ" = mã phiếu CĐT gốc, link về chi tiết phiếu CĐT.
 *
 * Quan hệ là 1–1 (DB enforce bằng `uniq_f2_sheet_per_irs_exchange` /
 * `uniq_ctv_sheet_per_irs_collaborator`) nên luôn đúng MỘT link, không phải danh sách.
 * Phiếu cũ tạo trước khi BE gắn FK có `investor_sheet = null` ⇒ hiện "-", không phải lỗi.
 */
export function renderReconParentSheetLink(sheet: ReconParentSheetSource, canView: boolean) {
  const code = sheet.investor_sheet_detail?.code
  if (!code) return <span className="text-content-dark-3">-</span>

  const path =
    canView && sheet.investor_sheet != null
      ? APP_PATH.INVESTOR_RECONCILIATION_DETAIL.replace(':id', String(sheet.investor_sheet))
      : null
  return renderReconCodeLink(code, path)
}
