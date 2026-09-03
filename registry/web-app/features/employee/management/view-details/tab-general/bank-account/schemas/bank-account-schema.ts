import { z } from 'zod'

export const bankAccountSchema = z.object({
  bank_id: z
    .number({ required_error: 'Vui lòng chọn ngân hàng' })
    .nullable()
    .refine((val) => val !== null && val > 0, {
      message: 'Vui lòng chọn ngân hàng',
    }),
  account_number: z
    .string()
    .min(1, 'Số tài khoản là bắt buộc')
    .max(50, 'Số tài khoản không được quá 50 ký tự'),
  account_name: z
    .string()
    .min(1, 'Chủ tài khoản là bắt buộc')
    .max(255, 'Chủ tài khoản không được quá 255 ký tự'),
  is_primary: z.boolean().optional(),
})

export type BankAccountFormData = z.infer<typeof bankAccountSchema>
