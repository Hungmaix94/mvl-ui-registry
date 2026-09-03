import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import {
  PAYMENT_VOUCHER_CONSTANT_KEYS,
  PAYMENT_VOUCHER_CONSTANT_MODULE,
} from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants'

export { PAYMENT_VOUCHER_CONSTANT_KEYS, PAYMENT_VOUCHER_CONSTANT_MODULE }

/** Server-side labels for a payout split's `pct_type` (hoa hồng / thưởng / khấu trừ).
 *
 * `SECTION_PCT_TYPE_LABELS` is the dict the backend actually publishes (realestate
 * constants, routed through gettext). An earlier key here did not exist server-side, so
 * the lookup silently returned nothing and the table printed the raw `pct_f2_commission`.
 */
export const PCT_TYPE_CONSTANT_KEY = APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.SECTION_PCT_TYPE_LABELS
export const PCT_TYPE_CONSTANT_MODULE = 'realestate' as const

/**
 * Why an input-invoice line was left out of the voucher.
 *
 * These codes are defined by this feature's backend service (they are not part of any
 * app_constants set), so the labels live here — see `input_invoice_payment_service`.
 */
export const PAYMENT_SKIP_REASON = {
  UNLINKED_RECON_ROW: 'UNLINKED_RECON_ROW',
  WORKSHEET_NOT_APPROVED: 'WORKSHEET_NOT_APPROVED',
  PAYMENT_STOPPED: 'PAYMENT_STOPPED',
  NO_ELIGIBLE_SPLIT: 'NO_ELIGIBLE_SPLIT',
  NO_REMAINING: 'NO_REMAINING',
  NON_POSITIVE_NET: 'NON_POSITIVE_NET',
  RECON_MISMATCH: 'RECON_MISMATCH',
} as const

export type PaymentSkipReason = (typeof PAYMENT_SKIP_REASON)[keyof typeof PAYMENT_SKIP_REASON]

/** Keyed loosely: the backend may add a reason before the FE knows about it. */
export const PAYMENT_SKIP_REASON_LABEL: Record<string, string> = {
  [PAYMENT_SKIP_REASON.UNLINKED_RECON_ROW]:
    'Dòng hóa đơn chưa gắn với dòng đối chiếu F2 nên không xác định được kỳ.',
  [PAYMENT_SKIP_REASON.WORKSHEET_NOT_APPROVED]: 'Bảng tính kỳ chưa được duyệt chi.',
  [PAYMENT_SKIP_REASON.PAYMENT_STOPPED]: 'Kỳ này đang bị dừng chi.',
  [PAYMENT_SKIP_REASON.NO_ELIGIBLE_SPLIT]: 'Chưa có khoản phân bổ tiền về nào đủ điều kiện chi.',
  [PAYMENT_SKIP_REASON.NO_REMAINING]:
    'Dòng hóa đơn đã chi hết hoặc đang được giữ chỗ ở phiếu khác.',
  [PAYMENT_SKIP_REASON.NON_POSITIVE_NET]: 'Khấu trừ lớn hơn hoa hồng nên không có gì để chi.',
  [PAYMENT_SKIP_REASON.RECON_MISMATCH]:
    'Số tiền hóa đơn không còn khớp bảng đối chiếu F2 — kiểm tra lại đối chiếu trước khi chi.',
}

export const INPUT_INVOICE_PAYMENT_PERMISSIONS = {
  PREVIEW: 'inputinvoice.payment_voucher_preview',
  CREATE: 'inputinvoice.create_payment_voucher',
} as const
