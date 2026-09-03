import { z } from 'zod'
import {
  ContractNet_percentage,
  EmployeeRecruitmentCandidateNestedYears_of_experience,
} from '@/api/schema.ts'
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

type RecruitmentCandidateSchemaOptions = {
  /** When true, recruitment request / source / channel are not required — ứng viên quay lại. */
  isReturnCandidate?: boolean
}

export function getRecruitmentCandidateSchema(
  _mode: 'create' | 'edit',
  options?: RecruitmentCandidateSchemaOptions
) {
  const isReturn = options?.isReturnCandidate === true

  return z
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
      recruitment_request_id: z.number().optional().nullable(),
      recruitment_source_id: z.number().optional().nullable(),
      recruitment_channel_id: z.number().optional().nullable(),
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
      referrer_display: z
        .object({
          code: z.string(),
          fullname: z.string(),
          department_name: z.string(),
        })
        .nullable()
        .optional(),
      contact_person_id: z.number().nullable().optional(),
      contact_person_display: z
        .object({
          code: z.string(),
          fullname: z.string(),
          department_name: z.string(),
        })
        .nullable()
        .optional(),
      date_of_birth: z.preprocess(
        datePreprocess,
        z.date({
          required_error: 'Ngày sinh là bắt buộc',
          invalid_type_error: 'Ngày sinh là bắt buộc',
        })
      ),
      gender: z.nativeEnum(EmployeeGender, {
        required_error: 'Giới tính là bắt buộc',
      }),
      place_of_birth: z.string().min(1, 'Nơi sinh là bắt buộc').max(255),
      citizen_id_issued_date: z.preprocess(
        datePreprocess,
        z.date({
          required_error: 'Ngày cấp CMND/CCCD là bắt buộc',
          invalid_type_error: 'Ngày cấp CMND/CCCD là bắt buộc',
        })
      ),
      citizen_id_issued_place: z.string().max(255).optional(),
      emergency_contact_phone: z.string().max(20).nullable().optional(),
      citizen_id_files_ids: z
        .array(z.union([z.number(), z.string()]))
        .max(MAX_CITIZEN_ID_FILES, `Tối đa ${MAX_CITIZEN_ID_FILES} ảnh CMND/CCCD`)
        .optional(),
      profile_attachments: z
        .array(z.union([z.number(), z.string()]))
        .max(3, 'Tối đa 3 tệp đính kèm')
        .optional(),
      nationality_id: z.number().nullable().optional(),
      ethnicity: z.string().max(100).optional(),
      religion: z.string().max(100).optional(),
      marital_status: z.nativeEnum(EmployeeMaritalStatus).nullable().optional(),
      tax_code: z.string().max(50).optional(),
      residential_address: z.string().max(500).optional(),
      permanent_address: z.string().max(500).optional(),
      policy_start_date: z.preprocess((val) => {
        if (val === null || val === undefined || val === '') return null
        if (typeof val === 'string') {
          if (val.includes('/')) {
            const [day, month, year] = val.split('/')
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          }
          return new Date(val)
        }
        return val
      }, z.date().nullable().optional()),
      policy_end_date: z.preprocess((val) => {
        if (val === null || val === undefined || val === '') return null
        if (typeof val === 'string') {
          if (val.includes('/')) {
            const [day, month, year] = val.split('/')
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          }
          return new Date(val)
        }
        return val
      }, z.date().nullable().optional()),
      base_salary: z.number().optional().nullable(),
      base_salary_percentage: z.preprocess((val) => {
        if (val === null || val === undefined || val === '') return null
        if (typeof val === 'number') return val
        if (typeof val === 'string') {
          const trimmed = val.trim()
          if (!trimmed) return null
          const n = Number(trimmed)
          return Number.isFinite(n) ? n : null
        }
        return null
      }, z.nativeEnum(ContractNet_percentage).nullable().optional()),
      keep_seniority: z.enum(['yes', 'no']).nullable().optional(),

      branch_id: z.number().min(1, 'Vui lòng chọn chi nhánh').optional().nullable(),
      block_id: z.number().min(1, 'Vui lòng chọn khối').optional().nullable(),
      department_id: z.number().min(1, 'Vui lòng chọn phòng ban').optional().nullable(),
      job_title: z.string().max(255).optional(),
    })
    .superRefine((data, ctx) => {
      if (!isReturn) {
        if (data.recruitment_request_id == null || data.recruitment_request_id === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Đề nghị tuyển dụng là bắt buộc',
            path: ['recruitment_request_id'],
          })
        }
        if (data.recruitment_source_id == null || data.recruitment_source_id === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Nguồn tuyển dụng là bắt buộc',
            path: ['recruitment_source_id'],
          })
        }
        if (data.recruitment_channel_id == null || data.recruitment_channel_id === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Kênh tuyển dụng là bắt buộc',
            path: ['recruitment_channel_id'],
          })
        }
      }

      if (isReturn) {
        if (data.branch_id == null || data.branch_id === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Vui lòng chọn chi nhánh',
            path: ['branch_id'],
          })
        }
        if (data.block_id == null || data.block_id === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Vui lòng chọn khối',
            path: ['block_id'],
          })
        }
        if (data.department_id == null || data.department_id === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Vui lòng chọn phòng ban',
            path: ['department_id'],
          })
        }
      }
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
    .refine(
      (data) => {
        if (data.status !== RecruitmentCandidateStatus.HIRED) {
          return true
        }
        return Boolean(data.job_title?.trim())
      },
      {
        message: 'Chức vụ là bắt buộc khi trạng thái là "Đã nhận việc"',
        path: ['job_title'],
      }
    )
}

export type RecruitmentCandidateFormData = z.infer<ReturnType<typeof getRecruitmentCandidateSchema>>
