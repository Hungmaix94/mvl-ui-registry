import { z } from 'zod'
import { numberInput } from '@/utils/validation-utils'
import { formatCurrencyVND } from '@/utils/common'
import {
  PaymentMethod,
  PayeeType,
} from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants'
import type { PaymentVoucherRequest } from '@/features/accounting/payment-vouchers/services/payment-voucher-service'

export const paymentVoucherInvoiceSchema = z.object({
  input_invoice: z.number(),
  allocated_amount: z.string().optional(),
  allocation_pct: z.string().optional(),
})

export const paymentVoucherOffsetInvoiceSchema = z.object({
  sales_invoice: z.number(),
  allocated_amount: z.string().optional(),
  allocation_pct: z.string().optional(),
  sales_invoice_detail: z.any().optional(),
})

const paymentVoucherWizardBaseSchema = z.object({
  voucher_date: z.string().min(1, 'Vui lòng chọn ngày lập phiếu'),
  payee_type: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.nativeEnum(PayeeType, {
      required_error: 'Vui lòng chọn loại đối tượng',
      invalid_type_error: 'Vui lòng chọn loại đối tượng',
    })
  ),
  payee_employee: numberInput().nullable().optional(),
  payee_collaborator: numberInput().nullable().optional(),
  payee_exchange: numberInput().nullable().optional(),
  payee_name: z.string().min(1, 'Vui lòng nhập tên người nhận'),

  // Custom split fields for UI (mirror receipt voucher wizard)
  bank_on: z.boolean().default(false),
  bank_amount: z.union([z.string(), z.number()]).optional(),
  from_bank_account: numberInput().nullable().optional(),
  bank_ref: z.string().optional(),

  cash_on: z.boolean().default(false),
  cash_amount: z.union([z.string(), z.number()]).optional(),

  // Offset fields — chỉ khả dụng khi payee_type = EXCHANGE (API offset-candidates yêu cầu payee_exchange)
  offset_on: z.boolean().default(false),
  offset_amount: z.union([z.string(), z.number()]).optional(),
  offset_receivables: z.record(z.boolean()).optional(),

  // Optional now because we derive it from the split fields
  payment_method: z.nativeEnum(PaymentMethod).optional(),
  total_amount: z.union([z.string(), z.number()]).optional(),
  accounting_period: numberInput('Vui lòng chọn kỳ kế toán') as z.ZodType<number>,

  // Bật khi Bước 2 chạy luồng thu thập hoa hồng F2: phiếu do server dựng từ các hóa đơn
  // được tick, số tiền tự tính, và các ô chuyển khoản / tài khoản chi KHÔNG được render.
  // Không có cờ này thì superRefine dưới đây vẫn đòi bank_amount + from_bank_account,
  // form fail validation trên field vô hình nên bấm "Lưu phiếu chi" không có phản hồi gì.
  f2_collect: z.boolean().optional(),

  selected_invoice_ids: z.array(z.number()).optional(),
  invoices: z.array(paymentVoucherInvoiceSchema).optional(),
  offset_invoices: z.array(paymentVoucherOffsetInvoiceSchema).optional(),
  attachment: z.string().nullable().optional(),
})

export const paymentVoucherWizardSchema = paymentVoucherWizardBaseSchema.superRefine(
  (data, ctx) => {
    // FK người nhận bắt buộc theo loại — phải khớp với guard vào Bước 2 của wizard,
    // nếu không user pass validation rồi bị đá ngược về Bước 1 mà không thấy lỗi
    if (data.payee_type === PayeeType.EMPLOYEE && !data.payee_employee) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn nhân viên',
        path: ['payee_employee'],
      })
    }
    if (data.payee_type === PayeeType.COLLABORATOR && !data.payee_collaborator) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn cộng tác viên',
        path: ['payee_collaborator'],
      })
    }
    if (data.payee_type === PayeeType.EXCHANGE && !data.payee_exchange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn sàn giao dịch',
        path: ['payee_exchange'],
      })
    }
    // Luồng F2: người dùng chỉ tick hóa đơn, không nhập tiền — dừng ở đây, mọi ràng buộc
    // phía dưới đều nói về các ô không hiển thị trong luồng này. Trừ tài khoản chi: ô đó
    // CÓ hiển thị ở Bước 2 và phiếu chuyển khoản không có tài khoản là phiếu chi hụt.
    if (data.f2_collect) {
      if (!data.cash_on && !data.from_bank_account) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vui lòng chọn tài khoản chi',
          path: ['from_bank_account'],
        })
      }
      return
    }
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
      if (!data.from_bank_account) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vui lòng chọn tài khoản chi',
          path: ['from_bank_account'],
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

    const bankAmt = data.bank_on ? Number(data.bank_amount ?? 0) : 0
    const cashAmt = data.cash_on ? Number(data.cash_amount ?? 0) : 0
    const offsetAmt = data.offset_on ? Number(data.offset_amount ?? 0) : 0
    const totalVoucherAmount = bankAmt + cashAmt + offsetAmt

    if (totalVoucherAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tổng số tiền thanh toán và cấn trừ phải lớn hơn 0',
        path: ['total_amount'],
      })
    }

    if (data.invoices && data.invoices.length > 0) {
      const invoicesSum = data.invoices.reduce((s, inv) => s + Number(inv.allocated_amount || 0), 0)
      const offsetSum = data.offset_on
        ? (data.offset_invoices ?? []).reduce((s, oi) => s + Number(oi.allocated_amount || 0), 0)
        : 0

      const actualPayment = bankAmt + cashAmt
      if (invoicesSum - offsetSum !== actualPayment) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tổng phân bổ hóa đơn (${formatCurrencyVND(invoicesSum)} ₫) trừ cấn trừ (${formatCurrencyVND(offsetSum)} ₫) phải bằng số tiền thanh toán thực tế (${formatCurrencyVND(actualPayment)} ₫)`,
          path: ['invoices'],
        })
      }
    }
  }
)

export type PaymentVoucherInvoiceFormValues = z.infer<typeof paymentVoucherInvoiceSchema>
export type PaymentVoucherOffsetInvoiceFormValues = z.infer<
  typeof paymentVoucherOffsetInvoiceSchema
>
export type PaymentVoucherWizardValues = z.infer<typeof paymentVoucherWizardSchema>

export function toPaymentVoucherPayload(values: PaymentVoucherWizardValues): PaymentVoucherRequest {
  // Derive payment method and total amount (mirror receipt voucher wizard)
  let payment_method: PaymentMethod = PaymentMethod.TRANSFER
  const bankAmt = values.bank_on ? Number(values.bank_amount ?? 0) : 0
  const cashAmt = values.cash_on ? Number(values.cash_amount ?? 0) : 0
  const offsetAmt = values.offset_on ? Number(values.offset_amount ?? 0) : 0

  if (offsetAmt > bankAmt && offsetAmt > cashAmt) {
    payment_method = PaymentMethod.OFFSET
  } else if (cashAmt > bankAmt && cashAmt > offsetAmt) {
    payment_method = PaymentMethod.CASH
  } else {
    payment_method = PaymentMethod.TRANSFER
  }

  const total_amount = String(bankAmt + cashAmt)

  return {
    voucher_date: values.voucher_date,
    payee_type: values.payee_type,
    payee_employee:
      values.payee_type === PayeeType.EMPLOYEE ? (values.payee_employee ?? null) : null,
    payee_collaborator:
      values.payee_type === PayeeType.COLLABORATOR ? (values.payee_collaborator ?? null) : null,
    payee_exchange:
      values.payee_type === PayeeType.EXCHANGE ? (values.payee_exchange ?? null) : null,
    payee_name: values.payee_name || undefined,
    payment_method: payment_method,
    total_amount: total_amount,
    from_bank_account: values.bank_on ? (values.from_bank_account ?? null) : null,
    bank_ref: values.bank_on ? values.bank_ref || undefined : undefined,
    accounting_period: values.accounting_period,
    files: values.attachment ? { attachments: [values.attachment] } : undefined,
    invoices: values.invoices?.length
      ? values.invoices.map((inv) => ({
          input_invoice: inv.input_invoice,
          allocated_amount: inv.allocated_amount || undefined,
        }))
      : undefined,
    offset_invoices: values.offset_invoices?.length
      ? values.offset_invoices.map((oi) => ({
          sales_invoice: oi.sales_invoice,
          allocated_amount: oi.allocated_amount || undefined,
        }))
      : values.offset_receivables
        ? Object.entries(values.offset_receivables)
            .filter(([, checked]) => checked)
            .map(([id]) => Number(id))
            .filter((id) => !isNaN(id))
            .map((id) => ({ sales_invoice: id }))
        : undefined,
  }
}
