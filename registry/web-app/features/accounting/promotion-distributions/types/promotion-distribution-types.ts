import { z } from 'zod'
import { formatDateToApi } from '@/utils/date-utils'

/**
 * Form schema for "Thêm dự án vào kỳ" (create) and "Sửa dự án" (edit).
 *
 * Maps to:
 *  - create → ProjectPromotionDistributionInputRequest { project, accounting_period, mkt_cutoff_date, marketing_cost }
 *  - update → ProjectPromotionDistributionRequest      { project, accounting_period, mkt_cutoff_date, marketing_cost?, note? }
 *
 * `marketing_cost` is a decimal **string** in the API — emit a string, never a number.
 */
export const promotionDistributionFormSchema = z.object({
  project: z.coerce
    .number({ required_error: 'Vui lòng chọn dự án' })
    .int()
    .positive('Vui lòng chọn dự án'),
  accounting_period: z.coerce
    .number({ required_error: 'Vui lòng chọn kỳ kế toán' })
    .int()
    .positive('Vui lòng chọn kỳ kế toán'),
  mkt_cutoff_date: z.preprocess(
    (val) => (val != null && val !== '' ? formatDateToApi(val as Date | string) : val),
    z
      .string({ required_error: 'Vui lòng chọn ngày chốt chi phí bán hàng' })
      .min(1, 'Vui lòng chọn ngày chốt chi phí bán hàng')
  ),
  marketing_cost: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (val === '' || val == null) return '0'
      const n = Number(String(val).replace(/,/g, ''))
      return Number.isNaN(n) ? '0' : String(n)
    })
    .default('0'),
  note: z.string().nullish(),
  // File đính kèm (mirror DepositContract):
  //  - attachments        → token presign của file MỚI (gửi khi lưu)
  //  - kept_attachment_ids → id file cũ còn giữ khi sửa (bỏ id = xoá file đó)
  //  - attachments_detail  → seed File[] để FileUpload hiển thị file cũ (không gửi lên API)
  attachments: z.array(z.any()).optional().default([]),
  kept_attachment_ids: z.array(z.number()).optional(),
  attachments_detail: z.any().array().optional(),
})

export type PromotionDistributionFormValues = z.infer<typeof promotionDistributionFormSchema>

export const DEFAULT_PROMOTION_DISTRIBUTION_FORM: Partial<PromotionDistributionFormValues> = {
  marketing_cost: '0',
  note: '',
  attachments: [],
  kept_attachment_ids: [],
}

/** Filter dialog values — status only (period comes from the toolbar switcher). */
export type PromotionDistributionFilterValues = {
  status?: string | null
}
