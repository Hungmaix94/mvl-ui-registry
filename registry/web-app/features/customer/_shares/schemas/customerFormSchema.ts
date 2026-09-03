import { z } from 'zod'
import { validateVietnamesePhone } from '@/utils/validation-utils.ts'
import { CustomerType, CustomerGender } from '@/constants/api-schema-aliases'

function toDateOrNull(val: unknown) {
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

/** CR 18.1: hồ sơ khách hàng phải luôn có ít nhất 1 tài liệu đính kèm. */
export const ATTACHMENT_REQUIRED_MESSAGE = 'Vui lòng đính kèm ít nhất 1 tài liệu'

/**
 * Đếm tài liệu MỚI tải lên trong phiên này. `FileUpload` trả về phần tử chuỗi rỗng khi ô upload
 * còn trống nên phải lọc trước khi đếm — giống cách `CustomerForm.onSubmit` lọc trước khi build
 * `payload.files`.
 */
function countNewAttachments(tokens?: string[] | null) {
  return (tokens ?? []).filter((token) => token !== '').length
}

const commonSchema = z.object({
  phone: z
    .string({ required_error: 'Số điện thoại là bắt buộc' })
    .min(1, 'Số điện thoại là bắt buộc')
    .max(20, 'Số điện thoại không được vượt quá 20 ký tự')
    .refine((val) => validateVietnamesePhone(val) === true, {
      message: 'Số điện thoại không hợp lệ',
    }),
  email: z
    .string({ required_error: 'Email là bắt buộc' })
    .min(1, 'Email là bắt buộc')
    .email('Email không hợp lệ')
    .max(254, 'Email không được vượt quá 254 ký tự'),
  note: z.string().max(500, 'Ghi chú không được vượt quá 500 ký tự').optional().nullable(),
  attachment_tokens: z.array(z.string()).optional(),
  attachment_keep_ids: z.array(z.number()).optional(),
})

/**
 * Biến thể dùng cho màn TẠO MỚI: ràng buộc đính kèm đặt ngay trên field thay vì ở
 * `.superRefine()` bọc ngoài.
 *
 * Lý do: `ZodEffects` chỉ chạy refinement khi schema bên trong parse KHÔNG "aborted". Submit một
 * form trống làm các field bắt buộc khác (họ tên, SĐT, email…) trả `invalid_type` ⇒ object abort
 * ⇒ refinement ngoài bị bỏ qua ⇒ người dùng phải sửa hết field khác rồi submit lần hai mới thấy
 * lỗi thiếu tài liệu. Đặt ở field level thì lỗi này nằm cùng lượt với các lỗi bắt buộc khác.
 *
 * Màn CHỈNH SỬA không dùng được cách này vì `attachment_tokens` rỗng vẫn hợp lệ khi người dùng
 * giữ nguyên tệp cũ — đó là ràng buộc chéo hai field, bắt buộc phải ở mức object.
 */
const createCommonSchema = commonSchema.extend({
  attachment_tokens: z
    .array(z.string())
    .optional()
    .refine((tokens) => countNewAttachments(tokens) > 0, ATTACHMENT_REQUIRED_MESSAGE),
})

export const individualCustomerSchema = z.object({
  customer_type: z.literal(CustomerType.individual),
  full_name: z
    .string({ required_error: 'Họ và tên là bắt buộc' })
    .min(1, 'Họ và tên là bắt buộc')
    .max(250, 'Họ và tên không được vượt quá 250 ký tự'),
  address_detail: z
    .string()
    .max(500, 'Địa chỉ thường trú không được vượt quá 500 ký tự')
    .optional()
    .nullable(),
  province_id: z.number().optional().nullable(),
  ward_id: z.number().optional().nullable(),
  gender: z.nativeEnum(CustomerGender).optional().nullable(),
  date_of_birth: z.preprocess(toDateOrNull, z.date().optional().nullable()).optional().nullable(),
  id_number: z
    .string({ required_error: 'Mã số định danh/Hộ chiếu là bắt buộc' })
    .min(1, 'Mã số định danh/Hộ chiếu là bắt buộc')
    .max(20, 'Mã số định danh/Hộ chiếu không được vượt quá 20 ký tự')
    .regex(/^[A-Za-z0-9]+$/, 'Mã số định danh/Hộ chiếu không hợp lệ'),
  id_issued_date: z.preprocess(toDateOrNull, z.date().optional().nullable()).optional().nullable(),
})

export const businessCustomerSchema = z.object({
  customer_type: z.literal(CustomerType.business),
  business_name: z
    .string({ required_error: 'Tên doanh nghiệp là bắt buộc' })
    .min(1, 'Tên doanh nghiệp là bắt buộc')
    .max(255, 'Tên doanh nghiệp không được vượt quá 255 ký tự'),
  business_tax_code: z
    .string({ required_error: 'Mã số thuế là bắt buộc' })
    .min(1, 'Mã số thuế là bắt buộc')
    .max(20, 'Mã số thuế không được vượt quá 20 ký tự'),
  business_representative: z
    .string()
    .max(255, 'Người đại diện không được vượt quá 255 ký tự')
    .optional()
    .nullable(),
  business_representative_title: z
    .string()
    .max(100, 'Chức vụ không được vượt quá 100 ký tự')
    .optional()
    .nullable(),
  business_address: z
    .string()
    .max(500, 'Địa chỉ ĐKKD không được vượt quá 500 ký tự')
    .optional()
    .nullable(),
  business_province_id: z.number().optional().nullable(),
  business_ward_id: z.number().optional().nullable(),
})

export function getCustomerSchema(mode: 'create' | 'edit') {
  const base = mode === 'create' ? createCommonSchema : commonSchema

  return z
    .discriminatedUnion('customer_type', [
      base.merge(individualCustomerSchema),
      base.merge(businessCustomerSchema),
    ])
    .superRefine((data, ctx) => {
      // Mode 'create' đã ràng buộc ở field level (xem `createCommonSchema`) — kiểm lại ở đây chỉ
      // sinh ra lỗi trùng trên cùng một field.
      if (mode !== 'edit') return

      // Hồ sơ sau khi lưu = tệp mới tải lên + tệp cũ được giữ lại. Chỉ chặn khi cả hai cùng rỗng,
      // tức người dùng đã xoá sạch tệp cũ mà không tải tệp mới. Nếu chỉ kiểm `attachment_tokens`
      // thì mọi lần sửa thông tin mà không đụng tới tệp đều bị chặn oan.
      const keptCount = data.attachment_keep_ids?.length ?? 0
      if (countNewAttachments(data.attachment_tokens) + keptCount === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['attachment_tokens'],
          message: ATTACHMENT_REQUIRED_MESSAGE,
        })
      }
    })
}

type CommonFormValues = z.infer<typeof commonSchema>
export type IndividualCustomerFormValues = CommonFormValues &
  z.infer<typeof individualCustomerSchema>
export type BusinessCustomerFormValues = CommonFormValues & z.infer<typeof businessCustomerSchema>
export type CustomerFormValues = Partial<Omit<IndividualCustomerFormValues, 'customer_type'>> &
  Partial<Omit<BusinessCustomerFormValues, 'customer_type'>> & {
    customer_type: CustomerType
  }
