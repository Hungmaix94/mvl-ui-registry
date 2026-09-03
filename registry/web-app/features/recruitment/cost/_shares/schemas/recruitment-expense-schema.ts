import { z } from 'zod'
import { parse, isValid } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { RecruitmentExpensePaymentStatus } from '@/constants/api-schema-aliases'
export const recruitmentExpenseSchema = z.object({
  date: z
    .string({ required_error: 'Ngày là bắt buộc' })
    .min(1, 'Ngày là bắt buộc')
    .refine(
      (val) => {
        const parsed = parse(val, DATE_FORMAT, new Date())
        return isValid(parsed)
      },
      { message: 'Ngày không hợp lệ' }
    ),
  recruitment_source_id: z.coerce
    .number({ invalid_type_error: 'Nguồn tuyển dụng không được để trống' })
    .min(1, 'Nguồn tuyển dụng không được để trống'),
  recruitment_channel_id: z.coerce
    .number({ invalid_type_error: 'Kênh tuyển dụng không được để trống' })
    .min(1, 'Kênh tuyển dụng không được để trống'),
  branch_id: z.coerce
    .number({ invalid_type_error: 'Chi nhánh không được để trống' })
    .min(1, 'Chi nhánh không được để trống'),
  total_cost: z.coerce
    .number({ invalid_type_error: 'Tổng chi phí không được để trống' })
    .min(0, 'Tổng chi phí phải là số hợp lệ và lớn hơn hoặc bằng 0'),
  referee_id: z.coerce.number().optional().nullable(),
  referrer_id: z.coerce.number().optional().nullable(),
  payer_id: z.coerce.number().optional().nullable(),
  payment_status: z.nativeEnum(RecruitmentExpensePaymentStatus).optional().nullable(),
  activity: z.string().max(1000, 'Hoạt động không được quá 1000 ký tự').optional(),
  note: z.string().max(500, 'Ghi chú không được quá 500 ký tự').optional(),
})

export type RecruitmentExpenseFormData = z.infer<typeof recruitmentExpenseSchema>
