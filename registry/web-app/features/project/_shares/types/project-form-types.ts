import { z } from 'zod'
import { parse, isValid } from 'date-fns'
import { PatchedProductInventoryRequestProduct_type } from '@/api/schema.ts'
import {
  ProjectPhase,
  ProjectStatus,
  ReconciliationSourceType,
} from '@/constants/api-schema-aliases'
import { DATE_FORMAT, DATE_SERVER_FORMAT } from '@/constants/date-format.ts'

const optionalString = z.string().optional()

const optionalNonNegativeNumber = z
  .union([z.number(), z.null(), z.string()])
  .optional()
  .transform((v) => {
    if (v === '' || v === undefined) return undefined
    if (v == null) return null
    const n = Number(v)
    return Number.isNaN(n) ? undefined : n
  })
  .refine((v) => v === undefined || v === null || v >= 0, {
    message: 'Tổng số căn không được là số âm',
  })

const optionalDateString = z.union([z.date(), z.string()]).optional().nullable()

function normalizeToDate(val: unknown): Date | null {
  if (val == null) return null
  if (val instanceof Date) return isValid(val) ? val : null
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return null

    // Thử parse theo định dạng hiển thị (dd/MM/yyyy)
    let parsed = parse(trimmed, DATE_FORMAT, new Date())
    if (isValid(parsed)) return parsed

    // Fallback: định dạng server (yyyy-MM-dd)
    parsed = parse(trimmed, DATE_SERVER_FORMAT, new Date())
    return isValid(parsed) ? parsed : null
  }
  return null
}

export const projectFormSchema = z
  .object({
    name: z.string().min(1, 'Tên dự án là bắt buộc'),
    project_type: z
      .nativeEnum(PatchedProductInventoryRequestProduct_type)
      .nullable()
      .superRefine((val, ctx) => {
        if (val === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Loại dự án là bắt buộc',
          })
        }
      }),
    phase: z
      .nativeEnum(ProjectPhase)
      .nullable()
      .superRefine((val, ctx) => {
        if (val === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Giai đoạn hiện tại là bắt buộc',
          })
        }
      }),
    /** Optional; API có thể trả về '' khi không có giá trị. */
    source_type: z
      .nativeEnum(ReconciliationSourceType)
      .nullable()
      .superRefine((val, ctx) => {
        if (val === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Loại nguồn sản phẩm là bắt buộc',
          })
        }
      }),
    status: z.nativeEnum(ProjectStatus, {
      required_error: 'Trạng thái là bắt buộc',
    }),
    is_active: z.boolean().default(true),
    investor_id: z.preprocess(
      (val) => (val === '' || val === 0 || val === null ? undefined : val),
      z.coerce
        .number({
          required_error: 'Chủ đầu tư là bắt buộc',
          invalid_type_error: 'Chủ đầu tư là bắt buộc',
        })
        .positive('Chủ đầu tư là bắt buộc')
    ),
    address: z.string().min(1, 'Địa chỉ là bắt buộc'),
    description: optionalString,
    planned_start_date: optionalDateString,
    planned_end_date: optionalDateString,
    sale_open_date: optionalDateString,
    total_units: optionalNonNegativeNumber,
    avg_price_estimate: optionalString,
    project_director_id: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z.coerce.number().positive('Vui lòng chọn nhân sự hợp lệ').optional().nullable()
    ),
    project_secretary_id: z.preprocess(
      (val) => (val === '' ? undefined : val),
      z.coerce.number().positive('Vui lòng chọn nhân sự hợp lệ').optional().nullable()
    ),
    staff_assignments: z
      .array(
        z.object({
          employee_id: z.number({ required_error: 'Vui lòng chọn nhân sự' }),
          role: z.string().min(1, 'Vui lòng chọn vai trò'),
          effective_from: z.date({ required_error: 'Vui lòng chọn ngày áp dụng' }),
          effective_to: z.date().nullable().optional(),
          employee_detail: z.any().optional(),
          attachment_tokens: z.array(z.string()).optional(),
          attachment_keep_ids: z.array(z.number()).optional(),
          attachments: z.array(z.any()).optional(),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    const startDate = normalizeToDate(data.planned_start_date)
    const endDate = normalizeToDate(data.planned_end_date)

    // Chỉ validate khi cả hai ngày đều có giá trị hợp lệ
    if (!startDate || !endDate) return

    if (startDate.getTime() > endDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['planned_start_date'],
        message: 'Ngày bắt đầu dự kiến phải trước hoặc bằng ngày kết thúc dự kiến',
      })
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['planned_end_date'],
        message: 'Ngày kết thúc dự kiến phải sau hoặc bằng ngày bắt đầu dự kiến',
      })
    }

    // Check staff_assignments
    if (data.staff_assignments && data.staff_assignments.length > 0) {
      const getLocalDateStr = (val: Date | string | null | undefined): string | null => {
        if (!val) return null
        if (val instanceof Date) {
          const y = val.getFullYear()
          const m = String(val.getMonth() + 1).padStart(2, '0')
          const d = String(val.getDate()).padStart(2, '0')
          return `${y}-${m}-${d}`
        }
        if (typeof val === 'string') {
          return val.substring(0, 10)
        }
        return null
      }

      const seen = new Set<string>()

      // Lọc các roles cần validate trùng lặp thời gian
      const SINGLE_ROLES = ['project_director', 'project_secretary']

      data.staff_assignments.forEach((staff, index) => {
        if (!staff.role || !staff.effective_from) return

        // Validate effective_to >= effective_from
        if (staff.effective_to && staff.effective_to.getTime() < staff.effective_from.getTime()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['staff_assignments', index, 'effective_to'],
            message: 'Ngày kết thúc phải sau hoặc bằng ngày áp dụng',
          })
        }

        const startAStr = getLocalDateStr(staff.effective_from)

        // 1. Chặn nhập y hệt cùng vai trò, cùng ngày bắt đầu (như cũ)
        const key = `${staff.role}-${startAStr}`
        if (seen.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['staff_assignments', index, 'effective_from'],
            message: 'Ngày áp dụng bị trùng với nhân sự khác cùng vai trò',
          })
        } else {
          seen.add(key)
        }

        // 2. Chặn trùng lặp khoảng thời gian (overlap) đối với Giám đốc và Thư ký dự án
        if (SINGLE_ROLES.includes(staff.role)) {
          const endAStr = getLocalDateStr(staff.effective_to) || '9999-12-31'

          for (let i = 0; i < index; i++) {
            const otherStaff = data.staff_assignments![i]
            if (otherStaff.role === staff.role && otherStaff.effective_from) {
              const startBStr = getLocalDateStr(otherStaff.effective_from)
              const endBStr = getLocalDateStr(otherStaff.effective_to) || '9999-12-31'

              // Overlap condition: StartA <= EndB AND StartB <= EndA
              if (startAStr && startBStr && startAStr <= endBStr && startBStr <= endAStr) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: ['staff_assignments', index, 'effective_from'],
                  message: `Thời gian hiệu lực không được trùng lặp với khoảng thời gian đã có của ${staff.role === 'project_director' ? 'Giám đốc' : 'Thư ký'} dự án`,
                })
                // We break to avoid adding multiple errors for the same row
                break
              }
            }
          }
        }
      })
    }
  })

export type ProjectFormValues = z.output<typeof projectFormSchema>
