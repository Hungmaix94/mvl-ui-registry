import { z } from 'zod'

/**
 * "Thêm dự án vào kỳ" (create) form.
 * Maps to ProjectDirectorCommissionInputRequest { project, accounting_period, pct_payout?, payout_override_amount?, note? }.
 * pct_payout / payout_override_amount are decimal strings in the API.
 */
export const directorCommissionCreateSchema = z.object({
  project: z.coerce
    .number({ required_error: 'Vui lòng chọn dự án' })
    .int()
    .positive('Vui lòng chọn dự án'),
  accounting_period: z.coerce
    .number({ required_error: 'Vui lòng chọn kỳ kế toán' })
    .int()
    .positive('Vui lòng chọn kỳ kế toán'),
})
export type DirectorCommissionCreateValues = z.infer<typeof directorCommissionCreateSchema>

/**
 * Nhập số dạng chuỗi (cho phép dấu phẩy ngăn cách hàng nghìn) → chuỗi số thập phân cho
 * API, hoặc `null` khi để trống. 86ey9myjk: bản cũ coi chuỗi không phải số (gõ nhầm chữ)
 * là "để trống" một cách im lặng — Lưu vẫn báo thành công dù giá trị nhập bị bỏ qua. Giờ
 * bất kỳ chuỗi không rỗng nào không parse được thành số đều bật lỗi validate.
 */
function numericStringOrNull(invalidMessage: string) {
  return z
    .union([z.number(), z.string()])
    .nullish()
    .transform((val, ctx) => {
      if (val === '' || val == null) return null
      const n = Number(String(val).replace(/,/g, ''))
      if (Number.isNaN(n)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: invalidMessage })
        return z.NEVER
      }
      return String(n)
    })
}

/** Edit-dials form (DRAFT only): payout rate + manual override + note. */
export const directorCommissionEditSchema = z.object({
  pct_payout: numericStringOrNull('Mức % chi không hợp lệ'),
  payout_override_amount: numericStringOrNull('Số tiền chi tay không hợp lệ'),
  note: z.string().nullish(),
})
export type DirectorCommissionEditValues = z.infer<typeof directorCommissionEditSchema>

/** Filter dialog values — status only (period comes from the toolbar switcher). */
export type DirectorCommissionFilterValues = {
  status?: string[] | null
}
