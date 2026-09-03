import { z } from 'zod'
import {
  ContractTax_calculation_method,
  ContractNet_percentage,
  ContractInsurance_types,
} from '@/api/schema.ts'
import { ContractDurationType, EmployeeType } from '@/constants/api-schema-aliases'
export const CONTRACT_INSURANCE_TYPE_LABELS: Record<ContractInsurance_types, string> = {
  [ContractInsurance_types.social_insurance]: 'BHXH',
  [ContractInsurance_types.health_insurance]: 'BHYT',
  [ContractInsurance_types.unemployment_insurance]: 'BHTN',
  [ContractInsurance_types.accident_insurance]: 'BHTNLD-BNN',
  [ContractInsurance_types.union_fee]: 'Công đoàn',
}

export const contractSchema = z
  .object({
    employee_id: z
      .number({
        required_error: 'Nhân viên là bắt buộc',
        invalid_type_error: 'Nhân viên là bắt buộc',
      })
      .min(1, 'Vui lòng chọn nhân viên'),
    contract_type_id: z
      .number({ required_error: 'Loại hợp đồng là bắt buộc' })
      .min(1, 'Vui lòng chọn loại hợp đồng'),
    contract_number: z
      .string()
      .max(100, 'Số hợp đồng không được quá 100 ký tự')
      .optional()
      .or(z.literal('')),
    sign_date: z.string().min(1, 'Ngày ký là bắt buộc'),
    effective_date: z.string().min(1, 'Ngày hiệu lực là bắt buộc'),
    expiration_date: z.string().nullable().optional(),
    duration_type: z.nativeEnum(ContractDurationType, {
      required_error: 'Thời hạn hợp đồng là bắt buộc',
    }),
    contract_duration: z.string().optional(),
    annual_leave_days: z
      .string()
      .min(1, 'Số ngày nghỉ phép là bắt buộc')
      .max(2, 'Số ngày nghỉ phép không được quá 2 ký tự'),
    base_salary: z
      .number({ required_error: 'Mức lương cơ bản là bắt buộc' })
      .min(0, 'Mức lương cơ bản phải lớn hơn hoặc bằng 0'),
    kpi_salary: z.number().nullable().optional(),
    lunch_allowance: z.number().nullable().optional(),
    phone_allowance: z.number().nullable().optional(),
    other_allowance: z.number().nullable().optional(),
    tax_calculation_method: z.nativeEnum(ContractTax_calculation_method, {
      required_error: 'Cách tính thuế là bắt buộc',
    }),
    net_percentage: z.nativeEnum(ContractNet_percentage).optional(),
    employee_type: z.nativeEnum(EmployeeType).nullable().optional(),
    has_social_insurance: z.boolean({
      required_error: 'Bảo hiểm xã hội là bắt buộc',
    }),
    insurance_types: z.array(z.nativeEnum(ContractInsurance_types)).optional(),
    note: z.string().max(500, 'Ghi chú không được quá 500 ký tự').nullable().optional(),
    attachment: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate contract_duration when duration_type is fixed
    if (data.duration_type === ContractDurationType.fixed) {
      if (!data.contract_duration || data.contract_duration.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Thời hạn hợp đồng là bắt buộc khi chọn Xác định thời hạn',
          path: ['contract_duration'],
        })
      } else if (data.contract_duration.length > 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Thời hạn hợp đồng không được quá 2 ký tự',
          path: ['contract_duration'],
        })
      }
    }
  })

export type ContractFormData = z.infer<typeof contractSchema>
