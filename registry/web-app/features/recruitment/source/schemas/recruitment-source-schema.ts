import { z } from 'zod'

export const recruitmentSourceSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'Tên nguồn là bắt buộc').max(250, 'Tên nguồn không được quá 250 ký tự'),
  description: z.string().min(1, 'Mô tả là bắt buộc').max(500, 'Mô tả không được quá 500 ký tự'),
  allow_referral: z.boolean().optional(),
})

export type RecruitmentSourceFormData = z.infer<typeof recruitmentSourceSchema>
