import { isAfter, startOfDay } from 'date-fns'
import { z } from 'zod'
import { validateVietnamesePhone } from '@/utils/validation-utils'
import { parseDateFromApi, parseStringToDate } from '@/utils/date-utils'

// Trạng thái đã chuyển sang `constants/refund-booking-constants.ts` để lấy giá trị thẳng từ
// enum của schema. Re-export ở đây để các import cũ không phải sửa.
export { RefundBookingStatus } from '../constants/refund-booking-constants'

/**
 * Đưa giá trị "chưa nhập" về `undefined` trước khi cho Zod kiểm tra.
 *
 * Lý do phải có bước này: `z.coerce.number()` gọi `Number(val)` trước, nên `undefined` biến
 * thành `NaN` và `''` biến thành `0`. Hệ quả là `required_error` **không bao giờ bắn ra** —
 * Zod rơi vào nhánh `invalid_type` và trả thông báo mặc định tiếng Anh
 * ("Expected number, received nan"), còn ô để trống thì lọt qua như số 0.
 */
const emptyToUndefined = (val: unknown) =>
  val === '' || val === null || val === undefined ? undefined : Number(val)

/**
 * Chuỗi bắt buộc. Phải khai CẢ `required_error` lẫn `invalid_type_error`: khi field chưa từng
 * được đụng tới, RHF gửi `undefined` xuống và `z.string()` trả thông báo mặc định "Required"
 * (tiếng Anh) thay vì rơi vào `.min(1, ...)`.
 */
const requiredText = (message: string, max: number, maxMessage: string) =>
  z
    .string({ required_error: message, invalid_type_error: message })
    .min(1, message)
    .max(max, maxMessage)

/**
 * Chuẩn hoá đầu vào của `DatePicker` về `Date` trước khi Zod kiểm tra.
 *
 * KHÔNG dùng `z.coerce.date()` ở đây vì hai lý do:
 * 1. `DatePicker` phát ra chuỗi `dd/MM/yyyy`; `new Date('29/06/2026')` là Invalid Date
 *    (và với `05/08/2026` thì lại bị đọc nhầm theo kiểu Mỹ) — xem `docs/ai/conventions.md`.
 * 2. Ngày rỗng sinh mã lỗi `invalid_date` của Zod, mà mã đó KHÔNG đọc `invalid_type_error`,
 *    nên message luôn là "Invalid date" bằng tiếng Anh dù đã khai thông báo tiếng Việt.
 */
const toDate = (val: unknown) => {
  if (val === '' || val === null || val === undefined) return undefined
  if (val instanceof Date) return val
  if (typeof val === 'string') return parseStringToDate(val) ?? parseDateFromApi(val)
  return val
}

export const refundBookingFormSchema = z
  .object({
    // 1. Hợp đồng đặt chỗ — phải chọn trước, mọi khối phía dưới phụ thuộc vào nó.
    // Bắt buộc ngay tại đây (thay vì `optional()`) vì từ CR STT11 khối "Thông tin
    // khách hàng" + "Nhân sự phụ trách bán" bị ẩn cho tới khi chọn xong booking:
    // nếu để optional, submit khi chưa chọn sẽ chỉ sinh lỗi trên các field ĐANG ẨN
    // và người dùng thấy form không phản hồi gì. Khai đầu tiên trong schema để
    // `useScrollToError` nhắm đúng ô Select đang hiển thị.
    booking_id: z.preprocess(
      emptyToUndefined,
      z.number({
        required_error: 'Vui lòng chọn giao dịch đặt chỗ',
        invalid_type_error: 'Vui lòng chọn giao dịch đặt chỗ',
      })
    ),

    // 4. Thông tin người đề nghị / Khách hàng
    customer_id: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
      z.number().nullable().optional()
    ),
    customer_name: requiredText(
      'Vui lòng nhập họ tên người đề nghị',
      250,
      'Họ tên không được vượt quá 250 ký tự'
    ),
    customer_dob: z.coerce.date().optional(),
    customer_cccd: requiredText(
      'Vui lòng nhập số CCCD/CMND',
      20,
      'Số CCCD/CMND không được vượt quá 20 ký tự'
    ),
    customer_phone: z
      .string({
        required_error: 'Vui lòng nhập số điện thoại',
        invalid_type_error: 'Vui lòng nhập số điện thoại',
      })
      .min(1, 'Vui lòng nhập số điện thoại')
      .refine((val) => validateVietnamesePhone(val) === true, {
        message: 'Số điện thoại không hợp lệ',
      }),
    customer_address: requiredText(
      'Vui lòng nhập địa chỉ liên hệ',
      250,
      'Địa chỉ liên hệ không được vượt quá 250 ký tự'
    ),

    // 8-11. Thông tin nội bộ / Bất động sản
    sales_employee_id: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
      z.number().nullable().optional()
    ),
    sales_employee_detail: z.any().optional(),
    sales_staff: z.any().optional(),
    project_id: z.preprocess(
      emptyToUndefined,
      z.number({
        required_error: 'Vui lòng chọn dự án',
        invalid_type_error: 'Vui lòng chọn dự án',
      })
    ),
    product_inventory_id: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
      z.number().nullable().optional()
    ),

    // 12-20. Thông tin Giao dịch / Hoàn tiền
    booking_amount: z.preprocess(
      emptyToUndefined,
      z
        .number({
          required_error: 'Vui lòng nhập số tiền đặt chỗ',
          invalid_type_error: 'Vui lòng nhập số tiền đặt chỗ',
        })
        .min(0, 'Số tiền đặt chỗ không hợp lệ')
    ),
    booking_date: z
      .preprocess(
        toDate,
        z.date({
          required_error: 'Vui lòng chọn ngày đặt chỗ',
          invalid_type_error: 'Vui lòng chọn ngày đặt chỗ',
        })
      )
      .refine((date) => !isAfter(startOfDay(date), startOfDay(new Date())), {
        message: 'Ngày đặt chỗ không được ở tương lai',
      }),

    sender_account_name: requiredText(
      'Vui lòng nhập chủ tài khoản người chuyển',
      250,
      'Chủ tài khoản không được vượt quá 250 ký tự'
    ),
    sender_account_number: requiredText(
      'Vui lòng nhập số tài khoản người chuyển',
      20,
      'Số tài khoản không được vượt quá 20 ký tự'
    ),

    refund_amount: z.preprocess(
      emptyToUndefined,
      z
        .number({
          required_error: 'Vui lòng nhập số tiền hoàn',
          invalid_type_error: 'Vui lòng nhập số tiền hoàn',
        })
        .min(0, 'Số tiền hoàn không hợp lệ')
    ),
    refund_account_name: requiredText(
      'Vui lòng nhập tên tài khoản nhận hoàn',
      250,
      'Tên tài khoản nhận hoàn không được vượt quá 250 ký tự'
    ),
    refund_account_number: requiredText(
      'Vui lòng nhập số tài khoản nhận hoàn',
      20,
      'Số tài khoản nhận hoàn không được vượt quá 20 ký tự'
    ),
    refund_bank_name: requiredText(
      'Vui lòng chọn ngân hàng mở tài khoản',
      250,
      'Tên ngân hàng không được vượt quá 250 ký tự'
    ),
    refund_bank_branch: requiredText(
      'Vui lòng nhập chi nhánh ngân hàng',
      250,
      'Chi nhánh ngân hàng không được vượt quá 250 ký tự'
    ),

    // 24. Tệp đính kèm
    attachments: z
      .array(z.string(), {
        required_error: 'Vui lòng đính kèm tài liệu',
        invalid_type_error: 'Vui lòng đính kèm tài liệu',
      })
      .min(1, 'Vui lòng đính kèm tài liệu'),
    kept_attachment_ids: z.array(z.number()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.refund_amount > data.booking_amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Số tiền hoàn không được lớn hơn số tiền đặt chỗ',
        path: ['refund_amount'],
      })
    }
  })

export type RefundBookingFormValues = z.infer<typeof refundBookingFormSchema>
