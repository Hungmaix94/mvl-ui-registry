import { z } from 'zod'

export const receiptFormSchema = z
  .object({
    receipt_date: z.string().min(1, 'Vui lòng chọn ngày thu tiền'),
    accounting_period: z.string().min(1, 'Vui lòng chọn kỳ kế toán'),
    commission_period: z.string().optional(),
    payer_type: z.enum(['INVESTOR', 'EXCHANGE', 'COLLABORATOR', 'OTHER'], {
      required_error: 'Vui lòng chọn vai trò người nộp',
    }),
    payer_investor: z.coerce.number().nullable().optional(),
    payer_exchange: z.coerce.number().nullable().optional(),
    payer_collaborator: z.coerce.number().nullable().optional(),
    payer_name: z.string().optional(),
    payer_tax_code: z.string().optional(),

    bank_on: z.boolean().default(false),
    cash_on: z.boolean().default(false),
    bank_amount: z.string().optional(),
    cash_amount: z.string().optional(),
    bank_account: z.coerce.number().nullable().optional(), // to_bank_account

    offset_on: z.boolean().default(false),
    offset_amount: z.string().optional(),
    offset_payables: z
      .record(
        z.object({
          type: z.string(),
          amount: z.string(),
        })
      )
      .optional(),
    offset_receivables: z
      .record(
        z.object({
          type: z.string(),
          amount: z.string(),
        })
      )
      .optional(),

    invoices: z
      .array(
        z.object({
          sales_invoice: z.number(),
          allocated_amount: z.string(),
          allocation_pct: z.string().optional(),
        })
      )
      .default([]),

    selected_invoice_ids: z.array(z.number()).default([]),

    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Payer validation based on payer_type
    if (data.payer_type === 'INVESTOR' && !data.payer_investor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn chủ đầu tư',
        path: ['payer_investor'],
      })
    } else if (data.payer_type === 'EXCHANGE' && !data.payer_exchange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn Sàn/F2',
        path: ['payer_exchange'],
      })
    } else if (data.payer_type === 'COLLABORATOR' && !data.payer_collaborator) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn Cộng tác viên',
        path: ['payer_collaborator'],
      })
    } else if (data.payer_type === 'OTHER' && !data.payer_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng nhập tên người nộp',
        path: ['payer_name'],
      })
    }

    // 2. Payment method validation
    const bankAmt = data.bank_on ? Number(data.bank_amount || 0) : 0
    const cashAmt = data.cash_on ? Number(data.cash_amount || 0) : 0
    const offsetAmt = data.offset_on ? Number(data.offset_amount || 0) : 0
    const totalInput = bankAmt + cashAmt + offsetAmt

    if (!data.bank_on && !data.cash_on && !data.offset_on) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn ít nhất 1 phương thức thanh toán hoặc cấn trừ',
        path: ['bank_on'],
      })
    }

    if (data.bank_on && bankAmt <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Số tiền chuyển khoản phải > 0',
        path: ['bank_amount'],
      })
    }

    if (data.bank_on && !data.bank_account) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn tài khoản nhận',
        path: ['bank_account'],
      })
    }

    if (data.cash_on && cashAmt <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Số tiền mặt phải > 0',
        path: ['cash_amount'],
      })
    }

    if (data.offset_on && offsetAmt <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Số tiền cấn trừ phải > 0',
        path: ['offset_amount'],
      })
    }

    // Validate offset selection
    if (data.offset_on) {
      const pKeys = Object.keys(data.offset_payables || {})
      const rKeys = Object.keys(data.offset_receivables || {})
      if (pKeys.length === 0 || rKeys.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vui lòng chọn ít nhất 1 khoản phải thu và 1 khoản phải trả để cấn trừ',
          path: ['offset_amount'],
        })
      }
    }

    // 3. Allocation validation
    const totalAllocated = data.invoices.reduce(
      (acc, inv) => acc + Number(inv.allocated_amount || 0),
      0
    )

    if (data.invoices.length === 0) {
      // Allow empty if they just want to record receipt without allocation, or require it?
      // Based on typical flows, receipt voucher should allocate to invoices,
      // but maybe partial/overpayment is allowed?
      // Let's not strictly enforce invoices length here, allow saving draft
    }

    // Check if total allocated exceeds total input (some tolerance for rounding)
    if (totalAllocated > totalInput + 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tổng số tiền phân bổ không được vượt quá số tiền thu và cấn trừ',
        path: ['invoices'],
      })
    }
  })

export type ReceiptFormValues = z.infer<typeof receiptFormSchema>

export interface Receipt {
  id: number
  code: string
  receipt_date: string
  total_amount: number | string
  payment_method: string
  status: string
  note?: string
  [key: string]: any
}
