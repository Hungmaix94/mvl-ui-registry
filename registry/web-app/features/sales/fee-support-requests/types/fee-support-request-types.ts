import { z } from 'zod'
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'

import type { components } from '@/api/schema'
import { extractErrorMessage } from '@/utils/error-utils'

/**
 * TODO(schema): bỏ `FeeSupportBonusCutFields` sau khi BE deploy field cắt-khách-thưởng
 * và chạy lại `yarn api:update`.
 *
 * Vì sao phải shim thay vì regenerate ngay: `schema.ts` hiện sinh từ API ĐÃ DEPLOY
 * (`api:generate` → api.mvl.glinteco.com), còn field này mới chỉ có trên BE local.
 * Regenerate từ BE local đo được ngày 26/08/2026 là **+83.209 / −59.496 dòng**, trong
 * đó ĐÚNG 9 dòng là field mới — phần còn lại là path/operation bị đổi tên hàng loạt do
 * `--dedupe-enums` chọn "path thắng" khác, đúng cái bẫy `Paths*` mà AGENTS.md cảnh báo.
 * Nuốt cả 142k dòng đó vào PR này là đổi contract của toàn app để thêm hai ô nhập.
 *
 * Shim CÓ CHỦ ĐÍCH đặt ở file types của feature, KHÔNG phải file service — luật cấm
 * extend type sinh tự động nằm ở service (AGENTS.md § API Schema & Typing Rules).
 */
type FeeSupportBonusCutFields = {
  customer_discount_bonus_pct?: string | null
  customer_discount_bonus_amount?: string | null
}

export type FeeSupportRequestCreateRequest =
  components['schemas']['FeeSupportRequestCreateRequest'] & FeeSupportBonusCutFields
export type FeeSupportRequestEditRequest =
  components['schemas']['PatchedFeeSupportRequestEditRequest'] & FeeSupportBonusCutFields

/**
 * TODO(schema): xoá cùng `FeeSupportBonusCutFields` sau khi regenerate.
 *
 * Đọc-an-toàn hai field cắt-khách-thưởng trên BẢN GHI phiếu. Bản ghi có kiểu sinh
 * tự động và luật cấm extend nó ở file service, nên đọc qua accessor hẹp ở đây —
 * một chỗ để xoá, thay vì rải `as any` ra bốn component.
 */
export function bonusCutOf(record: unknown): {
  pct: string | null
  amount: string | null
} {
  const r = (record ?? {}) as {
    customer_discount_bonus_pct?: string | null
    customer_discount_bonus_amount?: string | null
  }
  return { pct: r.customer_discount_bonus_pct ?? null, amount: r.customer_discount_bonus_amount ?? null }
}

function hasValue(value: number | null | undefined): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

/**
 * Cặp %/tiền mỗi kênh nhập qua FeeSupportPctAmountField (MoneyPercentInput) nên
 * đã là number thuần và XOR by construction — superRefine giữ lớp phòng thủ +
 * các rule UX (≥1 kênh, khách kèm chiết khấu). Trần tổng % (D14) do BE validate.
 */
/** Input tối thiểu cho rule kênh — dùng chung cả 2 schema (có/không `deal`). */
type FeeSupportChannelsInput = {
  support_sale_pct?: number | null
  support_sale_amount?: number | null
  support_bonus_pct?: number | null
  support_bonus_amount?: number | null
  customer?: number | null
  customer_discount_pct?: number | null
  customer_discount_amount?: number | null
  customer_discount_bonus_pct?: number | null
  customer_discount_bonus_amount?: number | null
}

/**
 * Rule kênh hỗ trợ dùng CHUNG cho form deal-driven (có `deal`) và dialog tạo từ
 * HĐ cọc (deposit_contract-driven, không `deal`): XOR %/tiền mỗi kênh, ≥1 kênh
 * hỗ trợ (sale hoặc thưởng), có chiết khấu khách thì phải có khách. Trần tổng %
 * (D14) do BE validate — FE không tự chặn.
 */
function feeSupportChannelsRefine(values: FeeSupportChannelsInput, ctx: z.RefinementCtx) {
  const channels: Array<{
    pct: number | null | undefined
    amt: number | null | undefined
    pctPath: string
    amtPath: string
  }> = [
    {
      pct: values.support_sale_pct,
      amt: values.support_sale_amount,
      pctPath: 'support_sale_pct',
      amtPath: 'support_sale_amount',
    },
    {
      pct: values.support_bonus_pct,
      amt: values.support_bonus_amount,
      pctPath: 'support_bonus_pct',
      amtPath: 'support_bonus_amount',
    },
    {
      pct: values.customer_discount_pct,
      amt: values.customer_discount_amount,
      pctPath: 'customer_discount_pct',
      amtPath: 'customer_discount_amount',
    },
    {
      pct: values.customer_discount_bonus_pct,
      amt: values.customer_discount_bonus_amount,
      pctPath: 'customer_discount_bonus_pct',
      amtPath: 'customer_discount_bonus_amount',
    },
  ]

  for (const { pct, amt, pctPath, amtPath } of channels) {
    if (hasValue(pct) && pct <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [pctPath],
        message: 'Giá trị % phải lớn hơn 0',
      })
    }
    if (hasValue(amt) && amt <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [amtPath],
        message: 'Số tiền phải lớn hơn 0',
      })
    }
    // XOR phòng thủ — UI một ô không thể tạo cả hai, nhưng giữ để chặn mọi ngả
    if (hasValue(pct) && hasValue(amt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [amtPath],
        message: 'Chỉ nhập một trong hai: % hoặc số tiền',
      })
    }
  }

  // Bắt buộc ít nhất 1 kênh. Cắt khách phần thưởng LÀ một kênh đủ tư cách: nghiệp
  // vụ không cho xin hỗ trợ thưởng (FEE_SUPPORT_BONUS_REQUEST_ENABLED = false) nên
  // phiếu "chỉ cắt khách phần thưởng" là hình dạng phổ biến nhất trên thực tế —
  // bỏ sót nó ở đây là chặn đứng đúng loại phiếu người dùng cần lập.
  const hasSaleChannel = hasValue(values.support_sale_pct) || hasValue(values.support_sale_amount)
  const hasBonusChannel =
    hasValue(values.support_bonus_pct) || hasValue(values.support_bonus_amount)
  const hasBonusCutChannel =
    hasValue(values.customer_discount_bonus_pct) ||
    hasValue(values.customer_discount_bonus_amount)
  if (!hasSaleChannel && !hasBonusChannel && !hasBonusCutChannel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['support_sale_pct'],
      message: 'Vui lòng nhập ít nhất một kênh (hỗ trợ hoa hồng sale hoặc cắt khách phần thưởng)',
    })
  }

  // Có chiết khấu khách (bất kỳ pot nào) → bắt buộc chọn khách hàng
  const hasDiscountChannel =
    hasValue(values.customer_discount_pct) ||
    hasValue(values.customer_discount_amount) ||
    hasBonusCutChannel
  if (hasDiscountChannel && !values.customer) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['customer'],
      message: 'Giao dịch chưa có khách hàng — không thể nhập chiết khấu khách',
    })
  }
}

export const feeSupportRequestFormSchema = z
  .object({
    deal: z.number({ required_error: 'Vui lòng chọn giao dịch' }).min(1, 'Vui lòng chọn giao dịch'),
    sales: z.array(z.number()).min(1, 'Vui lòng chọn ít nhất một nhân sự tham gia'),
    reason: z
      .string({ required_error: 'Vui lòng nhập lý do' })
      .trim()
      .min(1, 'Vui lòng nhập lý do'),
    support_sale_pct: z.number().nullish(),
    support_sale_amount: z.number().nullish(),
    support_bonus_pct: z.number().nullish(),
    support_bonus_amount: z.number().nullish(),
    // Select trả id dạng chuỗi → coerce về number (pattern dự án cho ID từ select)
    customer: z.coerce.number().nullish(),
    customer_discount_pct: z.number().nullish(),
    customer_discount_amount: z.number().nullish(),
    customer_discount_bonus_pct: z.number().nullish(),
    customer_discount_bonus_amount: z.number().nullish(),
    /**
     * v3 — sale chọn "giữ đủ tiền": HOLD toàn bộ hoa hồng căn tới khi CĐT trả
     * đủ (thêm một điều kiện gate D22); kế toán có thể mở tay sau.
     */
    hold_full_until_paid: z.boolean(),
    /** file_token do FileUpload phát ra sau presign — confirm thành id số lúc submit. */
    attachment_tokens: z.array(z.string()).optional(),
  })
  .superRefine(feeSupportChannelsRefine)

export type FeeSupportRequestFormValues = z.infer<typeof feeSupportRequestFormSchema>

/**
 * Schema cho dialog tạo phiếu từ màn HĐ cọc — GIỐNG bản trên nhưng BỎ `deal`
 * (link theo deposit_contract id, truyền vào toFeeSupportCreatePayload). Rule kênh
 * dùng chung `feeSupportChannelsRefine`.
 */
export const feeSupportProposalDialogSchema = z
  .object({
    sales: z.array(z.number()).min(1, 'Vui lòng chọn ít nhất một nhân sự tham gia'),
    reason: z
      .string({ required_error: 'Vui lòng nhập lý do' })
      .trim()
      .min(1, 'Vui lòng nhập lý do'),
    support_sale_pct: z.number().nullish(),
    support_sale_amount: z.number().nullish(),
    support_bonus_pct: z.number().nullish(),
    support_bonus_amount: z.number().nullish(),
    customer: z.coerce.number().nullish(),
    customer_discount_pct: z.number().nullish(),
    customer_discount_amount: z.number().nullish(),
    customer_discount_bonus_pct: z.number().nullish(),
    customer_discount_bonus_amount: z.number().nullish(),
    hold_full_until_paid: z.boolean().optional(),
    attachment_tokens: z.array(z.string()).optional(),
  })
  .superRefine(feeSupportChannelsRefine)

export type FeeSupportProposalDialogValues = z.infer<typeof feeSupportProposalDialogSchema>

/**
 * Schema cho dialog SỬA phiếu web_secretary (86eyqf9m3) — cùng field/rule kênh với
 * dialog tạo, KHÔNG có `hold_full_until_paid` (BE `FeeSupportRequestEditSerializer`
 * không nhận field này ở edit — chỉ set được lúc tạo). `sales`/`reason` vẫn bắt
 * buộc vì dialog luôn gửi đủ (không phải partial-field-level trên UI, dù BE PATCH
 * chấp nhận thiếu field).
 */
export const feeSupportEditDialogSchema = z
  .object({
    sales: z.array(z.number()).min(1, 'Vui lòng chọn ít nhất một nhân sự tham gia'),
    reason: z
      .string({ required_error: 'Vui lòng nhập lý do' })
      .trim()
      .min(1, 'Vui lòng nhập lý do'),
    support_sale_pct: z.number().nullish(),
    support_sale_amount: z.number().nullish(),
    support_bonus_pct: z.number().nullish(),
    support_bonus_amount: z.number().nullish(),
    customer: z.coerce.number().nullish(),
    customer_discount_pct: z.number().nullish(),
    customer_discount_amount: z.number().nullish(),
    customer_discount_bonus_pct: z.number().nullish(),
    customer_discount_bonus_amount: z.number().nullish(),
  })
  .superRefine(feeSupportChannelsRefine)

export type FeeSupportEditDialogValues = z.infer<typeof feeSupportEditDialogSchema>

type ApiErrorDetail = { code?: string; detail?: string; attr?: string | null }

/** attr API ↔ tên field form khi hai bên khác nhau. */
const API_ATTR_TO_FORM_FIELD: Record<string, string> = {
  // BE nhận token qua files.attachments → lỗi attachment có attr base 'files'/'attachments'
  files: 'attachment_tokens',
  attachments: 'attachment_tokens',
}

const FORM_FIELD_NAMES = new Set<string>(feeSupportRequestFormSchema.innerType().keyof().options)
const EDIT_FORM_FIELD_NAMES = new Set<string>(
  feeSupportEditDialogSchema.innerType().keyof().options
)

/**
 * Map lỗi API của form đề xuất/sửa: attr khớp field → lỗi hiển thị dưới đúng ô;
 * phần còn lại (non-field như trần tổng % D14, attr server-only) gom vào
 * `root.server` để form render BANNER trong mục Mức hỗ trợ — KHÔNG toast,
 * user theo dõi lỗi tại chỗ dễ hơn. `fieldNames` mặc định theo form tạo; dialog
 * sửa truyền `EDIT_FORM_FIELD_NAMES` (không có `deal`/`hold_full_until_paid`).
 */
export function applyFeeSupportApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldNames: Set<string> = FORM_FIELD_NAMES
): void {
  const err = error as {
    error?: { errors?: ApiErrorDetail[] }
    server?: { errors?: ApiErrorDetail[] }
  }
  const details = Array.isArray(err?.error?.errors)
    ? err.error?.errors
    : Array.isArray(err?.server?.errors)
      ? err.server?.errors
      : null

  const rootMessages: string[] = []

  if (details && details.length > 0) {
    for (const item of details) {
      if (!item?.detail) continue
      const attrBase = (item.attr ?? '').split('.')[0]
      const mapped = API_ATTR_TO_FORM_FIELD[attrBase] ?? attrBase
      if (mapped && fieldNames.has(mapped)) {
        setError(mapped as FieldPath<T>, {
          type: item.code ?? 'server',
          message: item.detail,
        })
      } else {
        rootMessages.push(item.detail)
      }
    }
  } else {
    rootMessages.push(extractErrorMessage(error, 'Có lỗi xảy ra, vui lòng thử lại sau.'))
  }

  if (rootMessages.length > 0) {
    setError('root.server', { type: 'server', message: rootMessages.join('\n') })
  }
}

export { EDIT_FORM_FIELD_NAMES }

/** number → chuỗi decimal cho API; trống → null. */
function toDecimalString(value: number | null | undefined): string | null {
  return hasValue(value) ? String(value) : null
}

/**
 * Build payload create. Attachment gửi TOKEN trực tiếp qua `files.attachments`;
 * BE confirm token → FileModel phía server (đồng bộ pattern Exchange/Investor),
 * FE không cần bước confirm token → id nữa.
 */
export function toFeeSupportCreatePayload(
  // Nhận bản KHÔNG `deal` (dialog HĐ cọc); bản có `deal` cũng gán được (structural
  // subset). Builder chỉ đọc field chung + `depositContractId` (không đọc `deal`).
  values: FeeSupportProposalDialogValues,
  depositContractId: number,
  // Cờ giữ-đủ-tiền chỉ có trên form đầy đủ (FeeSupportRequestForm); dialog tạo từ
  // HĐ cọc không thu field này nên mặc định false.
  holdFullUntilPaid = false
): FeeSupportRequestCreateRequest {
  const attachmentTokens = values.attachment_tokens ?? []
  return {
    // Link phiếu theo id HỢP ĐỒNG CỌC, KHÔNG phải deal.id. Deal và DepositContract
    // là 2 thực thể riêng (DealList có FK deposit_contract) nên deal.id ≠
    // deposit_contract.id; caller resolve id hợp đồng (từ workspace deal, hoặc
    // trực tiếp khi tạo từ màn HĐ cọc) rồi truyền vào đây.
    deposit_contract: depositContractId,
    sales: values.sales,
    reason: values.reason,
    support_sale_pct: toDecimalString(values.support_sale_pct),
    support_sale_amount: toDecimalString(values.support_sale_amount),
    support_bonus_pct: toDecimalString(values.support_bonus_pct),
    support_bonus_amount: toDecimalString(values.support_bonus_amount),
    customer: values.customer ? values.customer : null,
    customer_discount_pct: toDecimalString(values.customer_discount_pct),
    customer_discount_amount: toDecimalString(values.customer_discount_amount),
    customer_discount_bonus_pct: toDecimalString(values.customer_discount_bonus_pct),
    customer_discount_bonus_amount: toDecimalString(values.customer_discount_bonus_amount),
    hold_full_until_paid: holdFullUntilPaid,
    ...(attachmentTokens.length > 0 && {
      files: {
        attachments: attachmentTokens,
      },
    }),
  }
}

/**
 * Build payload PATCH sửa phiếu web_secretary (86eyqf9m3). Không gửi
 * `deal`/`deposit_contract`/`hold_full_until_paid`/`files` — BE khoá các field đó
 * ở edit (`deal`/`deposit_contract` cố định theo phiếu đang sửa) hoặc coi thiếu =
 * giữ nguyên (đính giấy tờ không nằm trong phạm vi dialog sửa này).
 */
export function toFeeSupportEditPayload(
  values: FeeSupportEditDialogValues
): FeeSupportRequestEditRequest {
  return {
    sales: values.sales,
    reason: values.reason,
    support_sale_pct: toDecimalString(values.support_sale_pct),
    support_sale_amount: toDecimalString(values.support_sale_amount),
    support_bonus_pct: toDecimalString(values.support_bonus_pct),
    support_bonus_amount: toDecimalString(values.support_bonus_amount),
    customer: values.customer ? values.customer : null,
    customer_discount_pct: toDecimalString(values.customer_discount_pct),
    customer_discount_amount: toDecimalString(values.customer_discount_amount),
    customer_discount_bonus_pct: toDecimalString(values.customer_discount_bonus_pct),
    customer_discount_bonus_amount: toDecimalString(values.customer_discount_bonus_amount),
  }
}
