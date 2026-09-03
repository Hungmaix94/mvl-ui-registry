import { z } from 'zod'

export const collaboratorFormSchema = z.object({
  name: z
    .string({ required_error: 'Vui lòng nhập họ tên' })
    .min(1, 'Vui lòng nhập họ tên')
    .max(255, 'Họ tên không vượt quá 255 ký tự'),
  id_number: z.string().max(30, 'CMND/CCCD không vượt quá 30 ký tự').optional().or(z.literal('')),
  tax_code: z.string().max(20, 'Mã số thuế không được vượt quá 20 ký tự').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^(0|\+84)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  bank_name: z.string().max(255).optional().or(z.literal('')),
  bank_account: z.string().max(50).optional().or(z.literal('')),
  bank_branch: z.string().max(255).optional().or(z.literal('')),
  address: z.string().max(1000).optional().or(z.literal('')),
  note: z.string().max(2000).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
})

export type CollaboratorFormValues = z.infer<typeof collaboratorFormSchema>

export const collaboratorFilterSchema = z.object({
  is_active: z.enum(['true', 'false', '']).nullable().optional(),
})

export type CollaboratorFilterValues = z.infer<typeof collaboratorFilterSchema>

export const DEFAULT_COLLABORATOR_FILTER_VALUES: CollaboratorFilterValues = {
  is_active: null,
}
