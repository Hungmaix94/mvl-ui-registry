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

// Helper function to transform required date to API format (always returns string)
const transformRequiredDateToApi = (value: string | Date): string => {
  const date = parseDateString(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Zod schema for dependent create form validation
 *
 * Field names match API schema (snake_case):
 * - employee_id (not employee)
 */
export const dependentCreateSchema = z.object({
  // Section 1: Thông tin nhân viên
  employee_id: z.coerce.number({ required_error: 'Chọn nhân viên' }).min(1, 'Chọn nhân viên'),

  // Section 2: Thông tin Người phụ thuộc
  dependent_name: z
    .string({ required_error: 'Nhập tên người phụ thuộc' })
    .min(1, 'Nhập tên người phụ thuộc')
    .max(100, 'Tên người phụ thuộc không được quá 100 ký tự'),
  relationship: z.nativeEnum(EmployeeDependentRelationship, {
    required_error: 'Chọn mối quan hệ',
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
  tax_code: z.string().max(12, 'Mã số thuế không được quá 12 ký tự').optional(),
  effective_date: z
    .union([z.date(), z.string()])
    .refine(
      (value) => {
        if (!value || value === '' || (typeof value === 'string' && value.trim() === '')) {
          return false
        }
        return true
      },
      {
        message: 'Ngày hiệu lực là bắt buộc',
      }
    )
    .transform((value) => {
      // Since we validated it's not empty above, value is guaranteed to be string | Date
      return transformRequiredDateToApi(value)
    })
    .refine(
      (value) => {
        const date = new Date(value)
        return !isNaN(date.getTime())
      },
      {
        message: 'Vui lòng chọn ngày hiệu lực hợp lệ',
      }
    ),
  note: z.string().max(500, 'Ghi chú không được quá 500 ký tự').optional(),

  // Section 3: Tài liệu đính kèm
  attachment: z.string().optional(), // file_token from FileUpload
})

// Input type for form (before transform)
export type DependentCreateFormInput = z.input<typeof dependentCreateSchema>
// Output type for API (after transform)
export type DependentCreateFormData = z.output<typeof dependentCreateSchema>
