import { z } from 'zod'
import {
  ReceiptVoucherStatus as PaymentVoucherStatus,
  VoucherPaymentMethod as PaymentMethod,
  PaymentVoucherPayeeType as PayeeType,
} from '@/constants/api-schema-aliases'
// ID người chi (chỉ 1 trong 3 field active, tuỳ payee_type). Select emit chuỗi → chấp nhận cả number.
const payeeIdField = z.union([z.number(), z.string()]).nullish()

export const paymentVoucherFilterSchema = z.object({
  status: z.nativeEnum(PaymentVoucherStatus).nullish(),
  payment_method: z.nativeEnum(PaymentMethod).nullish(),
  payee_type: z.nativeEnum(PayeeType).nullish(),
  payee_employee: payeeIdField,
  payee_collaborator: payeeIdField,
  payee_exchange: payeeIdField,
  // CR STT47: khoảng ngày chi, map thẳng sang `voucher_date_after` / `_before` của API.
  voucher_date_after: z.date().nullish(),
  voucher_date_before: z.date().nullish(),
})

export type PaymentVoucherFilterValues = z.infer<typeof paymentVoucherFilterSchema>

export const DEFAULT_PAYMENT_VOUCHER_FILTER: PaymentVoucherFilterValues = {
  status: null,
  payment_method: null,
  payee_type: null,
  payee_employee: null,
  payee_collaborator: null,
  payee_exchange: null,
  voucher_date_after: null,
  voucher_date_before: null,
}
