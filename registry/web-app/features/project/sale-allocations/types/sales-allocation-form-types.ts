import * as z from 'zod'

// 1. Nested Array Schemas
export const salesAllocationStaffSchema = z.object({
  employee_id: z.number({ required_error: 'Vui lòng chọn nhân sự' }),
  role: z.string({ required_error: 'Vui lòng chọn vai trò' }),
  effective_from: z.date({ required_error: 'Vui lòng chọn ngày bắt đầu hiệu lực' }),
  effective_to: z.date().optional().nullable(),
})

export const salesAllocationF2Schema = z.object({
  exchange_id: z.number({ required_error: 'Vui lòng chọn sàn liên kết' }),
  note: z.string().optional().nullable(),
})

export const timeBoundCommissionSchema = z.object({
  category: z.string({ required_error: 'Vui lòng chọn loại hoa hồng' }),
  effective_from: z.date({ required_error: 'Vui lòng chọn ngày bắt đầu hiệu lực' }),
  effective_to: z.date().optional().nullable(),
  percentage: z.number().optional().nullable(),
  fixed_amount: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
})

export const deptContributionSchema = z.object({
  category: z.string({ required_error: 'Vui lòng chọn hạng mục' }),
  pct_approved_revenue: z.number().optional().nullable(),
  contribution_level: z.number().optional().nullable(),
  pct_actual: z.number().optional().nullable(),
  department_id: z.number().optional().nullable(),
})

export const targetConfigSchema = z.object({
  id: z.number().optional().nullable(),
  exchange_id: z.number({ required_error: 'Vui lòng chọn sàn liên kết' }).optional().nullable(),
  exchange_name: z.string().optional().nullable(),

  effective_from: z.string().or(z.date()).nullish(),
  effective_to: z.string().or(z.date()).nullish(),

  type: z.string().optional().nullable(),
  target_quantity: z.number().optional().nullable(),
  target_revenue: z.number().optional().nullable(),
  note: z.string().optional().nullable(),

  is_achieved: z.boolean().default(false).optional().nullable(),
  achieved_date: z.date().optional().nullable(),
})

// 2. Main Sales Allocation Schema
export const salesAllocationFormSchema = z
  .object({
    // Basic Info
    name: z.string().min(1, 'Tên thông tin bán hàng không được để trống'),
    project_id: z.number({ required_error: 'Vui lòng chọn Dự án' }),
    source_type: z.enum(['direct', 'F0'], { required_error: 'Vui lòng chọn Nguồn gốc' }),
    source_exchange_id: z.number().optional().nullable(),
    investor_id: z.number({ required_error: 'Vui lòng chọn Chủ đầu tư' }),
    project_type: z.string().optional().nullable(),
    phase: z.string({ required_error: 'Vui lòng chọn Giai đoạn' }),
    expected_avg_selling_price: z.number().optional().nullable(),

    // Commission Base Rates
    pct_agency_fee: z.number().optional().nullable(),
    pct_sale_commission: z.number().optional().nullable(),
    pct_revenue: z.number().optional().nullable(),
    pct_agency_fee_no_vat: z.number().optional().nullable(),
    pct_sale_commission_no_vat: z.number().optional().nullable(),
    pct_revenue_no_vat: z.number().optional().nullable(),

    // Management Commission
    pct_ceo: z.number().optional().nullable(),
    amt_ceo: z.number().optional().nullable(),
    pct_ceo_mv_paid: z.number().optional().nullable(),
    amt_ceo_mv_paid: z.number().optional().nullable(),
    pct_sales_director: z.number().optional().nullable(),
    amt_sales_director: z.number().optional().nullable(),
    pct_sales_manager: z.number().optional().nullable(),
    amt_sales_manager: z.number().optional().nullable(),
    pct_project_director: z.number().optional().nullable(),
    amt_project_director: z.number().optional().nullable(),
    pct_project_secretary: z.number().optional().nullable(),
    amt_project_secretary: z.number().optional().nullable(),

    // Department Contribution Split
    pct_relationship: z.number().optional().nullable(),
    pct_planning: z.number().optional().nullable(),
    pct_packaging: z.number().optional().nullable(),
    pct_sales_support: z.number().optional().nullable(),
    pct_coordination: z.number().optional().nullable(),

    // Limits & Rules
    min_booking_amount: z.number().optional().nullable(),
    min_deposit_amount: z.number().optional().nullable(),

    // Notes
    note: z.string().optional().nullable(),

    // Arrays
    staff_assignments: z.array(salesAllocationStaffSchema).default([]),
    f2_links: z.array(salesAllocationF2Schema).default([]),
    time_bound_commissions: z.array(timeBoundCommissionSchema).default([]),
    dept_contributions: z.array(deptContributionSchema).default([]),
    targets: z.array(targetConfigSchema).default([]),

    attachment_tokens: z.array(z.string()).default([]),
    attachment_ids: z.array(z.number()).default([]),
    attachments: z.array(z.any()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.source_type === 'F0' && !data.source_exchange_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sàn F0 không được để trống khi nguồn gốc là Gián tiếp qua F0',
        path: ['source_exchange_id'],
      })
    }
  })

// Infer types
export type SalesAllocationStaffFormData = z.infer<typeof salesAllocationStaffSchema>
export type SalesAllocationF2FormData = z.infer<typeof salesAllocationF2Schema>
export type TimeBoundCommissionFormData = z.infer<typeof timeBoundCommissionSchema>
export type DeptContributionFormData = z.infer<typeof deptContributionSchema>
export type TargetConfigFormData = z.infer<typeof targetConfigSchema>
export type SalesAllocationFormValues = z.infer<typeof salesAllocationFormSchema>
