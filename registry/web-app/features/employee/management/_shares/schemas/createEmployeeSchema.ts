import { z } from 'zod'
import { EmployeeResignation_reason, EmployeeEthnicity } from '@/api/schema.ts'
import { parse, isValid } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { validateVietnamesePhone } from '@/utils/validation-utils'
import { MAX_CITIZEN_ID_FILES } from '@/features/hrm/_shares/citizen-id-files-payload.ts'
import {
  EmployeeCodeType,
  EmployeeStatus,
  EmployeeGender,
  EmployeeMaritalStatus,
} from '@/constants/api-schema-aliases'

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
const transformToApiDate = (value: string | Date): string => {
  const date = parseDateString(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const createEmployeeSchema = z.object({
  // Section 1: Thông tin nhân sự
  code_type: z.nativeEnum(EmployeeCodeType, {
    required_error: 'Chọn loại mã nhân viên',
  }),
  fullname: z
    .string({ required_error: 'Nhập họ và tên' })
    .min(1, 'Nhập họ và tên')
    .max(100, 'Họ và tên không được quá 100 ký tự'),
  attendance_code: z
    .string()
    .max(20, 'Mã chấm công không được quá 20 ký tự')
    .optional()
    .transform((v) => v ?? ''),
  username: z
    .string({ required_error: 'Nhập tài khoản đăng nhập' })
    .min(1, 'Nhập tài khoản đăng nhập')
    .max(50, 'Tài khoản đăng nhập không được quá 50 ký tự'),
  email: z
    .string({ required_error: 'Nhập email' })
    .email('Email không hợp lệ')
    .max(100, 'Email không được quá 100 ký tự'),
  branch_id: z.number({ required_error: 'Chọn chi nhánh' }).min(1, 'Chọn chi nhánh'),
  block_id: z.number({ required_error: 'Chọn khối' }).min(1, 'Chọn khối'),
  department_id: z.number({ required_error: 'Chọn phòng ban' }).min(1, 'Chọn phòng ban'),
  position_id: z.number().optional(),
  status: z.nativeEnum(EmployeeStatus).optional(),
  start_date: z
    .union([z.date(), z.string()])
    .transform(transformToApiDate)
    .refine(
      (value) => {
        const date = new Date(value)
        return !isNaN(date.getTime())
      },
      {
        message: 'Vui lòng chọn ngày bắt đầu hợp lệ',
      }
    ),
  resignation_reason: z.nativeEnum(EmployeeResignation_reason).optional(),
  handover_completed: z.boolean().optional(),
  note: z.string().max(500, 'Ghi chú không được quá 500 ký tự').optional(),
  // Section 2: Thông tin bổ sung
  date_of_birth: z
    .custom<Date | string | null | undefined>(
      (val) => {
        // Required validation: must have a value
        if (val === null || val === undefined || val === '') {
          return false
        }
        return true
      },
      {
        message: 'Vui lòng chọn ngày sinh hợp lệ',
      }
    )
    .transform((value) => {
      if (!value || value === null || value === undefined || value === '') return ''
      return transformToApiDate(value)
    })
    .refine(
      (value) => {
        if (!value || value === '') return true // Allow empty after transform
        const date = new Date(value)
        return !isNaN(date.getTime())
      },
      {
        message: 'Vui lòng chọn ngày sinh hợp lệ',
      }
    ),
  gender: z.nativeEnum(EmployeeGender, {
    required_error: 'Chọn giới tính',
  }),
  marital_status: z.nativeEnum(EmployeeMaritalStatus, {
    required_error: 'Chọn tình trạng hôn nhân',
  }),
  ethnicity: z.preprocess(
    (val) => (val === '' || val == null ? undefined : val),
    z.nativeEnum(EmployeeEthnicity).optional()
  ),
  religion: z.string().max(100, 'Tôn giáo không được quá 100 ký tự').optional(),
  nationality_id: z.number().optional(),
  citizen_id: z
    .string({ required_error: 'Nhập số CMND/CCCD' })
    .min(1, 'Nhập số CMND/CCCD')
    .max(20, 'Số CMND/CCCD không được quá 20 ký tự'),
  citizen_id_issued_date: z
    .union([z.date(), z.string()])
    .optional()
    .transform((value) => {
      if (!value) return undefined
      return transformToApiDate(value)
    })
    .refine(
      (value) => {
        if (!value) return true
        const date = new Date(value)
        return !isNaN(date.getTime())
      },
      {
        message: 'Vui lòng chọn ngày cấp hợp lệ',
      }
    ),
  citizen_id_issued_place: z.string().max(100, 'Nơi cấp không được quá 100 ký tự').optional(),
  citizen_id_files_ids: z
    .array(z.union([z.string(), z.number()]))
    .max(MAX_CITIZEN_ID_FILES, `Tối đa ${MAX_CITIZEN_ID_FILES} ảnh CMND/CCCD`)
    .optional(),
  phone: z
    .string({ required_error: 'Nhập số điện thoại' })
    .min(1, 'Nhập số điện thoại')
    .refine((val) => validateVietnamesePhone(val) === true, {
      message: 'Số điện thoại không hợp lệ',
    }),
  personal_email: z
    .string({ required_error: 'Nhập email cá nhân' })
    .email('Email cá nhân không hợp lệ')
    .max(100, 'Email cá nhân không được quá 100 ký tự'),
  tax_code: z.string().max(12, 'Mã số thuế không được quá 12 ký tự').optional(),
  place_of_birth: z.string().max(100, 'Nơi sinh không được quá 100 ký tự').optional(),
  residential_address: z.string().max(255, 'Địa chỉ cư trú không được quá 255 ký tự').optional(),
  permanent_address: z.string().max(255, 'Địa chỉ thường trú không được quá 255 ký tự').optional(),

  // Section 3: Thông tin liên hệ khẩn cấp
  emergency_contact_name: z
    .string()
    .max(100, 'Họ tên người liên hệ khẩn cấp không được quá 100 ký tự')
    .optional(),
  emergency_contact_phone: z
    .string()
    .optional()
    .refine((val) => validateVietnamesePhone(val || '') === true, {
      message: 'Số điện thoại không hợp lệ',
    }),
  profile_attachments: z
    .array(z.union([z.number(), z.string()]))
    .max(3, 'Tối đa 3 tệp đính kèm')
    .optional(),
})

// Input type for form (before transform)
export type CreateEmployeeFormInput = z.input<typeof createEmployeeSchema>
// Output type for API (after transform)
export type CreateEmployeeFormData = z.output<typeof createEmployeeSchema>
