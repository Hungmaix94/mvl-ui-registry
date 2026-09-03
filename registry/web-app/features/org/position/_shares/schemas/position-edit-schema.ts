import { z } from 'zod'

/**
 * Zod schema for position edit form validation
 *
 * Field names match API schema (snake_case):
 * - include_in_employee_report (API field name, not include_in_hr_report)
 */
export const positionEditSchema = z.object({
  code: z.string().min(1, 'Mã chức vụ là bắt buộc'), // Disabled field in form

  name: z
    .string()
    .min(1, 'Tên chức vụ là bắt buộc')
    .max(255, 'Tên chức vụ không được quá 255 ký tự'),

  is_leadership: z.boolean(),

  include_in_employee_report: z.boolean({
    required_error: 'Tính vào báo cáo nhân sự là bắt buộc',
  }),

  description: z.string().max(1000, 'Mô tả không được quá 1000 ký tự').optional(),
})

export type PositionEditFormData = z.infer<typeof positionEditSchema>
