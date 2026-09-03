import { z } from 'zod'
import { EmployeeCommissionPayoutBatchWave } from '@/api/schema'

export const employeePayoutBatchFormSchema = z.object({
  period: z.date({
    required_error: 'Vui lòng chọn kỳ',
    invalid_type_error: 'Kỳ không hợp lệ',
  }),
  batch_date: z.any().refine((val) => val != null && val !== '', 'Vui lòng chọn ngày tạo đợt'),
  // `''` is the form's "tất cả các đợt" sentinel — it is dropped before the request is sent, so the
  // union keeps the field typed as the schema enum instead of a bare string.
  wave: z.union([z.nativeEnum(EmployeeCommissionPayoutBatchWave), z.literal('')]).optional(),
})

export type EmployeePayoutBatchFormValues = z.infer<typeof employeePayoutBatchFormSchema>
