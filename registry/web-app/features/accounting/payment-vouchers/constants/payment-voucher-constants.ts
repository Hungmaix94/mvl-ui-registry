import { ColoredValueVariant } from '@/api/schema'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

import {
  PaymentVoucherPayeeType,
  ReceiptVoucherStatus,
  VoucherPaymentMethod,
} from '@/constants/api-schema-aliases'

export { PaymentVoucherLineLine_kind as PaymentVoucherLineKind } from '@/api/schema'
export {
  ReceiptVoucherStatus as PaymentVoucherStatus,
  VoucherPaymentMethod as PaymentMethod,
  PaymentVoucherPayeeType as PayeeType,
}

export type PaymentVoucherStatusType = ReceiptVoucherStatus
export type PaymentMethodType = VoucherPaymentMethod
export type PayeeTypeType = PaymentVoucherPayeeType

export const PAYMENT_VOUCHER_CONSTANT_KEYS = {
  STATUS: APP_CONSTANT_KEY.ACCOUNTING.PAYMENT_VOUCHER_STATUS_CHOICES,
  PAYMENT_METHOD: APP_CONSTANT_KEY.ACCOUNTING.PAYMENT_VOUCHER_PAYMENT_METHOD_CHOICES,
  PAYEE_TYPE: APP_CONSTANT_KEY.ACCOUNTING.PAYMENT_VOUCHER_PAYEE_TYPE_CHOICES,
  LINE_KIND: APP_CONSTANT_KEY.ACCOUNTING.PAYMENT_VOUCHER_LINE_LINE_KIND_CHOICES,
} as const

// Module name để dùng với useAppConstant — cần verify với /api/core/constants/
export const PAYMENT_VOUCHER_CONSTANT_MODULE = 'accounting' as const

// ColoredValueVariant enum từ @/api/schema: GREEN | BLUE | YELLOW | PURPLE | RED | ORANGE | GREY
export const PAYMENT_VOUCHER_STATUS_VARIANT: Record<ReceiptVoucherStatus, ColoredValueVariant> = {
  [ReceiptVoucherStatus.DRAFT]: ColoredValueVariant.GREY,
  [ReceiptVoucherStatus.POSTED]: ColoredValueVariant.GREEN,
  [ReceiptVoucherStatus.CANCELLED]: ColoredValueVariant.RED,
}

export const PAYEE_TYPE_VARIANT: Record<PaymentVoucherPayeeType, ColoredValueVariant> = {
  [PaymentVoucherPayeeType.EMPLOYEE]: ColoredValueVariant.BLUE,
  [PaymentVoucherPayeeType.COLLABORATOR]: ColoredValueVariant.PURPLE,
  [PaymentVoucherPayeeType.EXCHANGE]: ColoredValueVariant.YELLOW,
  [PaymentVoucherPayeeType.SUPPLIER]: ColoredValueVariant.ORANGE,
  // BE thêm payee_type INVESTOR (đợt hoàn tiền chủ đầu tư). Hai call site đều đã
  // có `?? GREY` nên trước đó không vỡ runtime, chỉ thiếu màu riêng.
  [PaymentVoucherPayeeType.INVESTOR]: ColoredValueVariant.GREEN,
}

export const PAYMENT_VOUCHER_PERMISSIONS = {
  LIST: 'paymentvoucher.list',
  CREATE: 'paymentvoucher.create',
  RETRIEVE: 'paymentvoucher.retrieve',
  UPDATE: 'paymentvoucher.update',
  PARTIAL_UPDATE: 'paymentvoucher.partial_update',
  DESTROY: 'paymentvoucher.destroy',
  CANCEL: 'paymentvoucher.cancel',
  POST: 'paymentvoucher.post_voucher',
  HISTORIES: 'paymentvoucher.histories',
  HISTORY_DETAIL: 'paymentvoucher.history_detail',
} as const
