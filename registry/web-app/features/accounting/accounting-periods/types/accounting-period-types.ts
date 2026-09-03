import { z } from 'zod'

export const accountingPeriodFormSchema = z.object({
  year: z.coerce
    .number({
      required_error: 'Vui lòng nhập năm',
      invalid_type_error: 'Vui lòng nhập năm',
    })
    .int('Năm phải là số nguyên')
    .min(1900, 'Năm tối thiểu là 1900')
    .max(2100, 'Năm tối đa là 2100'),
  month: z.coerce
    .number({
      required_error: 'Vui lòng nhập tháng',
      invalid_type_error: 'Vui lòng nhập tháng',
    })
    .int('Tháng phải là số nguyên')
    .min(1, 'Tháng từ 1 đến 12')
    .max(12, 'Tháng từ 1 đến 12'),
  locks_apply_at: z.union([z.date(), z.string()]).nullable().optional(),
  status: z.string().optional(),
})

export type AccountingPeriodFormValues = z.infer<typeof accountingPeriodFormSchema>

export const DEFAULT_ACCOUNTING_PERIOD_FORM_VALUES: AccountingPeriodFormValues = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  locks_apply_at: null,
  status: 'OPEN',
}

export const accountingPeriodFilterSchema = z.object({
  year: z.coerce.number().nullable().optional(),
  month: z.coerce.number().nullable().optional(),
  status: z.string().nullable().optional(),
})

export type AccountingPeriodFilterValues = z.infer<typeof accountingPeriodFilterSchema>

export const DEFAULT_ACCOUNTING_PERIOD_FILTER_VALUES: AccountingPeriodFilterValues = {
  year: null,
  month: null,
  status: null,
}
