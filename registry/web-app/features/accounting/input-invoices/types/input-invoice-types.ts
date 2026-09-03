import { z } from 'zod'
import { PaymentVoucherPayeeType } from '@/constants/api-schema-aliases'
// Reuse API type — avoid self-defining enum values
export const InputInvoiceCounterpartyType = PaymentVoucherPayeeType
export type InputInvoiceCounterpartyType = PaymentVoucherPayeeType

export const inputInvoiceWriteLineSchema = z.object({
  deal: z.number().nullable().optional(),
  // Dòng đối chiếu F2 của dòng hóa đơn — thứ neo dòng này về đúng kỳ.
  // Thiếu nó thì BE từ chối tạo hóa đơn cho sàn, vì bước thu thập hoa hồng
  // sẽ không suy ra được kỳ và bỏ qua dòng (UNLINKED_RECON_ROW).
  f2_reconciliation: z.number().nullable().optional(),
  line_total: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val)
    return !isNaN(num) && num >= 0
  }, 'Số tiền phải là số lớn hơn hoặc bằng 0'),
  description: z.string().optional().or(z.literal('')),
})

export const inputInvoiceFormSchema = z.object({
  invoice_date: z
    .string({ required_error: 'Vui lòng chọn ngày hóa đơn' })
    .min(1, 'Vui lòng chọn ngày hóa đơn'),
  counterparty_type: z
    .string({ required_error: 'Vui lòng chọn đối tượng' })
    .min(1, 'Vui lòng chọn đối tượng') as z.ZodType<InputInvoiceCounterpartyType>,
  exchange: z.number().nullable().optional(),
  collaborator: z.number().nullable().optional(),
  investor: z.number().nullable().optional(),
  supplier_name: z.string().nullable().optional(),
  f2_reconciliation_sheet: z.number().nullable().optional(),
  total_amount: z.union([z.number(), z.string()]).optional().or(z.literal('')),
  vat_rate: z.union([z.number(), z.string()]).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  accounting_period: z
    .number({ required_error: 'Vui lòng chọn kỳ kế toán' })
    .min(1, 'Vui lòng chọn kỳ kế toán'),
  lines_write: z.array(inputInvoiceWriteLineSchema).optional().default([]),
})

export type InputInvoiceFormValues = z.infer<typeof inputInvoiceFormSchema>

export const DEFAULT_INPUT_INVOICE_FORM_VALUES: Omit<
  InputInvoiceFormValues,
  'counterparty_type'
> & { counterparty_type?: InputInvoiceCounterpartyType } = {
  invoice_date: '',
  // SUPPLIER là loại duy nhất lượt tạo tay được nhận (BE: INPUT_INVOICE_MANUAL_COUNTERPARTY_TYPES).
  // Mặc định cũ là EXCHANGE — loại mà BE từ chối ngay khi tạo, nên mở form rồi bấm Lưu là
  // dính 400 dù chưa đổi gì (ClickUp 86eyr4wt3). Nhãn hiển thị lấy từ `/api/constants/`.
  counterparty_type: InputInvoiceCounterpartyType.SUPPLIER,
  exchange: null,
  collaborator: null,
  investor: null,
  supplier_name: '',
  f2_reconciliation_sheet: null,
  total_amount: 0,
  vat_rate: 10,
  notes: '',
  accounting_period: undefined as any,
  lines_write: [],
}
