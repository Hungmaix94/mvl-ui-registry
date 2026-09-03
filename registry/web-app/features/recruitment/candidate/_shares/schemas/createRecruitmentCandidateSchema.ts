import { z } from 'zod'
import { EmployeeRecruitmentCandidateNestedYears_of_experience } from '@/api/schema.ts'
import { MAX_CITIZEN_ID_FILES } from '@/features/hrm/_shares/citizen-id-files-payload.ts'
import {
  RecruitmentCandidateEmployeeType,
  RecruitmentCandidateStatus,
  EmployeeGender,
  EmployeeMaritalStatus,
} from '@/constants/api-schema-aliases'

const datePreprocess = (val: unknown) => {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'string') {
    if (val.includes('/')) {
      const [day, month, year] = val.split('/')
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }
    return new Date(val)
  }
  return val
}

const contactLogItemSchema = z.object({
  employee_id: z.number().min(1),
  date: z.string().min(1),
  method: z.string().min(1).max(10),
  note: z.string().max(500).optional(),
})

export const createRecruitmentCandidateSchema = z
  .object({
    name: z
      .string({ required_error: 'Tên ứng viên là bắt buộc' })
      .min(1, 'Tên ứng viên là bắt buộc')
      .max(100),
    citizen_id: z
      .string({ required_error: 'Số CMND/CCCD là bắt buộc' })
      .min(1, 'Số CMND/CCCD là bắt buộc')
      .max(12),
    email: z.string({ required_error: 'Email là bắt buộc' }).email('Email không hợp lệ').max(100),
    phone: z
      .string({ required_error: 'Số điện thoại là bắt buộc' })
      .length(10, 'Số điện thoại phải có 10 chữ số')
      .regex(/^\d+$/, 'Chỉ được nhập số'),
    recruitment_request_id: z.number({ required_error: 'Đề nghị tuyển dụng là bắt buộc' }),
    recruitment_source_id: z.number({ required_error: 'Nguồn tuyển dụng là bắt buộc' }),
    recruitment_channel_id: z.number({ required_error: 'Kênh tuyển dụng là bắt buộc' }),
    employee_type: z
      .preprocess(
        (val) => (val === '' ? null : val),
        z.nativeEnum(RecruitmentCandidateEmployeeType).nullable()
      )
      .optional(),
    years_of_experience: z.preprocess(
      (val) => (val === null || val === '' ? undefined : val),
      z.nativeEnum(EmployeeRecruitmentCandidateNestedYears_of_experience, {
        required_error: 'Số năm kinh nghiệm là bắt buộc',
        invalid_type_error: 'Số năm kinh nghiệm là bắt buộc',
      })
    ),
    submitted_date: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          // Handle DD/MM/YYYY format from DatePicker
          if (val.includes('/')) {
            const [day, month, year] = val.split('/')
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          }
          return new Date(val)
        }
        return val
      },
      z.date({ required_error: 'Ngày nộp đơn là bắt buộc' })
    ),
    status: z.nativeEnum(RecruitmentCandidateStatus),
    onboard_date: z.preprocess((val) => {
      if (val === null || val === undefined || val === '') return null
      if (typeof val === 'string') {
        // Handle DD/MM/YYYY format from DatePicker
        if (val.includes('/')) {
          const [day, month, year] = val.split('/')
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        }
        return new Date(val)
      }
      return val
    }, z.date().nullable().optional()),
    note: z.string().max(500).optional(),
    referrer_id: z.number().nullable().optional(),
    contact_logs: z.array(contactLogItemSchema).optional(),
    date_of_birth: z.preprocess(
      datePreprocess,
      z.date({ required_error: 'Ngày sinh là bắt buộc' })
    ),
    gender: z.nativeEnum(EmployeeGender),
    place_of_birth: z.string().min(1, 'Nơi sinh là bắt buộc').max(255),
    citizen_id_issued_date: z.preprocess(
      datePreprocess,
      z.date({ required_error: 'Ngày cấp CMND/CCCD là bắt buộc' })
    ),
    citizen_id_issued_place: z.string().max(255).optional(),
    emergency_contact_phone: z.string().max(20).nullable().optional(),
    citizen_id_files_ids: z
      .array(z.union([z.number(), z.string()]))
      .max(MAX_CITIZEN_ID_FILES, `Tối đa ${MAX_CITIZEN_ID_FILES} ảnh CMND/CCCD`)
      .optional(),
    nationality_id: z.number().nullable().optional(),
    ethnicity: z.string().max(100).optional(),
    religion: z.string().max(100).optional(),
    marital_status: z.nativeEnum(EmployeeMaritalStatus).nullable().optional(),
    tax_code: z.string().max(50).optional(),
    residential_address: z.string().max(500).optional(),
    permanent_address: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      // If status is HIRED, onboard_date is required
      if (
        data.status === RecruitmentCandidateStatus.HIRED &&
        (!data.onboard_date || data.onboard_date === null)
      ) {
        return false
      }
      return true
    },
    {
      message: 'Thời gian nhận việc là bắt buộc khi trạng thái là "Đã nhận việc"',
      path: ['onboard_date'],
    }
  )

export type CreateRecruitmentCandidateFormData = z.infer<typeof createRecruitmentCandidateSchema>
