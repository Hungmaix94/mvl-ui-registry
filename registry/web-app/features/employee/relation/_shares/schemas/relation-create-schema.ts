import { z } from 'zod'
import { parse, isValid } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { EmployeeDependentRelationship } from '@/api/schema.ts'

// Helper function to parse date string in dd/MM/yyyy or YYYY-MM-DD format
const parseDateString = (value: string | Date): Date => {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    // Try dd/MM/yyyy format first (from DatePicker)
    let parsed = parse(value, DATE_FORMAT, new Date())
    if (isValid(parsed)) return parsed

    // Try YYYY-MM-DD format (from defaultValues)
    parsed = parse(value, 'yyyy-MM-dd', new Date())
    if (isValid(parsed)) return parsed
  }
  throw new Error('Invalid date format')
}

// Helper function to transform date to API format
const transformToApiDate = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  const date = parseDateString(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Zod schema for relation create form validation
 *
 * Field names match API schema (snake_case):
 * - employee_id (not employee)
 */
export const relationCreateSchema = z.object({
  // Section 1: Thông tin nhân viên
  employee_id: z.coerce
    .number({
      required_error: 'Chọn nhân viên',
      invalid_type_error: 'Chọn nhân viên',
    })
    .min(1, 'Chọn nhân viên'),

  // Section 2: Thông tin Quan hệ nhân thân
  relative_name: z
    .string({ required_error: 'Nhập tên người thân' })
    .min(1, 'Nhập tên người thân')
    .max(100, 'Tên người thân không được quá 100 ký tự'),
  relation_type: z
    .nativeEnum(EmployeeDependentRelationship, {
      required_error: 'Chọn mối quan hệ',
      invalid_type_error: 'Chọn mối quan hệ',
    })
    .refine((value) => value !== null && value !== undefined, {
      message: 'Chọn mối quan hệ',
    }),
  date_of_birth: z
    .union([z.date(), z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (!value) return null
      return transformToApiDate(value)
    })
    .refine(
      (value) => {
        if (!value || value === null) return true
        const date = new Date(value)
        return !isNaN(date.getTime())
      },
      {
        message: 'Vui lòng chọn ngày sinh hợp lệ',
      }
    ),
  citizen_id: z
    .string()
    .max(12, 'Số CMND/CCCD/Giấy khai sinh không được quá 12 ký tự')
    .optional()
    .refine(
      (value) => {
        if (!value || value === '') return true
        // Validate 9 or 12 digits
        const digitsOnly = value.replace(/\D/g, '')
        return digitsOnly.length === 9 || digitsOnly.length === 12
      },
      {
        message: 'Số CMND/CCCD/Giấy khai sinh phải có 9 hoặc 12 chữ số',
      }
    ),
  occupation: z.string().max(100, 'Nghề nghiệp không được quá 100 ký tự').optional(),
  tax_code: z.string().max(20, 'Mã số thuế không được quá 20 ký tự').optional(),
  phone: z
    .string()
    .max(10, 'Số điện thoại không được quá 10 ký tự')
    .optional()
    .refine(
      (value) => {
        if (!value || value === '') return true
        // Validate digits only
        const digitsOnly = value.replace(/\D/g, '')
        return digitsOnly.length <= 10
      },
      {
        message: 'Số điện thoại chỉ được chứa số',
      }
    ),
  address: z.string().max(100, 'Địa chỉ không được quá 100 ký tự').optional(),
  note: z.string().max(500, 'Ghi chú không được quá 500 ký tự').optional(),

  // Section 3: Tài liệu đính kèm
  attachment: z.string().optional(), // file_token from FileUpload
})

// Input type for form (before transform)
export type RelationCreateFormInput = z.input<typeof relationCreateSchema>
// Output type for API (after transform)
export type RelationCreateFormData = z.output<typeof relationCreateSchema>
