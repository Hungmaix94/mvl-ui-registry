import { z } from 'zod'

export const SOURCE_TYPE_OPTIONS = [
  { value: 'direct', label: 'Trực tiếp từ chủ đầu tư' },
  { value: 'F0', label: 'Qua sàn F0' },
] as const

export const salesInvoiceFormSchema = z.object({
  invoice_date: z
    .string({ required_error: 'Vui lòng chọn ngày hóa đơn' })
    .min(1, 'Vui lòng chọn ngày hóa đơn'),
  investor: z
    .number({ required_error: 'Vui lòng chọn chủ đầu tư' })
    .min(1, 'Vui lòng chọn chủ đầu tư'),
  source_type: z.enum(['direct', 'F0']).nullable().optional(),
  source_exchange: z.number().nullable().optional(),
  investor_reconciliation_sheet: z.number().nullable().optional(),
  external_invoice_no: z.string().optional().or(z.literal('')),
  replaces_invoice: z.number().nullable().optional(),
  customer_name: z.string().optional().or(z.literal('')),
  customer_tax_code: z.string().optional().or(z.literal('')),
  customer_address: z.string().optional().or(z.literal('')),
  commission_period_year: z.number().nullable().optional(),
  commission_period_month: z.number().nullable().optional(),
  total_amount: z.union([z.number(), z.string()]).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  attachment: z.string().nullable().optional(),
  accounting_period: z
    .number({ required_error: 'Vui lòng chọn kỳ kế toán' })
    .min(1, 'Vui lòng chọn kỳ kế toán'),
})

export type SalesInvoiceFormValues = z.infer<typeof salesInvoiceFormSchema>

export const DEFAULT_SALES_INVOICE_FORM_VALUES: SalesInvoiceFormValues = {
  invoice_date: '',
  investor: undefined as any,
  source_type: null,
  source_exchange: null,
  investor_reconciliation_sheet: null,
  external_invoice_no: '',
  replaces_invoice: null,
  customer_name: '',
  customer_tax_code: '',
  customer_address: '',
  commission_period_year: null,
  commission_period_month: null,
  total_amount: 0,
  notes: '',
  attachment: null,
  accounting_period: undefined as any,
}
