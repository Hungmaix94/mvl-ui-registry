import { z } from 'zod'
import { validateVietnamesePhone } from '@/utils/validation-utils.ts'

export const branchContactInfoSchema = z.object({
  business_line: z
    .string()
    .min(1, 'Chưa nhập nghiệp vụ')
    .max(50, 'Nghiệp vụ không được quá 50 ký tự'),

  name: z
    .string()
    .min(1, 'Chưa nhập người liên hệ')
    .max(50, 'Người liên hệ không được quá 50 ký tự'),

  phone_number: z
    .string()
    .min(1, 'Chưa nhập số điện thoại')
    .max(10, 'Số điện thoại không được quá 10 ký tự')
    .refine((val) => validateVietnamesePhone(val) === true, {
      message: 'Số điện thoại không hợp lệ',
    }),

  email: z
    .string()
    .min(1, 'Chưa nhập email')
    .email('Email không hợp lệ')
    .max(50, 'Email không được quá 50 ký tự'),
})

export type BranchContactInfoFormData = z.infer<typeof branchContactInfoSchema>
