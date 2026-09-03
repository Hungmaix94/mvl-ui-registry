import { z } from 'zod'

export const transactionSaleFormSchema = z.object({
  id: z.number().optional(),
  sale_type: z.enum(['mv', 'partner', 'collaborator'], {
    required_error: 'Vui lòng chọn loại nhân sự',
  }),
  employee: z.number().nullable().optional(), // use employee_id
  exchange: z.number().nullable().optional(), // use exchange_id
  collaborator: z.number().nullable().optional(), // use collaborator_id
  employee_detail: z.any().optional(),
  exchange_detail: z.any().optional(),
  collaborator_detail: z.any().optional(),
  full_name: z.string().optional(),
  percentage: z
    .number({
      invalid_type_error: 'Vui lòng nhập số',
      required_error: 'Vui lòng nhập tỷ lệ',
    })
    .min(0, 'Tỷ lệ phải lớn hơn hoặc bằng 0')
    .max(100, 'Tỷ lệ không được vượt quá 100'),
})

export type TransactionSaleFormValues = z.infer<typeof transactionSaleFormSchema>

export const transactionSheetFormSchema = z
  .object({
    deposit_contract: z.number({ required_error: 'Vui lòng chọn Hợp đồng đặt cọc' }),
    customer: z.number({ required_error: 'Vui lòng chọn Khách hàng' }),
    fee_calculation_price: z.number().optional(),
    pct_revenue: z.number().optional(),
    purchase_contract_date: z
      .union([z.date({ invalid_type_error: 'Ngày ký HĐMB dự kiến không hợp lệ' }), z.string()])
      .nullable()
      .optional(),
    note: z.string().optional(),
    sales_staff: z.array(transactionSaleFormSchema).nonempty('Phải có ít nhất 1 nhân sự bán hàng'),
    attachments: z.array(z.any()).optional().default([]),
    kept_attachment_ids: z.array(z.number()).optional(),
    attachments_detail: z.any().array().optional(),
  })
  .refine(
    (data) => {
      const totalPercentage = data.sales_staff.reduce(
        (acc, curr) => acc + (curr.percentage || 0),
        0
      )
      return totalPercentage <= 100
    },
    {
      message: 'Tổng tỷ lệ hoa hồng dự kiến không được vượt quá 100%',
      path: ['sales_staff'],
    }
  )

export type TransactionSheetFormValues = z.infer<typeof transactionSheetFormSchema>
