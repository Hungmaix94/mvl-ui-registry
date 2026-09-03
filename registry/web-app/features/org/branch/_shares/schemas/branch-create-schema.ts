import { z } from 'zod'
import { validateVietnamesePhone } from '@/utils/validation-utils.ts'

/**
 * Zod schema for branch create form validation
 *
 * Field names match API schema (snake_case):
 * - province_id, administrative_unit_id (ward)
 */
export const branchCreateSchema = z.object({
  name: z.string().min(1, 'Chưa nhập thông tin').max(255, 'Tên chi nhánh không được quá 255 ký tự'),

  address: z
    .string()
    .min(1, 'Địa chỉ đường phố là bắt buộc')
    .max(500, 'Địa chỉ không được quá 500 ký tự'),

  province_id: z.coerce
    .number({
      required_error: 'Chưa nhập thông tin',
      invalid_type_error: 'Chưa nhập thông tin',
    })
    .min(1, 'Chưa nhập thông tin'),

  administrative_unit_id: z.coerce
    .number({
      required_error: 'Chưa nhập thông tin',
      invalid_type_error: 'Chưa nhập thông tin',
    })
    .min(1, 'Chưa nhập thông tin'),

  director_id: z.coerce.number().int().positive().nullable().optional(),

  phone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true
        return validateVietnamesePhone(val) === true
      },
      { message: 'Số điện thoại không hợp lệ' }
    ),

  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),

  description: z.string().max(1000, 'Mô tả không được quá 1000 ký tự').optional(),

  leadership_info_csv: z.string().optional().or(z.literal('')),

  hr_contact_info_csv: z.string().optional().or(z.literal('')),
})

export type BranchCreateFormData = z.infer<typeof branchCreateSchema>
