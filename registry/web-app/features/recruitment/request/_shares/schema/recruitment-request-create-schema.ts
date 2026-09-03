import { z } from 'zod'
import { RecruitmentRequestType, RecruitmentRequestStatus } from '@/constants/api-schema-aliases'
/**
 * Zod schema for recruitment request create form validation
 *
 * Field names match API schema (snake_case):
 * - name, job_description_id, branch_id, block_id, department_id, proposer_id, proposed_salary, number_of_positions
 */
export const recruitmentRequestCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Vui lòng nhập tên đề nghị')
    .max(255, 'Tên đề nghị không được vượt quá 255 ký tự'),
  job_description_id: z
    .number({ required_error: 'Vui lòng chọn mô tả công việc' })
    .min(1, 'Vui lòng chọn mô tả công việc'),
  // position field removed - not in API
  // Các trường tổ chức bắt buộc
  branch_id: z
    .number({ required_error: 'Vui lòng chọn chi nhánh' })
    .min(1, 'Vui lòng chọn chi nhánh'),
  block_id: z.number({ required_error: 'Vui lòng chọn khối' }).min(1, 'Vui lòng chọn khối'),
  department_id: z
    .number({ required_error: 'Vui lòng chọn phòng ban' })
    .min(1, 'Vui lòng chọn phòng ban'),
  proposer_id: z.coerce
    .number({
      required_error: 'Vui lòng chọn người đề xuất',
      invalid_type_error: 'Vui lòng chọn người đề xuất',
    })
    .min(1, 'Vui lòng chọn người đề xuất'),
  recruitment_type: z.nativeEnum(RecruitmentRequestType),
  status: z.nativeEnum(RecruitmentRequestStatus),
  proposed_salary: z
    .string()
    .min(1, 'Vui lòng nhập mức lương')
    .max(50, 'Mức lương không được vượt quá 50 ký tự'),
  number_of_positions: z.coerce
    .number({ invalid_type_error: 'Số lượng không được để trống' })
    .min(1, 'Số lượng tối thiểu là 1'),
  requirements: z.string().min(1, 'Vui lòng nhập yêu cầu'),
  benefits: z.string().min(1, 'Vui lòng nhập quyền lợi'),
})

export type RecruitmentRequestCreateFormData = z.infer<typeof recruitmentRequestCreateSchema>
