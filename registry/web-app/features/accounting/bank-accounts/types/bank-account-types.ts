import { z } from 'zod'
import {
  BANK_ACCOUNT_NUMBER_MAX_LENGTH,
  BANK_ACCOUNT_NUMBER_MAX_MESSAGE,
} from '@/utils/bank-account-number'

/**
 * Danh mục này là tài khoản **của công ty**, không phải của khách — nên nó cố ý KHÔNG dùng luật
 * chỉ-chữ-số ở [`bank-account-number.ts`](../../../../utils/bank-account-number.ts).
 *
 * Lý do: bản ghi ở đây có cả `bank_swift_code` và `currency` (VND / USD / EUR), tức nó chứa được
 * tài khoản ngoại tệ, mà số tài khoản ngoại tệ / IBAN thì có chữ cái thật. Siết xuống chữ số là
 * chặn oan đúng nhóm đó. Bề rộng thì vẫn dùng chung, vì cột bên BE cùng là `varchar(50)`.
 *
 * Đây là khác biệt CÓ CHỦ Ý, không phải hai luật trôi khỏi nhau — sửa một bên thì đọc lại ghi
 * chú này trước.
 */
const COMPANY_ACCOUNT_NUMBER_PATTERN = /^[A-Za-z0-9]+$/
const COMPANY_ACCOUNT_NUMBER_FORMAT_MESSAGE = 'Số tài khoản chỉ chứa chữ số và chữ cái'

/**
 * Common currency suggestions. The `currency` field on the form is a free
 * text input — these are just hints (rendered as a list/placeholder, not as
 * a constrained Select).
 */
export const COMMON_CURRENCY_OPTIONS = [
  { value: 'VND', label: 'VND' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
] as const

export const bankAccountFormSchema = z.object({
  branch: z
    .number({ required_error: 'Vui lòng chọn chi nhánh' })
    .int('Chi nhánh không hợp lệ')
    .min(1, 'Vui lòng chọn chi nhánh'),
  account_holder: z
    .string({ required_error: 'Vui lòng nhập chủ tài khoản' })
    .min(1, 'Vui lòng nhập chủ tài khoản')
    .max(255, 'Chủ tài khoản không vượt quá 255 ký tự'),
  bank_name: z
    .string({ required_error: 'Vui lòng nhập tên ngân hàng' })
    .min(1, 'Vui lòng nhập tên ngân hàng')
    .max(255, 'Tên ngân hàng không vượt quá 255 ký tự'),
  account_number: z
    .string({ required_error: 'Vui lòng nhập số tài khoản' })
    .min(1, 'Vui lòng nhập số tài khoản')
    .max(BANK_ACCOUNT_NUMBER_MAX_LENGTH, BANK_ACCOUNT_NUMBER_MAX_MESSAGE)
    .regex(COMPANY_ACCOUNT_NUMBER_PATTERN, COMPANY_ACCOUNT_NUMBER_FORMAT_MESSAGE),
  bank_branch_name: z
    .string()
    .max(255, 'Chi nhánh ngân hàng không vượt quá 255 ký tự')
    .optional()
    .or(z.literal('')),
  bank_swift_code: z
    .string()
    .max(11, 'SWIFT code không vượt quá 11 ký tự')
    .regex(/^[A-Z0-9]*$/, 'SWIFT code chỉ chứa chữ cái in hoa và số')
    .optional()
    .or(z.literal('')),
  currency: z
    .string({ required_error: 'Vui lòng nhập tiền tệ' })
    .min(1, 'Vui lòng nhập tiền tệ')
    .max(10, 'Tiền tệ không vượt quá 10 ký tự'),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  note: z.string().max(2000, 'Ghi chú không vượt quá 2000 ký tự').optional().or(z.literal('')),
})

export type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>

export const DEFAULT_BANK_ACCOUNT_FORM_VALUES: BankAccountFormValues = {
  branch: 0,
  account_holder: '',
  bank_name: '',
  account_number: '',
  bank_branch_name: '',
  bank_swift_code: '',
  currency: 'VND',
  is_default: false,
  is_active: true,
  note: '',
}

/**
 * Filter schema — 3 fields. Currency is intentionally excluded (per
 * 20.3 plan decision).
 */
export const bankAccountFilterSchema = z.object({
  branch: z.number().nullable().optional(),
  is_active: z.enum(['true', 'false']).nullable().optional(),
  is_default: z.enum(['true', 'false']).nullable().optional(),
})

export type BankAccountFilterValues = z.infer<typeof bankAccountFilterSchema>

export const DEFAULT_BANK_ACCOUNT_FILTER_VALUES: BankAccountFilterValues = {
  branch: null,
  is_active: null,
  is_default: null,
}
