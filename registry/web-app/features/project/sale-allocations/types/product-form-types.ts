import { z } from 'zod'
import { AllocationType, ProductType, PromotionCommissionType } from './product'

// ============================================
// Tab 1: Thông tin chung form schema
// Tab 2: Cơ cấu hoa hồng form schema
// Matches SRS UC XVII.4.2 field definitions
// ============================================

export const promotionEmployeeAmountSchema = z.object({
  employee_id: z.coerce.number({ required_error: 'Nhân viên không được để trống' }),
  contribution_rate: z.coerce
    .number({ required_error: 'Mức độ đóng góp không được để trống' })
    .min(0, 'Mức độ đóng góp phải >= 0')
    .max(100, 'Mức độ đóng góp phải <= 100'),
})

export const promotionCommissionSchema = z
  .object({
    type: z.nativeEnum(PromotionCommissionType),
    percent: z.coerce
      .number({ required_error: 'Phần trăm không được để trống' })
      .min(0, 'Phần trăm phải >= 0')
      .max(100, 'Phần trăm phải <= 100'),
    allocation_type: z.nativeEnum(AllocationType),
    department_id: z.number().optional(),
    employees: z.array(promotionEmployeeAmountSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.allocation_type === AllocationType.DEPARTMENT && !data.department_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Phòng ban không được để trống',
        path: ['department_id'],
      })
    }
    if (data.allocation_type === AllocationType.PERSON) {
      if (!data.employees || data.employees.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Phải chọn ít nhất 1 nhân viên',
          path: ['employees'],
        })
      } else {
        const totalContribution = data.employees.reduce(
          (sum, e) => sum + (e.contribution_rate || 0),
          0
        )
        if (totalContribution > 100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Tổng mức độ đóng góp không được vượt quá 100%',
            path: ['employees'], // We attach error to the array
          })
        }
      }
    }
  })

export const productFormSchema = z.object({
  // Tab 1 fields
  source: z.string().optional(),
  source_info_id: z.number().optional(),
  investor_id: z.coerce.number({ required_error: 'Vui lòng chọn chủ đầu tư' }),
  project_id: z.number({ required_error: 'Vui lòng chọn dự án' }),
  code: z.string().min(1, 'Mã thông tin bán hàng không được để trống'),
  product_type: z.nativeEnum(ProductType, { required_error: 'Vui lòng chọn loại sản phẩm' }),
  building: z.string().min(1, 'Tòa không được để trống'),
  product_number: z.string().min(1, 'Số hiệu sản phẩm không được để trống'),
  area: z.number().optional(),
  price: z.number().optional(),
  listed_price: z.number().optional(),
  fee_price: z.number().optional(),
  sale_commission_rate: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),

  // Tab 2 fields
  project_director_id: z.coerce.number().optional(),
  project_secretary_id: z.coerce.number().optional(),

  // Fixed percentages (Section 2)
  agency_fee_rate: z.number().min(0).max(100).optional(),
  revenue_rate: z.number().min(0).max(100).optional(),
  f2_commission_rate: z.number().min(0).max(100).optional(),
  general_director_rate: z.number().min(0).max(100).optional(),
  sales_director_rate: z.number().min(0).max(100).optional(),
  sales_manager_rate: z.number().min(0).max(100).optional(),
  project_director_rate: z.number().min(0).max(100).optional(),
  project_secretary_rate: z.number().min(0).max(100).optional(),
})

export type SaleAllocationDetailFormValues = z.infer<typeof productFormSchema>
