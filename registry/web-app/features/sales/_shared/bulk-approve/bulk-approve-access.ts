// Quyền của luồng "Duyệt nhiều" (CR STT35). Tách ra khỏi trang vì BE kiểm HAI tầng và cả ba
// màn phải kiểm giống hệt nhau.
import { BULK_APPROVE_STEP_LABEL, type BulkApproveStep } from './bulk-approve-model'

/** Chữ ký của `ability.can` — nhận vào để hàm này test được mà không cần dựng CASL. */
export type CanFn = (action: string, subject: string) => boolean

export type BulkApproveAccess = {
  /** Có bật cột checkbox + thanh hành động hay không. */
  enabled: boolean
  /** Người dùng có quyền của đúng bàn duyệt này hay không. */
  canRunStep: (step: BulkApproveStep) => boolean
}

/**
 * BE kiểm HAI tầng, nên FE phải kiểm đủ hai:
 *
 * 1. `RoleBasedPermission` chặn ngay ở endpoint bằng `<subject>.bulk_approve`
 *    (nó dựng mã quyền từ `permission_prefix` + tên action).
 * 2. `BulkApproveMixin._may_run_step` chặn TỪNG BẢN GHI bằng `<subject>.<step>`.
 *
 * Thiếu tầng 1 là lỗi thấy được ngay sau deploy: ba quyền `*.bulk_approve` do
 * `collect_permissions` tạo tự động nhưng **chưa gán cho role nào**, nên với gần như mọi người
 * dùng không phải superuser, checkbox sẽ hiện ra rồi bấm vào là **403** — UI mời một hành động
 * mà hệ thống từ chối. Thiếu tầng 2 thì kế toán tích được dòng đang chờ Admin và nhận về
 * "không có quyền" ở cột lý do.
 *
 * Superuser được CASL cấp toàn quyền nên cả hai tầng tự động đúng — cũng vì vậy mà bấm thử
 * bằng tài khoản superuser KHÔNG phát hiện được lỗ hổng này.
 */
export function resolveBulkApproveAccess(can: CanFn, subject: string): BulkApproveAccess {
  const canRunStep = (step: BulkApproveStep) => can(step, subject)
  const steps = Object.keys(BULK_APPROVE_STEP_LABEL) as BulkApproveStep[]

  return {
    enabled: can('bulk_approve', subject) && steps.some(canRunStep),
    canRunStep,
  }
}
