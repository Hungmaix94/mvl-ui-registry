import { z } from 'zod'
import { RecoveryVoucherType } from '@/constants/api-schema-aliases'
export const recoveryVoucherSchema = z.object({
  employee_id: z.coerce
    .number({ invalid_type_error: 'Nhân viên không được để trống' })
    .min(1, 'Nhân viên không được để trống'),
  name: z
    .string({ required_error: 'Tên phiếu là bắt buộc' })
    .min(1, 'Tên phiếu là bắt buộc')
    .max(255, 'Tên phiếu không được quá 255 ký tự'),
  voucher_type: z.nativeEnum(RecoveryVoucherType, {
    required_error: 'Loại phiếu là bắt buộc',
    invalid_type_error: 'Loại phiếu không hợp lệ',
  }),
  amount: z.coerce
    .number({ invalid_type_error: 'Số tiền phải là số' })
    .min(0, 'Số tiền phải lớn hơn hoặc bằng 0'),
  month: z.date().optional(),
  note: z.string().max(1000, 'Ghi chú không được quá 1000 ký tự').optional(),
})

export type RecoveryVoucherFormData = z.infer<typeof recoveryVoucherSchema>
