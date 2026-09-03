import { BookingRefundStatus as ApiBookingRefundStatus } from '@/constants/api-schema-aliases'
/**
 * Trạng thái phiếu hoàn tiền đặt chỗ.
 *
 * Giá trị lấy TỪ enum sinh ra bởi OpenAPI, không gõ tay chuỗi — trước đây file này là một
 * `enum` khai thủ công nên `detailData.status` (kiểu enum của schema) không gán được vào nó,
 * và mọi nơi dùng phải `as unknown as RefundBookingStatus` để lách. Map dưới đây chỉ đổi tên
 * khoá sang UPPER_SNAKE cho dễ đọc ở call site; kiểu và giá trị vẫn là của schema.
 */
export const RefundBookingStatus = {
  PENDING_CONFIRM: ApiBookingRefundStatus.pending_confirm,
  PENDING_ADMIN: ApiBookingRefundStatus.pending_admin,
  PENDING_ADMIN_LEAD: ApiBookingRefundStatus.pending_admin_lead,
  PENDING_ACCOUNTANT: ApiBookingRefundStatus.pending_accountant,
  PENDING_TREASURER: ApiBookingRefundStatus.pending_treasurer,
  APPROVED: ApiBookingRefundStatus.approved,
  REJECTED: ApiBookingRefundStatus.rejected,
  COMPLETED: ApiBookingRefundStatus.completed,
} as const

export type RefundBookingStatus = (typeof RefundBookingStatus)[keyof typeof RefundBookingStatus]

/**
 * Chốt chặn biên dịch: `Object.values` trả về `ApiBookingRefundStatus[]`, chỉ gán được vào
 * `RefundBookingStatus[]` khi map phía trên phủ ĐỦ enum của BE. BE thêm trạng thái mới mà
 * quên bổ sung vào map → dòng này lỗi ngay, thay vì âm thầm rơi vào nhánh "Không xác định".
 */
export const REFUND_BOOKING_STATUSES: readonly RefundBookingStatus[] =
  Object.values(ApiBookingRefundStatus)

/** Các trạng thái mà nút "Duyệt" (approve thường) được phép hiện. */
export const REFUND_APPROVABLE_STATUSES: readonly RefundBookingStatus[] = [
  RefundBookingStatus.PENDING_CONFIRM,
  RefundBookingStatus.PENDING_ADMIN,
]

/** Các trạng thái còn nằm trong luồng duyệt nên vẫn từ chối được. */
export const REFUND_REJECTABLE_STATUSES: readonly RefundBookingStatus[] = [
  RefundBookingStatus.PENDING_CONFIRM,
  RefundBookingStatus.PENDING_ADMIN,
  RefundBookingStatus.PENDING_ADMIN_LEAD,
  RefundBookingStatus.PENDING_ACCOUNTANT,
  RefundBookingStatus.PENDING_TREASURER,
]

/**
 * Trạng thái còn sửa được. REJECTED bị trả về cho người tạo nên vẫn mở; các bàn đã đóng
 * (kế toán, thủ quỹ, đã duyệt, đã hoàn thành) là chỉ đọc.
 */
export const REFUND_EDITABLE_STATUSES: readonly RefundBookingStatus[] = [
  RefundBookingStatus.PENDING_CONFIRM,
  RefundBookingStatus.REJECTED,
]
