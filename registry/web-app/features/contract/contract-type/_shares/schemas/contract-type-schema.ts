import { z } from 'zod'
import { ContractTax_calculation_method, ContractNet_percentage } from '@/api/schema.ts'
import {
  ContractDurationType,
  ContractWorkingTimeType,
  EmployeeType,
} from '@/constants/api-schema-aliases'
// Utility function to strip HTML tags and get plain text length
const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').trim()
}

export const contractTypeSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Tên loại hợp đồng là bắt buộc')
      .max(100, 'Tên loại hợp đồng không được quá 100 ký tự'),
    symbol: z
      .string()
      .min(1, 'Ký hiệu loại hợp đồng là bắt buộc')
      .max(20, 'Ký hiệu loại hợp đồng không được quá 20 ký tự'),
    base_salary: z
      .number()
      .min(0, 'Mức lương cơ bản phải lớn hơn hoặc bằng 0')
      .nullable()
      .optional(),
    duration_type: z.nativeEnum(ContractDurationType, {
      required_error: 'Thời hạn hợp đồng là bắt buộc',
    }),
    duration_months: z.number().nullable().optional(),
    annual_leave_days: z
      .number({ required_error: 'Số ngày nghỉ phép là bắt buộc' })
      .min(0, 'Số ngày nghỉ phép phải lớn hơn hoặc bằng 0')
      .max(12, 'Số ngày nghỉ phép không được lớn hơn 12'),
    tax_calculation_method: z.nativeEnum(ContractTax_calculation_method, {
      required_error: 'Cách tính thuế là bắt buộc',
    }),
    has_social_insurance: z.boolean({
      required_error: 'Bảo hiểm xã hội là bắt buộc',
    }),
    requires_intern_evaluation: z.boolean(),
    working_time_type: z.nativeEnum(ContractWorkingTimeType, {
      required_error: 'Thời gian làm việc là bắt buộc',
    }),
    employee_type: z.nativeEnum(EmployeeType).nullable().optional(),
    is_active: z.boolean().optional(),
    lunch_allowance: z.number().nullable().optional(),
    phone_allowance: z.number().nullable().optional(),
    other_allowance: z.number().nullable().optional(),
    net_percentage: z.nativeEnum(ContractNet_percentage, {
      required_error: 'Phần trăm lương thực nhận trong thời gian thử việc là bắt buộc',
    }),
    working_conditions: z
      .string()
      .min(1, 'Chế độ làm việc là bắt buộc')
      .refine(
        (val) => stripHtmlTags(val).length <= 1000,
        'Chế độ làm việc không được quá 1000 ký tự'
      ),
    rights_and_obligations: z
      .string()
      .min(1, 'Quyền và nghĩa vụ các bên là bắt buộc')
      .refine(
        (val) => stripHtmlTags(val).length <= 5000,
        'Quyền và nghĩa vụ các bên không được quá 5000 ký tự'
      ),
    terms: z
      .string()
      .min(1, 'Điều khoản là bắt buộc')
      .refine((val) => stripHtmlTags(val).length <= 5000, 'Điều khoản không được quá 5000 ký tự'),
    note: z.string().max(500, 'Ghi chú không được quá 500 ký tự').nullable().optional(),
    template_file: z.string().optional(),
  })
  .refine(
    (data) => {
      // If duration_type is 'fixed', duration_months is required
      if (data.duration_type === ContractDurationType.fixed) {
        return data.duration_months !== null && data.duration_months !== undefined
      }
      return true
    },
    {
      message: 'Thời hạn hợp đồng (tháng) là bắt buộc khi chọn "Xác định thời hạn"',
      path: ['duration_months'],
    }
  )
  // Loại nhân viên bắt buộc, TRỪ khi loại hợp đồng đang bị vô hiệu hoá
  // (để hỗ trợ loại hợp đồng cũ không map được với loại nhân viên nào)
  .refine((data) => data.is_active === false || data.employee_type != null, {
    message: 'Loại nhân viên là bắt buộc',
    path: ['employee_type'],
  })

export type ContractTypeFormData = z.infer<typeof contractTypeSchema>
