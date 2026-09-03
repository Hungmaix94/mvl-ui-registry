import { z } from 'zod'
import { parse, isValid } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { EmployeeCertificateType } from '@/constants/api-schema-aliases'

export const createEmployeeCertificateSchema = z
  .object({
    employee: z.number({ required_error: 'Nhân viên là bắt buộc' }).min(1, 'Nhân viên là bắt buộc'),
    // "Chờ cấp": nhân viên đã thi đỗ nhưng chứng chỉ chưa được cấp — chưa có số/ngày cấp.
    issuance_status: z.enum(['issued', 'pending']).default('issued'),
    certificate_type: z.nativeEnum(EmployeeCertificateType, {
      required_error: 'Loại bằng cấp, chứng chỉ là bắt buộc',
    }),
    certificate_code: z
      .string()
      .max(30, 'Mã bằng cấp, chứng chỉ không được vượt quá 30 ký tự')
      .optional(),
    certificate_name: z.string().max(100, 'Tiêu đề không được vượt quá 100 ký tự').optional(),
    // CR STT53: "Số thứ tự thực tế" — số ghi trên sổ cấp phát bản cứng. Tuỳ chọn, không unique.
    // Dùng preprocess chứ KHÔNG dùng z.coerce.number(): `Number('')` ra 0, nên ô bị xoá trắng sẽ
    // lưu thành 0 thay vì để trống — giống cách `duration` bên dưới đang làm.
    actual_sequence_number: z.preprocess(
      (val) => {
        if (val === null || val === undefined) return undefined
        if (typeof val === 'string') {
          const trimmed = val.trim()
          if (trimmed === '') return undefined
          const num = Number(trimmed)
          // Không phải số thì trả lại nguyên chuỗi để zod báo lỗi, thay vì nuốt im lặng.
          return isNaN(num) ? val : num
        }
        return val
      },
      z
        .number({ invalid_type_error: 'Số thứ tự thực tế phải là số' })
        .int('Số thứ tự thực tế phải là số nguyên')
        .min(0, 'Số thứ tự thực tế phải lớn hơn hoặc bằng 0')
        .optional()
    ),
    issuing_organization: z
      .string()
      .max(100, 'Tổ chức cấp không được vượt quá 100 ký tự')
      .optional(),
    training_specialization: z
      .string()
      .max(100, 'Chuyên ngành đào tạo không được vượt quá 100 ký tự')
      .optional(),
    graduation_diploma: z
      .string()
      .max(100, 'Văn bằng tốt nghiệp không được vượt quá 100 ký tự')
      .optional(),
    issue_date: z.preprocess(
      (val) => {
        if (val === null || val === undefined || val === '') return undefined
        if (typeof val === 'string') {
          // Handle DD/MM/YYYY format from DatePicker
          if (val.includes('/')) {
            const parsed = parse(val, DATE_FORMAT, new Date())
            return isValid(parsed) ? parsed : val
          }
          const parsed = new Date(val)
          return isValid(parsed) ? parsed : val
        }
        return val
      },
      z
        .date({
          invalid_type_error: 'Ngày cấp không hợp lệ',
        })
        .optional()
    ),
    expected_issue_date: z.preprocess((val) => {
      if (val === null || val === undefined || val === '') return null
      if (typeof val === 'string') {
        // Handle DD/MM/YYYY format from DatePicker
        if (val.includes('/')) {
          const parsed = parse(val, DATE_FORMAT, new Date())
          return isValid(parsed) ? parsed : null
        }
        return new Date(val)
      }
      return val
    }, z.date().nullable().optional()),
    effective_date: z.preprocess((val) => {
      if (val === null || val === undefined || val === '') return null
      if (typeof val === 'string') {
        // Handle DD/MM/YYYY format from DatePicker
        if (val.includes('/')) {
          const parsed = parse(val, DATE_FORMAT, new Date())
          return isValid(parsed) ? parsed : null
        }
        return new Date(val)
      }
      return val
    }, z.date().nullable().optional()),
    expiry_date: z.preprocess((val) => {
      if (val === null || val === undefined || val === '') return null
      if (typeof val === 'string') {
        // Handle DD/MM/YYYY format from DatePicker
        if (val.includes('/')) {
          const parsed = parse(val, DATE_FORMAT, new Date())
          return isValid(parsed) ? parsed : null
        }
        return new Date(val)
      }
      return val
    }, z.date().nullable().optional()),
    notes: z.string().max(500, 'Ghi chú không được vượt quá 500 ký tự').optional(),
    files: z
      .object({
        file: z.string().optional(),
      })
      .optional(),
    // Duration field chỉ dùng để tính toán expiry_date, không gửi lên API
    duration: z.preprocess((val) => {
      if (val === '' || val === null || val === undefined) return undefined
      if (typeof val === 'string') {
        const num = Number(val)
        return isNaN(num) ? undefined : num
      }
      return val
    }, z.number().min(0, 'Thời hạn phải lớn hơn hoặc bằng 0').max(100, 'Thời hạn không được vượt quá 100 năm').optional()),
  })
  .superRefine((data, ctx) => {
    // Phiếu "chờ cấp" chưa có số/ngày cấp/hạn — bỏ qua mọi ràng buộc bắt buộc bên dưới.
    if (data.issuance_status === 'pending') return

    // Ngoài phiếu chờ cấp, "Ngày cấp" là bắt buộc.
    if (!data.issue_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ngày cấp là bắt buộc',
        path: ['issue_date'],
      })
    }

    // Với loại bằng cấp "Chứng chỉ hành nghề môi giới", bắt buộc chọn "Ngày hết hiệu lực"
    if (
      data.certificate_type === EmployeeCertificateType.real_estate_practice_license &&
      (!data.expiry_date || data.expiry_date === null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ngày hết hiệu lực là bắt buộc với loại bằng cấp "Chứng chỉ hành nghề môi giới"',
        path: ['expiry_date'],
      })
    }
  })

export type CreateEmployeeCertificateFormData = z.infer<typeof createEmployeeCertificateSchema>
