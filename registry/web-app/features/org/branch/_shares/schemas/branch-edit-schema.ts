import { z } from 'zod'
import { validateVietnamesePhone } from '@/utils/validation-utils.ts'

/**
 * Zod schema for branch edit form validation
 *
 * Field names match API schema (snake_case):
 * - province_id, administrative_unit_id (ward)
 */
export const branchEditSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên chi nhánh là bắt buộc')
    .max(255, 'Tên chi nhánh không được quá 255 ký tự'),

  code: z.string().min(1, 'Mã chi nhánh là bắt buộc'), // Readonly field in form

  address: z
    .string()
    .min(1, 'Địa chỉ đường phố là bắt buộc')
    .max(500, 'Địa chỉ không được quá 500 ký tự'),

  province_id: z.coerce
    .number({
      required_error: 'Tỉnh là bắt buộc',
      invalid_type_error: 'Tỉnh là bắt buộc',
    })
    .min(1, 'Tỉnh là bắt buộc'),

  administrative_unit_id: z.coerce
    .number({
      required_error: 'Phường/Xã là bắt buộc',
      invalid_type_error: 'Phường/Xã là bắt buộc',
    })
    .min(1, 'Phường/Xã là bắt buộc'),

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

export type BranchEditFormData = z.infer<typeof branchEditSchema>
