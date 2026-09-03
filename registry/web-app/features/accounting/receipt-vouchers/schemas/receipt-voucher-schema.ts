import { z } from 'zod'
import { numberInput } from '@/utils/validation-utils'
import { formatCurrencyVND } from '@/utils/common'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

export const receiptVoucherInvoiceSchema = z.object({
  sales_invoice: z.number(),
  allocated_amount: z.string().optional(),
  allocation_pct: z.string().optional(),
  // Phần đã tạm ứng KHÔNG nằm ở đây: nó được khai một lần trên dòng đối chiếu, và BE tự
  // cộng vào allocated_amount lúc POST. `allocated_amount` FE gửi = TIỀN MẶT phân bổ.
})

export const receiptVoucherStep1BaseSchema = z.object({
  receipt_date: z.string().min(1, 'Vui lòng chọn ngày thu tiền'),
  payer_type: z
    .preprocess(
      (val) => (val === null ? undefined : val),
      z.nativeEnum(APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE, {
        required_error: 'Vui lòng chọn vai trò người nộp',
        invalid_type_error: 'Vui lòng chọn vai trò người nộp',
      })
    )
    .optional(),
  payer_investor: numberInput().nullable().optional(),
  payer_exchange: numberInput().nullable().optional(),
  payer_collaborator: numberInput().nullable().optional(),
  payer_name: z.string().min(1, 'Vui lòng nhập tên người nộp'),
  payer_tax_code: z.string().optional(),
  payer_account: z.string().optional(),

  // Custom split fields for UI
  bank_on: z.boolean().default(false),
  bank_amount: z.union([z.string(), z.number()]).optional(),
  to_bank_account: numberInput().nullable().optional(),
  bank_transaction_ref: z.string().optional(),

  cash_on: z.boolean().default(false),
  cash_amount: z.union([z.string(), z.number()]).optional(),
  cash_fund: z.string().optional(), // For UI only right now

  // Offset fields
  offset_on: z.boolean().default(false),
  offset_amount: z.union([z.string(), z.number()]).optional(),
  offset_receivables: z.record(z.boolean()).optional(),
  offset_payables: z.record(z.boolean()).optional(),

  // Optional now because we derive it
  payment_method: z
    .nativeEnum(APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD)
    .optional(),
  total_amount: z.union([z.string(), z.number()]).optional(),
  accounting_period: numberInput('Vui lòng chọn kỳ kế toán') as z.ZodType<number>,
})

/** Các trường phương thức thanh toán dùng chung giữa schema bước 1 và schema đầy đủ. */
type ReceiptPaymentMethodFields = Pick<
  z.infer<typeof receiptVoucherStep1BaseSchema>,
  | 'bank_on'
  | 'bank_amount'
  | 'to_bank_account'
  | 'cash_on'
  | 'cash_amount'
  | 'offset_on'
  | 'offset_amount'
>

/**
 * Validate khối phương thức thanh toán (chuyển khoản / tiền mặt / cấn trừ).
 *
 * Dùng chung cho `receiptVoucherStep1Schema` và `receiptVoucherSchema` — trước đây
 * hai khối này bị chép trùng nên rất dễ sửa một chỗ mà quên chỗ còn lại.
 *
 * CR 86eycj1de: `bank_transaction_ref` là tuỳ chọn, cố ý không validate ở đây.
 */
function refineReceiptPaymentMethods(data: ReceiptPaymentMethodFields, ctx: z.RefinementCtx) {
  if (!data.bank_on && !data.cash_on && !data.offset_on) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Vui lòng chọn ít nhất một phương thức thanh toán hoặc cấn trừ',
      path: ['bank_on'],
    })
  }
  if (data.bank_on) {
    if (!data.bank_amount || Number(data.bank_amount) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng nhập số tiền chuyển khoản hợp lệ',
        path: ['bank_amount'],
      })
    }
    if (!data.to_bank_account) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn tài khoản nhận',
        path: ['to_bank_account'],
      })
    }
  }
  if (data.cash_on) {
    if (!data.cash_amount || Number(data.cash_amount) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng nhập số tiền mặt hợp lệ',
        path: ['cash_amount'],
      })
    }
  }
  if (data.offset_on) {
    if (!data.offset_amount || Number(data.offset_amount) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng nhập số tiền cấn trừ hợp lệ',
        path: ['offset_amount'],
      })
    }
  }
}

export const receiptVoucherStep1Schema = receiptVoucherStep1BaseSchema.superRefine(
  refineReceiptPaymentMethods
)

export const receiptVoucherStep4Schema = z.object({
  notes: z.string().optional(),
})

export const receiptVoucherOffsetInvoiceSchema = z.object({
  input_invoice: z.number(),
  allocated_amount: z.string().optional(),
  allocation_pct: z.string().optional(),
  input_invoice_detail: z.any().optional(),
})

export const receiptVoucherSchema = receiptVoucherStep1BaseSchema
  .merge(
    z.object({
      selected_invoice_ids: z.array(z.number()).optional(),
      invoices: z.array(receiptVoucherInvoiceSchema).optional(),
      selected_input_invoice_ids: z.array(z.number()).optional(),
      offset_invoices: z.array(receiptVoucherOffsetInvoiceSchema).optional(),
      notes: z.string().optional(),
      attachment: z.string().nullable().optional(),
      existing_attachment: z.any().nullable().optional(),
    })
  )
  .superRefine((data, ctx) => {
    refineReceiptPaymentMethods(data, ctx)

    if (data.invoices && data.invoices.length > 0) {
      const offsetSum = data.offset_on
        ? (data.offset_invoices ?? []).reduce((s, oi) => s + Number(oi.allocated_amount || 0), 0)
        : 0
      const invoicesSum = data.invoices.reduce((s, inv) => s + Number(inv.allocated_amount || 0), 0)

      // Cấn trừ KHÔNG được vượt phần phân bổ — ràng buộc này BE vẫn giữ, nên FE giữ theo.
      if (offsetSum > invoicesSum) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tổng cấn trừ (${formatCurrencyVND(offsetSum)} ₫) vượt tổng phân bổ hóa đơn (${formatCurrencyVND(invoicesSum)} ₫)`,
          path: ['invoices'],
        })
      }

      // Ở ĐÂY TỪNG CÓ ràng buộc `phân bổ − cấn trừ === tiền mặt`, dung sai 0đ. Đã bỏ.
      //
      // Phiếu thu ghi HAI số: tiền mặt thực nhận theo sao kê, và mệnh giá hoá đơn được tất
      // toán. CĐT chuyển thiếu 1-2đ (ngân hàng họ làm tròn, hoặc bảng kê của họ làm tròn) là
      // chuyện thường, và ép hai số bằng nhau buộc kế toán chọn giữa khai sai sổ quỹ hoặc để
      // một dòng hoá đơn hụt — mà dòng hụt chính là thứ `ir_cash_ratio` chia, nên 1đ thiếu
      // treo vĩnh viễn cả khoản khấu trừ hoa hồng của một căn đã trả đủ (ca HĐ 881).
      //
      // Backend đã bỏ cả hai cổng ép bằng (PR #3289); giữ lại cổng này ở FE thì
      // `collection_variance` luôn bằng 0 và tính năng chết ngay tại trình duyệt.
      //
      // KHÔNG thay bằng một dung sai nhỏ ở đây: làm thế là dựng lại đúng cổng vừa bỏ. Cổng
      // thật là câu hỏi cho con người ở bước GHI SỔ (`collection_variance_exceeds_limit`),
      // nơi tiền mới thực sự chuyển động. Phiếu nháp lệch bao nhiêu cũng chưa đụng
      // `paid_amount`, PBTV hay hoa hồng — và chặn ở cả hai bước thì kế toán phải trả lời
      // hai lần cho cùng một con số.
    }
  })

export type ReceiptVoucherInvoiceFormValues = z.infer<typeof receiptVoucherInvoiceSchema>
export type ReceiptVoucherOffsetInvoiceFormValues = z.infer<
  typeof receiptVoucherOffsetInvoiceSchema
>
export type ReceiptVoucherStep1Values = z.infer<typeof receiptVoucherStep1Schema>
export type ReceiptVoucherStep4Values = z.infer<typeof receiptVoucherStep4Schema>
export type ReceiptVoucherFormValues = z.infer<typeof receiptVoucherSchema>

export function toReceiptVoucherPayload(values: ReceiptVoucherFormValues) {
  const bankAmt = values.bank_on ? Number(values.bank_amount ?? 0) : 0
  const cashAmt = values.cash_on ? Number(values.cash_amount ?? 0) : 0

  const total_amount = String(bankAmt + cashAmt)

  let payment_method: 'TRANSFER' | 'CASH' | 'OFFSET' =
    APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD.TRANSFER
  if (values.bank_on) {
    payment_method = APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD.TRANSFER
  } else if (values.cash_on) {
    payment_method = APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD.CASH
  } else if (values.offset_on) {
    payment_method = APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD.OFFSET
  }

  return {
    receipt_date: values.receipt_date,
    payer_type: values.payer_type,
    payer_investor:
      values.payer_type === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.INVESTOR
        ? (values.payer_investor ?? null)
        : null,
    payer_exchange:
      values.payer_type === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.EXCHANGE
        ? (values.payer_exchange ?? null)
        : null,
    payer_collaborator:
      values.payer_type === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.COLLABORATOR
        ? (values.payer_collaborator ?? null)
        : null,
    payer_name: values.payer_name || undefined,
    payer_tax_code: values.payer_tax_code || undefined,
    payer_account: values.payer_account || undefined,
    payment_method: payment_method,
    total_amount: total_amount,
    to_bank_account: values.bank_on ? (values.to_bank_account ?? null) : null,
    bank_transaction_ref: values.bank_on ? values.bank_transaction_ref || undefined : undefined,
    accounting_period: values.accounting_period,
    // commission_period_year/month: BE force-syncs từ accounting_period — không gửi.
    notes: values.notes || undefined,
    files: values.attachment ? { attachments: [values.attachment] } : undefined,
    existing_files:
      values.attachment === ''
        ? { attachments: [] }
        : values.existing_attachment
          ? { attachments: [values.existing_attachment.id] }
          : undefined,
    invoices: values.invoices?.length
      ? values.invoices.map((inv) => ({
          sales_invoice: inv.sales_invoice,
          allocated_amount: inv.allocated_amount || undefined,
        }))
      : undefined,
    offset_invoices: values.offset_on
      ? values.offset_invoices?.length
        ? values.offset_invoices.map((oi) => ({
            input_invoice: oi.input_invoice,
            allocated_amount: oi.allocated_amount || undefined,
          }))
        : values.offset_payables
          ? Object.entries(values.offset_payables)
              .filter(([, checked]) => checked)
              .map(([id]) => Number(id))
              .filter((id) => !isNaN(id))
              .map((id) => ({ input_invoice: id }))
          : undefined
      : undefined,
  }
}
