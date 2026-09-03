import { z } from 'zod'
import { DecisionSigning_status } from '@/api/schema.ts'

export const decisionFormSchema = z.object({
  decision_number: z
    .string()
    .min(1, 'Số quyết định là bắt buộc')
    .max(50, 'Số quyết định không được vượt quá 50 ký tự'),
  name: z
    .string()
    .min(1, 'Tên quyết định là bắt buộc')
    .max(500, 'Tên quyết định không được vượt quá 500 ký tự'),
  signing_date: z.string({ required_error: 'Ngày ký là bắt buộc' }).min(1, 'Ngày ký là bắt buộc'),
  signer_id: z
    .number({ required_error: 'Người ký là bắt buộc', invalid_type_error: 'Người ký là bắt buộc' })
    .min(1, 'Người ký là bắt buộc'),
  effective_date: z
    .string({ required_error: 'Ngày hiệu lực là bắt buộc' })
    .min(1, 'Ngày hiệu lực là bắt buộc'),
  reason: z.string().max(500, 'Lý do không được vượt quá 500 ký tự').optional().nullable(),
  content: z.string().max(2000, 'Nội dung không được vượt quá 2000 ký tự').optional().nullable(),
  note: z.string().max(1000, 'Ghi chú không được vượt quá 1000 ký tự').optional().nullable(),
  signing_status: z.nativeEnum(DecisionSigning_status, {
    required_error: 'Trạng thái ký là bắt buộc',
  }),
  attachment_tokens: z.array(z.string()).min(1, 'File đính kèm là bắt buộc'),
})

export type DecisionFormData = z.infer<typeof decisionFormSchema>
