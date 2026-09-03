import { z } from 'zod'
import { htmlMaxLength } from '@/utils/validation-utils'

export const jobDescriptionEditSchema = z.object({
  code: z.string().min(1, 'Mã là bắt buộc'),
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(250, 'Tiêu đề không được quá 250 ký tự'),
  position_title: z
    .string()
    .min(1, 'Vị trí tuyển dụng là bắt buộc')
    .max(250, 'Vị trí tuyển dụng không được quá 250 ký tự'),

  responsibility: htmlMaxLength(500, 'Mô tả công việc không được quá 500 ký tự').refine(
    (val) => !!val && val.trim() !== '',
    { message: 'Mô tả công việc là bắt buộc' }
  ),

  requirement: htmlMaxLength(500, 'Yêu cầu không được quá 500 ký tự').refine(
    (val) => !!val && val.trim() !== '',
    { message: 'Yêu cầu là bắt buộc' }
  ),

  preferred_criteria: htmlMaxLength(500, 'Tiêu chí ưu tiên không được quá 500 ký tự').optional(),

  benefit: htmlMaxLength(500, 'Quyền lợi không được quá 500 ký tự').refine(
    (val) => !!val && val.trim() !== '',
    { message: 'Quyền lợi là bắt buộc' }
  ),

  proposed_salary: z
    .string()
    .min(1, 'Mức lương đề xuất là bắt buộc')
    .max(50, 'Mức lương đề xuất không được quá 50 ký tự'),

  note: z.string().max(500, 'Ghi chú không được quá 500 ký tự').optional(),

  attachment: z.string().optional(), // file_token from FileUpload
})

export type JobDescriptionEditFormData = z.infer<typeof jobDescriptionEditSchema>
