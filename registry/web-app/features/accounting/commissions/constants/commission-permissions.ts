import type { MonthlySummaryRole } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'

/**
 * Mã quyền cho các hành động trong phân hệ Hoa hồng.
 *
 * Vì sao gom về một chỗ thay vì rải `ability.can('confirm', 'salesmonthly…')` khắp các bảng:
 * năm bảng kê theo tháng (Sale / CTV / F2 / Quản lý / Nhân viên) có **cùng bộ hành động** nhưng
 * mỗi bảng đọc một ViewSet riêng ở BE ⇒ **khác subject**. Rải chuỗi ra từng file là mở đường cho
 * đúng lỗi mà `docs/ai/conventions.md` § "Gate một hành động bằng đúng quyền mà hành động đó GỌI
 * TỚI" đã ghi: ai đó "đồng bộ cho gọn" về một subject, và một nửa vai trò mất nút còn nửa kia ăn
 * 403 — cả hai chiều đều im lặng.
 *
 * Mọi mã ở đây được ghim lại bằng `commission-permissions.guard.test.ts`: nó đối chiếu với dòng
 * `**Require permission:**` trong `src/api/schema.ts`. Mã tự đặt ⇒ không vai trò nào được cấp ⇒
 * khoá màn với mọi tài khoản trừ superuser, hỏng nặng hơn chính lỗ hổng đang vá.
 */

/** Subject của từng bảng kê theo tháng. `satisfies` ép khai đủ mọi role — thêm role mà quên khai là compile error. */
export const MONTHLY_SUMMARY_SUBJECT = {
  sales: 'salesmonthlycommissionsummary',
  collaborators: 'collaboratormonthlycommissionsummary',
  f2: 'f2monthlycommissionsummary',
  management: 'managementmonthlycommissionsummary',
  employees: 'employeemonthlycommissionsummary',
} as const satisfies Record<MonthlySummaryRole, string>

export type MonthlySummarySubject =
  (typeof MONTHLY_SUMMARY_SUBJECT)[keyof typeof MONTHLY_SUMMARY_SUBJECT]

/**
 * Action trên bảng kê theo tháng.
 *
 * `SEND_EMAIL` cố ý dùng nhánh `_preview`: bấm "Gửi email đối chiếu" mở dialog xem trước TRƯỚC,
 * còn `_send` chỉ chạy khi người dùng bấm gửi trong dialog đó. Gate nút bằng `_send` là chặt hơn
 * thứ nút ấy thật sự gọi ⇒ giấu nút của người chỉ được xem trước.
 */
export const MONTHLY_SUMMARY_ACTION = {
  LIST: 'list',
  RETRIEVE: 'retrieve',
  CONFIRM: 'confirm',
  HOLD: 'hold',
  SEND_EMAIL_PREVIEW: 'send_commission_detail_email_preview',
  /** "Đề xuất tạm ứng hoa hồng" → `POST .../{role}/{id}/request-advance/`, KHÔNG phải `commissionadvance.create`. */
  REQUEST_ADVANCE: 'request_advance',
} as const

/**
 * Quyền của resource KHÁC mà một hành động trên bảng kê chạm tới. Đây chính là chỗ hay bị gộp
 * nhầm: "Tạo phiếu chi" đứng trên bảng kê hoa hồng nhưng điều hướng sang màn phiếu chi, nên nó
 * ăn quyền của `paymentvoucher`, không phải của bảng kê.
 */
export const COMMISSION_ACTION_PERMISSION = {
  /** "Tạo phiếu chi" → điều hướng `PAYMENT_VOUCHER_CREATE` (route khai `paymentvoucher.create`). */
  CREATE_PAYMENT_VOUCHER: { action: 'create', subject: 'paymentvoucher' },
  /** "Xem chi tiết" ở bảng Tạm giữ → route `COMMISSION_HOLD_DETAIL`; nhóm không có id riêng nên route khai `.list`. */
  VIEW_HOLD_DETAIL: { action: 'list', subject: 'commissionhold' },
  /** "Giải phóng" → `POST /api/accounting/commission-holds/{id}/release/`. */
  RELEASE_HOLD: { action: 'release', subject: 'commissionhold' },
  /** "Hủy tạm giữ" → `POST /api/accounting/commission-holds/{id}/cancel/`. */
  CANCEL_HOLD: { action: 'cancel', subject: 'commissionhold' },
  /** "Xem chi tiết" ở bảng Chỉ tiêu phòng → route `DEPARTMENT_MONTHLY_KPI_DETAIL`. */
  VIEW_DEPT_POOL: { action: 'retrieve', subject: 'departmentcommissionpool' },
  /** "Nhập chia hoa hồng" → `POST /api/accounting/department-commission-pools/{id}/import-lines/`. */
  IMPORT_DEPT_POOL_LINES: { action: 'import_lines', subject: 'departmentcommissionpool' },
  /** "Xác nhận dòng" → `POST /api/accounting/department-commission-pools/{id}/confirm-line/` (số ít). */
  CONFIRM_DEPT_POOL_LINE: { action: 'confirm_line', subject: 'departmentcommissionpool' },
  /** "Xem chi tiết nhân viên" → route `COMMISSION_BY_REVENUE_DETAIL`. */
  VIEW_REVENUE_DEPT_DETAIL: { action: 'retrieve', subject: 'departmentmonthlykpi' },
} as const
