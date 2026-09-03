import { z } from 'zod'

export const InterviewScheduleCreateSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập lịch phỏng vấn').max(100, 'Tối đa 100 ký tự'),
  recruitment_request_id: z.number({
    required_error: 'Vui lòng chọn đề nghị tuyển dụng',
  }),
  // Display-only field, not submitted to API
  position: z.string().max(500).optional(),
  interview_type: z.enum(['IN_PERSON', 'ONLINE'], {
    required_error: 'Vui lòng chọn loại phỏng vấn',
  }),
  location: z.string().min(1, 'Vui lòng nhập địa điểm').max(200, 'Tối đa 200 ký tự'),
  time: z.string().min(1, 'Vui lòng chọn thời gian'),
  note: z.string().max(500, 'Tối đa 500 ký tự').optional().or(z.literal('')),
})

export const InterviewScheduleEditSchema = InterviewScheduleCreateSchema

export type InterviewScheduleEditForm = z.infer<typeof InterviewScheduleEditSchema>
