import { z } from 'zod'
import { RecruitmentChannelBelongTo } from '@/constants/api-schema-aliases'
/**
 * Zod schema for recruitment channel edit form validation
 *
 * This schema defines validation rules for editing recruitment channel information
 * including field length limits and required validations.
 */
export const recruitmentChannelEditSchema = z.object({
  code: z.string(), // Readonly field in form, không validate

  name: z.string().min(1, 'Tên kênh là bắt buộc').max(250, 'Tên kênh không được quá 250 ký tự'),

  belong_to: z.nativeEnum(RecruitmentChannelBelongTo).optional(),

  description: z.string().min(1, 'Mô tả là bắt buộc').max(500, 'Mô tả không được quá 500 ký tự'),
})

export type RecruitmentChannelEditFormData = z.infer<typeof recruitmentChannelEditSchema>
