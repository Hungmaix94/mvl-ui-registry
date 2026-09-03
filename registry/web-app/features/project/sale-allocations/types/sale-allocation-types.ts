import { z } from 'zod'
import {
  PatchedSalesAllocationRequestPhase,
  PatchedProductInventoryRequestProduct_type,
} from '@/api/schema'
import { ReconciliationSourceType } from '@/constants/api-schema-aliases'

const numericStringNumber = z.union([
  z.number(),
  z
    .string()
    .transform((val) => {
      if (!val) return null
      // Remove all commas
      const stripped = val.replace(/,/g, '')
      const num = Number(stripped)
      return isNaN(num) ? null : num
    })
    .nullable(),
])

// Zod schemas for nested models
export const targetConfigSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  type: z.string({ required_error: 'Vui lòng chọn loại Target' }),
  effective_from: z.date().nullish(), // Make date optional if not strictly tracked in UI yet
  effective_to: z.date().nullish(),
  target_quantity: z.union([z.number(), z.string().transform((val) => Number(val))]).nullish(),
  target_revenue: numericStringNumber.nullish(),
  note: z.string().nullish(),
})

export const timeBoundCommissionSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  category: z.string({ required_error: 'Vui lòng chọn loại' }),
  effective_from: z.date({ required_error: 'Vui lòng chọn ngày áp dụng' }),
  effective_to: z.date().nullish(),
  percentage: z.string().nullish(),
  fixed_amount: z.string().nullish(),
  note: z.string().nullish(),
})

export const commissionContributorSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  department_id: z
    .union([z.number(), z.string().transform((val) => (val === '' ? null : Number(val)))])
    .nullish(),
  contribution_level: numericStringNumber.nullish(), // Mức độ đóng góp
})

export const commissionRecipientSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  pct_type: z.string({ required_error: 'Vui lòng chọn diễn giải' }), // e.g., 'pct_relationship'
  pct_approved_revenue: numericStringNumber.nullish(), // Tỷ lệ in-house
  contributors: z.array(commissionContributorSchema).default([]),
})

export const salesAllocationStaffSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  employee_id: z.coerce
    .number({
      required_error: 'Vui lòng chọn nhân viên',
      invalid_type_error: 'Vui lòng chọn nhân viên',
    })
    .min(1, 'Vui lòng chọn nhân sự'),
  role: z.string({ required_error: 'Vui lòng chọn vai trò' }).min(1, 'Vui lòng chọn vai trò'),
  effective_from: z
    .union([z.date(), z.string()])
    .refine((val) => !!val, { message: 'Vui lòng chọn ngày áp dụng' }),
  effective_to: z.union([z.date(), z.string()]).nullish(),
  attachment_ids: z.array(z.number()).default([]),
  attachment_tokens: z.array(z.string()).default([]),
  attachments: z.array(z.any()).default([]),
  attachment_keep_ids: z.array(z.number()).default([]),
  employee_detail: z.any().optional(),
  _employee_name: z.string().optional(),
})

export const salesAllocationF2Schema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  exchange_id: z.coerce
    .number({
      required_error: 'Vui lòng chọn sàn liên kết',
      invalid_type_error: 'Vui lòng chọn sàn liên kết',
    })
    .min(1, 'Vui lòng chọn sàn liên kết'),
  note: z.string().nullish(),
})

// Main Form Schema
export const salesAllocationFormSchema = z.object({
  // Section 1: Thông tin dự án
  name: z
    .string({
      required_error: 'Vui lòng nhập tên thông tin bán hàng',
      invalid_type_error: 'Vui lòng nhập tên thông tin bán hàng',
    })
    .min(1, 'Vui lòng nhập tên thông tin bán hàng'),
  project_id: z.coerce
    .number({ required_error: 'Vui lòng chọn dự án', invalid_type_error: 'Vui lòng chọn dự án' })
    .min(1, 'Vui lòng chọn dự án'),

  source_type: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.nativeEnum(ReconciliationSourceType, {
      required_error: 'Vui lòng chọn nguồn nhập',
      invalid_type_error: 'Vui lòng chọn nguồn nhập',
    })
  ),

  source_exchange_id: z
    .union([z.number(), z.string().transform((val) => (val === '' ? null : Number(val)))])
    .nullish(),
  linked_exchange_id: z
    .union([z.number(), z.string().transform((val) => (val === '' ? null : Number(val)))])
    .nullish(),

  investor_id: z.coerce
    .number({
      required_error: 'Vui lòng chọn CĐT/Đại lý',
      invalid_type_error: 'Vui lòng chọn CĐT/Đại lý',
    })
    .min(1, 'Vui lòng chọn CĐT/Đại lý'),
  project_type: z.preprocess(
    (val) => (val === '' ? null : val),
    z.nativeEnum(PatchedProductInventoryRequestProduct_type).nullish()
  ),
  phase: z.preprocess(
    (val) => (val === '' ? null : val),
    z.nativeEnum(PatchedSalesAllocationRequestPhase).nullish()
  ),

  expected_avg_selling_price: numericStringNumber.nullish(),
  min_booking_amount: numericStringNumber.nullish(),
  min_deposit_amount: numericStringNumber.nullish(),

  // Default Percents / Amts (Top-level configuration default values)
  default_pct_agency_fee: numericStringNumber.nullish(),
  default_pct_sale_commission: numericStringNumber.nullish(),
  default_pct_investor_bonus: numericStringNumber.nullish(),

  default_pct_f2_commission: numericStringNumber.nullish(),
  default_pct_f2_bonus: numericStringNumber.nullish(),

  default_pct_revenue: numericStringNumber.nullish(),
  default_amt_revenue: numericStringNumber.nullish(),
  default_pct_mv_bonus_to_sale: numericStringNumber.nullish(),

  note: z.string().nullish(),
  attachment_ids: z.array(z.number()).default([]),
  attachment_tokens: z.array(z.string()).default([]),
  attachments: z.array(z.any()).default([]),

  // ==========================================
  // Commission Recipients (replaces Dept Contributions)
  // ==========================================
  pct_ceo: numericStringNumber.nullish(),
  pct_ceo_mv_paid: numericStringNumber.nullish(),
  pct_sales_director: numericStringNumber.nullish(),
  pct_sales_manager: numericStringNumber.nullish(),
  pct_project_director: numericStringNumber.nullish(),
  pct_project_secretary: numericStringNumber.nullish(),
  pct_relationship: numericStringNumber.nullish(),
  pct_planning: numericStringNumber.nullish(),
  pct_packaging: numericStringNumber.nullish(),
  pct_sales_support: numericStringNumber.nullish(),
  pct_coordination: numericStringNumber.nullish(),
})

export type SalesAllocationFormValues = z.infer<typeof salesAllocationFormSchema>
