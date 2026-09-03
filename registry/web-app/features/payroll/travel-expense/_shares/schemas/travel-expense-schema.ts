import { z } from 'zod'
import { TravelExpenseType } from '@/constants/api-schema-aliases'
export const travelExpenseSchema = z.object({
  employee_id: z.coerce
    .number({ invalid_type_error: 'Nhân viên không được để trống' })
    .min(1, 'Nhân viên không được để trống'),
  name: z
    .string({ required_error: 'Tên chi phí là bắt buộc' })
    .min(1, 'Tên chi phí là bắt buộc')
    .max(255, 'Tên chi phí không được quá 255 ký tự'),
  expense_type: z.nativeEnum(TravelExpenseType, {
    required_error: 'Loại chi phí là bắt buộc',
    invalid_type_error: 'Loại chi phí không hợp lệ',
  }),
  amount: z.coerce
    .number({ invalid_type_error: 'Số tiền phải là số' })
    .min(0, 'Số tiền phải lớn hơn hoặc bằng 0'),
  month: z.date({ required_error: 'Tháng là bắt buộc' }),
  note: z.string().max(1000, 'Ghi chú không được quá 1000 ký tự').optional(),
})

export type TravelExpenseFormData = z.infer<typeof travelExpenseSchema>
