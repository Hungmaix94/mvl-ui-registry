/**
 * Payload cho bước "xác nhận đã chi" — dùng chung hoàn đặt chỗ và hoàn cọc.
 *
 * Khai ở đây, KHÔNG khai vào `src/api/schema.ts`: schema.ts là file sinh tự động
 * từ BE, hand-edit sẽ bị ghi đè ở lần regen kế tiếp và làm diverge cả file.
 * TODO(schema): khi BE lên dev, chạy `yarn api:update:local` rồi đổi các type này sang
 * `components['schemas'][...]` và xoá file này.
 *
 * Kế hoạch: backend/docs/plans/plan_sales_refund_cashflow_20260812.md §10.1
 */

export type RefundPaymentConfirmRequest = {
  paid_amount: string
  paid_at: string
  mv_account_number: string
  mv_account_name?: string
  mv_bank_name?: string
  bank_ref?: string
  files?: { attachments?: string[] }
  retained_reason?: string
  retained_note?: string
  confirm_account_mismatch?: boolean
  note?: string
}

export type InvestorRecoveryRequest = {
  recovered_on: string
  note?: string
}

/** Mã lỗi BE trả ở `error.code`. FE rẽ nhánh theo mã, không parse câu chữ. */
export const REFUND_PAYMENT_ERROR = {
  NOT_PENDING: 'refund_not_pending_payment',
  AMOUNT_MISMATCH: 'paid_amount_must_equal_refund_amount',
  PROOF_REQUIRED: 'payment_proof_required',
  MV_ACCOUNT_REQUIRED: 'mv_account_required',
  RETAINED_REASON_REQUIRED: 'retained_reason_required',
  PAID_AT_FUTURE: 'paid_at_in_the_future',
  /** Cần mở dialog "đã đòi lại tiền từ CĐT" trước khi chi. */
  INVESTOR_RECOVERY_PENDING: 'investor_recovery_pending',
  /** Cảnh báo mềm: gửi lại kèm confirm_account_mismatch=true để vẫn chi. */
  ACCOUNT_MISMATCH: 'account_mismatch',
} as const

export type RefundPaymentErrorCode =
  (typeof REFUND_PAYMENT_ERROR)[keyof typeof REFUND_PAYMENT_ERROR]

/** Đọc `error.code` ra khỏi lỗi API, bất kể lớp bọc nào. */
export const getRefundPaymentErrorCode = (error: unknown): string | undefined => {
  const payload = (error as { response?: { error?: { code?: string } }; error?: { code?: string } })
  return payload?.response?.error?.code ?? payload?.error?.code
}

/** Lý do giữ lại — khớp `RetainedReason` của BE. */
export const RETAINED_REASON_OPTIONS = [
  { value: 'penalty', label: 'Phạt theo hợp đồng' },
  { value: 'fee_offset', label: 'Cấn trừ phí' },
  { value: 'customer_agreed', label: 'Khách hàng đồng ý' },
  { value: 'forfeit', label: 'Khách mất cọc' },
  { value: 'other', label: 'Khác' },
]

/**
 * Tiền khách chuyển VÀO tài khoản nào — khớp `TransferAccountTarget` của BE.
 *
 * Đúng hai lựa chọn, và đây là danh sách ĐẦY ĐỦ chứ không phải rút gọn: BE có
 * CheckConstraint chốt cặp này ở tầng DB (14/08/2026). `custom` bị gỡ vì suốt ba
 * năm không có lấy một dòng dữ liệu, `unknown` là cờ backfill mà migration cùng
 * đợt đã dọn sạch — gửi lên bất kỳ giá trị nào khác đều 400.
 *
 * Giá trị này quyết định luồng duyệt: `investor` nghĩa là tiền không qua tay
 * MVL, nên TP TKKD duyệt là xong, không cần kế toán.
 */
export const TRANSFER_TO_ACCOUNT_OPTIONS = [
  { value: 'mv', label: 'Tài khoản MaiVietLand' },
  { value: 'investor', label: 'Thẳng cho Chủ đầu tư' },
]
