import { z } from 'zod'

export const productInventoryFormSchema = z.object({
  sales_allocation_id: z.coerce.number({
    required_error: 'Vui lòng chọn thông tin bán hàng',
    invalid_type_error: 'Thông tin bán hàng không hợp lệ',
  }),
  distribution_exchange_id: z.coerce
    .number({ invalid_type_error: 'Sàn liên kết không hợp lệ' })
    .nullable()
    .optional(),
  investor_id: z.coerce.number({
    required_error: 'Vui lòng chọn chủ đầu tư',
    invalid_type_error: 'Vui lòng chọn chủ đầu tư',
  }),
  project_id: z.coerce.number({
    required_error: 'Vui lòng chọn dự án',
    invalid_type_error: 'Vui lòng chọn dự án',
  }),
  product_type: z.string({
    required_error: 'Vui lòng chọn loại sản phẩm',
    invalid_type_error: 'Vui lòng chọn loại sản phẩm',
  }),
  tower: z.string().optional().nullable(),
  unit_number: z
    .string({
      required_error: 'Vui lòng nhập Mã bất động sản',
      invalid_type_error: 'Vui lòng nhập Mã bất động sản',
    })
    .min(1, 'Vui lòng nhập Mã bất động sản'),
  area: z
    .union([z.string(), z.number()])
    .refine(
      (val) => {
        if (val === '') return true
        const parsed = typeof val === 'string' ? Number(val.replace(/,/g, '.')) : val
        return !isNaN(parsed)
      },
      { message: 'Diện tích không hợp lệ' }
    )
    .optional()
    .nullable(),
  price_per_sqm: z.coerce
    .number({ invalid_type_error: 'Giá mỗi m2 không hợp lệ' })
    .optional()
    .nullable(),
  listed_price: z.coerce.number({
    required_error: 'Vui lòng nhập Giá niêm yết',
    invalid_type_error: 'Vui lòng nhập Giá niêm yết',
  }),
  fee_calculation_price: z.coerce.number({
    required_error: 'Vui lòng nhập Giá tạm tính',
    invalid_type_error: 'Vui lòng nhập Giá tạm tính',
  }),
  status: z.string().optional(),

  // Khác
  note: z.string().optional(),
  attachment_ids: z.array(z.number()).optional(),
  files: z.any().optional(),
})

export type ProductInventoryFormValues = z.infer<typeof productInventoryFormSchema>
