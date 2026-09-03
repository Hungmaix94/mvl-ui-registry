import { z } from 'zod'

/**
 * v3 (fee-support): mỗi dòng thụ hưởng là nhân viên HOẶC CTV (người-nhận-hộ /
 * khách-đã-thành-CTV từ bảng chia per-party) — đúng một trong hai.
 * `recipient_label` + `max_net_amount` là dữ liệu hiển thị/validate do FE prefill
 * từ E10 (không gửi lên BE).
 *
 * `tax_estimate_rate` là công cụ ƯỚC TÍNH thực nhận sau thuế (FE-only, không gửi BE,
 * không ảnh hưởng trần tạm ứng): thuế TNCN thực tế được tính lại khi tổng kết HH tháng,
 * và số đã tạm ứng bị trừ vào thu nhập SAU THUẾ của kỳ tổng kết.
 */
export const commissionAdvanceFormSchema = z.object({
  project: z.coerce.number().optional().nullable(),
  deal: z.coerce.number({
    required_error: 'Vui lòng chọn giao dịch',
    invalid_type_error: 'Vui lòng chọn giao dịch',
  }),
  tax_estimate_rate: z.coerce.number().optional().nullable(),
  commission_period: z
    .string({
      required_error: 'Vui lòng chọn kỳ kế toán',
      invalid_type_error: 'Vui lòng chọn kỳ kế toán',
    })
    .min(1, 'Vui lòng chọn kỳ kế toán'),
  request_reason: z.string().optional(),
  recipient_lines: z
    .array(
      z
        .object({
          recipient_employee: z.coerce.number().nullish(),
          recipient_collaborator: z.coerce.number().nullish(),
          /** Nhãn hiển thị dòng CTV prefill từ bảng chia (không gửi BE). */
          recipient_label: z.string().optional(),
          /** Thuế suất tạm tính (%) — chỉ để ước tính thực nhận, không quyết định trần. */
          tax_estimate_rate: z.coerce.number().optional().nullish(),
          /**
           * Trần tạm ứng từng dòng mirror cap BE (Q3): nhân viên = 100% share,
           * CTV = share × (1 − 10%), tối đa 100M/dòng; undefined khi thêm dòng tay.
           */
          max_net_amount: z.number().optional(),
          requested_amount: z.coerce
            .number({
              required_error: 'Vui lòng nhập số tiền',
              invalid_type_error: 'Vui lòng nhập số tiền',
            })
            .min(1, 'Số tiền phải lớn hơn 0')
            .max(100000000, 'Số tiền tạm ứng mỗi dòng không được vượt quá 100.000.000 VNĐ'),
        })
        .superRefine((line, ctx) => {
          if (!line.recipient_employee && !line.recipient_collaborator) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['recipient_employee'],
              message: 'Vui lòng chọn người thụ hưởng',
            })
          }
        })
    )
    .min(1, 'Vui lòng thêm ít nhất một người thụ hưởng'),
})

export type CommissionAdvanceFormValues = z.infer<typeof commissionAdvanceFormSchema>

export const getCurrentCommissionPeriod = () => {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const y = now.getFullYear()
  return `${m}/${y}`
}

export const DEFAULT_COMMISSION_ADVANCE_FORM_VALUES: Partial<CommissionAdvanceFormValues> = {
  project: null,
  tax_estimate_rate: 10,
  request_reason: '',
  commission_period: getCurrentCommissionPeriod(),
  recipient_lines: [],
}

/** Thuế khấu trừ tạm ứng CTV phía BE (Q3) — nhân viên không khấu trừ ở bước này. */
export const COLLABORATOR_ADVANCE_TAX_PCT = 10

/** Trần tạm ứng mỗi dòng thụ hưởng (20.17). */
export const MAX_ADVANCE_PER_LINE = 100_000_000

/** Trần tạm ứng theo rule BE: nhân viên = 100% share, CTV = 90% share, tối đa 100M/dòng. */
export const advanceCapForShare = (grossShare: number, isEmployee: boolean) =>
  Math.min(
    Math.floor(grossShare * (isEmployee ? 1 : (100 - COLLABORATOR_ADVANCE_TAX_PCT) / 100)),
    MAX_ADVANCE_PER_LINE
  )

/** Phân biệt dòng CTV/người-nhận-hộ */
export const isCollaboratorShare = (s: any) =>
  !!s?.collaborator?.id ||
  (typeof s?.recipient_kind === 'string' && s.recipient_kind.startsWith('ctv'))

/** Phân biệt dòng Nhân viên nội bộ (loại trừ trường hợp dòng CTV chứa nhân viên nguồn) */
export const isEmployeeShare = (s: any) => !isCollaboratorShare(s) && !!s?.employee?.id

/** Alias cho backward compatibility */
export const isCtvShare = isCollaboratorShare
