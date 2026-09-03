import { z } from 'zod'

/**
 * Zod schema for department edit form validation
 *
 * Field names match API schema (snake_case):
 * - branch_id, block_id, function, is_main_department, management_department_id, leader_id
 */
export const departmentEditSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên phòng ban'),
  code: z.string().min(1, 'Mã phòng ban là bắt buộc'), // Readonly field in form
  branch_id: z
    .number()
    .nullable()
    .refine((val) => !isNaN(Number(val)), { message: 'Vui lòng chọn chi nhánh' }),
  block_id: z
    .number()
    .nullable()
    .refine((val) => val !== null && val > 0, { message: 'Vui lòng chọn khối' }),
  function: z
    .string()
    .nullable()
    .refine((val) => val !== null && val !== '', {
      message: 'Vui lòng chọn chức năng phòng ban',
    }),
  management_department_id: z.number().nullable().optional(),
  leader_id: z.number().nullable().optional(),
  description: z.string().optional(),
  is_main_department: z.boolean().optional(),
})

export type DepartmentEditFormData = z.infer<typeof departmentEditSchema>
