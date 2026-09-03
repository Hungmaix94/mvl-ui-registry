import { parse, isValid, startOfDay, isAfter } from 'date-fns'
import { z } from 'zod'
import {
  CtvLineType,
  DepositContractPaymentMethod,
  BookingTransferToAccount,
  CustomerType,
  F2Source as F2SourceType,
} from '@/constants/api-schema-aliases'

export enum BookingContractStatus {
  NEW = 'new',
  PENDING_APPROVAL = 'pending_approval',
  BOOKED = 'booked',
  REFUNDED = 'refunded',
  CONVERTED_DEPOSIT = 'converted_deposit',
  TRANSFERRED = 'transferred',
}

export const BOOKING_APPROVAL_STATUS_OPTIONS = [
  { value: 'new', label: 'Mới' },
  { value: 'draft', label: 'Nháp' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'pending_approval', label: 'Chờ duyệt' },
  { value: 'pending_confirm', label: 'Chờ đồng-sale xác nhận' },
  { value: 'pending_manager', label: 'Chờ trưởng phòng duyệt' },
  { value: 'pending_admin', label: 'Chờ TKKD duyệt' },
  { value: 'pending_admin_lead', label: 'Chờ Trưởng phòng TKKD duyệt' },
  { value: 'pending_accountant', label: 'Chờ kế toán duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Đã từ chối' },
]

// Theo DC01 Specification
export const bookingContractFormSchema = z
  .object({
    // 1-4. Hệ thống tự tạo hoặc xử lý ngầm (Mã hợp đồng, Ngày tạo, Ngày cập nhật, Trạng thái)
    status: z.nativeEnum(BookingContractStatus).default(BookingContractStatus.PENDING_APPROVAL),
    contract_number: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (!val || val.trim() === '') return true
          return /^\d{4}-\d{6}$/.test(val)
        },
        {
          message: 'Mã phiếu đặt cọc phải có dạng YYYY-NNNNNN',
        }
      ),
    priority_order: z.coerce.number().optional().nullable(),

    is_edit_mode: z.boolean().optional(),
    // 5-10. Thông tin khách hàng
    // NOTE: Required validation for create-mode is handled in superRefine below.
    // Field is optional/nullable to allow null as default value in edit mode.
    customer_id: z.coerce
      .number({ invalid_type_error: 'Vui lòng chọn khách hàng' })
      .positive('Vui lòng chọn khách hàng')
      .optional()
      .nullable(),
    customer_type: z.nativeEnum(CustomerType).default(CustomerType.individual),
    // Business fields
    business_name: z.string().optional(),
    business_tax_code: z.string().optional(),
    business_representative: z.string().optional(),
    business_representative_title: z.string().optional(),
    business_address: z.string().optional(),
    business_province_id: z.coerce.number().optional().nullable(),
    business_ward_id: z.coerce.number().optional().nullable(),

    customer_name: z.string().optional(),
    customer_gender: z.preprocess(
      (val) => {
        // Phải xử lý chuỗi rỗng TRƯỚC nhánh string. Trước đây thứ tự bị ngược nên
        // `typeof val === 'string'` bắt luôn '' và trả về '' → không khớp z.enum →
        // gender rỗng làm submit fail ở field user có thể chưa hề chạm. Nhánh
        // `val === '' ? undefined : val` cũ là dead code với mọi string.
        if (val === '') return undefined
        return typeof val === 'string' ? val.toLowerCase() : val
      },
      z.enum(['male', 'female']).optional().nullable()
    ),
    customer_dob: z.preprocess(
      (val) => {
        if (val === '') return undefined
        if (typeof val === 'string' && val.includes('/')) {
          const parsed = parse(val, 'dd/MM/yyyy', new Date())
          return isValid(parsed) ? parsed : val
        }
        return val
      },
      z.coerce.date({ invalid_type_error: 'Ngày sinh không hợp lệ' }).optional().nullable()
    ),
    customer_id_issued_date: z.preprocess(
      (val) => {
        if (val === '') return undefined
        if (typeof val === 'string' && val.includes('/')) {
          const parsed = parse(val, 'dd/MM/yyyy', new Date())
          return isValid(parsed) ? parsed : val
        }
        return val
      },
      z.coerce.date({ invalid_type_error: 'Ngày cấp không hợp lệ' }).optional().nullable()
    ),
    customer_cccd: z.string().optional(),
    customer_province_id: z.coerce.number().optional().nullable(),
    customer_ward_id: z.coerce.number().optional().nullable(),
    customer_address: z.string().optional(),
    customer_phone: z.string().optional().nullable(),
    customer_email: z.string().optional().nullable(),

    // 11-13. Thông tin dự án
    // 11-13. Thông tin dự án
    investor_id: z.coerce
      .number({
        required_error: 'Vui lòng chọn chủ đầu tư',
        invalid_type_error: 'Vui lòng chọn chủ đầu tư',
      })
      .positive('Vui lòng chọn chủ đầu tư'),
    project_id: z.coerce
      .number({
        required_error: 'Vui lòng chọn dự án',
        invalid_type_error: 'Vui lòng chọn dự án',
      })
      .positive('Vui lòng chọn dự án'),
    product_inventory_id: z
      .union([
        z.coerce
          .number({ invalid_type_error: 'Vui lòng chọn mã thông tin bán hàng hợp lệ' })
          .positive('Vui lòng chọn mã thông tin bán hàng'),
        z.null(),
        z.undefined(),
        z.literal(''),
      ])
      .transform((val) => (val === '' || val === null ? undefined : val)),

    // 14-17. Thông tin giao dịch
    booking_date: z.preprocess(
      (val) => {
        if (typeof val === 'string' && val.includes('/')) {
          const parsed = parse(val, 'dd/MM/yyyy', new Date())
          return isValid(parsed) ? parsed : val
        }
        return val
      },
      z.coerce
        .date({
          required_error: 'Vui lòng chọn ngày đặt chỗ',
          invalid_type_error: 'Ngày đặt chỗ không hợp lệ',
        })
        .refine((date) => !isAfter(startOfDay(date), startOfDay(new Date())), {
          message: 'Ngày đặt chỗ không được ở tương lai',
        })
    ),
    payment_amount: z.coerce
      .number({
        required_error: 'Vui lòng nhập số tiền thanh toán',
        // 86eyqrt6r: hai thông báo phải GIỐNG NHAU. `z.coerce` chạy `Number(input)` TRƯỚC khi
        // kiểm kiểu, nên ô để trống (`undefined`) thành `NaN` ⇒ rơi vào `invalid_type_error`
        // chứ không bao giờ chạm `required_error`. Để khác nhau thì người dùng bỏ trống ô lại
        // nhận câu "Số tiền không hợp lệ". Cùng cách xử lý với `refund-booking` và
        // `deposit-contracts` — xem `refund-booking-form-types.ts`.
        invalid_type_error: 'Vui lòng nhập số tiền thanh toán',
      })
      // 86eyqrk7h: sàn là 1, KHÔNG phải 0. Ô tiền quy `000.000` (và cả `0` trần) về đúng số 0,
      // mà `.min(0)` cho 0 lọt ⇒ HĐ đặt chỗ 0đ lưu được và BE trả 200. Dùng `min(1)` chứ không
      // `positive()` vì `payment_amount` bên BE là `DecimalField(decimal_places=0)` và
      // `parseCurrencyVND` lọc sạch ký tự không phải chữ số, nên giá trị luôn là số nguyên —
      // `> 0` và `>= 1` là một. Cùng cách viết với `commission-advance-types.ts`.
      // Sàn này CỐ Ý độc lập với `min_booking_amount` của Dự án/Đợt mở bán (BE cũng vậy).
      .min(1, 'Số tiền thanh toán phải lớn hơn 0'),
    payment_method: z.nativeEnum(DepositContractPaymentMethod, {
      required_error: 'Vui lòng chọn hình thức thanh toán',
      invalid_type_error: 'Hình thức thanh toán không hợp lệ',
    }),
    transfer_to_account: z
      .nativeEnum(BookingTransferToAccount, {
        invalid_type_error: 'Nguồn tiền không hợp lệ',
      })
      .optional()
      .nullable(),
    // Thông tin tài khoản nguồn (chỉ hiển thị khi hình thức là Chuyển khoản)
    source_account_holder_name: z
      .string()
      .max(250, 'Tên tài khoản không được vượt quá 250 ký tự')
      .optional()
      .nullable(),
    source_account_number: z
      .string()
      .max(250, 'Số tài khoản không được vượt quá 250 ký tự')
      .optional()
      .nullable(),
    source_bank_name: z
      .string()
      .max(250, 'Tên ngân hàng không được vượt quá 250 ký tự')
      .optional()
      .nullable(),
    // 18-19. Thông tin bổ sung
    notes: z.string().max(500, 'Ghi chú không được vượt quá 500 ký tự').optional(),
    sales_staff: z
      .array(
        z
          .object({
            employee_id: z
              .number({ required_error: 'Vui lòng chọn nhân viên' })
              .optional()
              .nullable(),
            participation_percentage: z.string().optional(),
            pct_commission: z
              .string()
              .optional()
              .nullable()
              .refine(
                (val) => {
                  if (val === undefined || val === null || val === '') return true
                  const num = Number(val)
                  return !isNaN(num) && num >= 0
                },
                { message: 'Tỉ lệ hoa hồng phải lớn hơn hoặc bằng 0' }
              ),
            amt_commission: z
              .string()
              .optional()
              .nullable()
              .refine(
                (val) => {
                  if (val === undefined || val === null || val === '') return true
                  const num = Number(val)
                  return !isNaN(num) && num >= 0
                },
                { message: 'Tiền hoa hồng phải lớn hơn hoặc bằng 0' }
              ),
            sale_type: z.string().optional(),
            exchange_id: z.number().optional().nullable(),
            employee_detail: z.any().optional(),
            exchange_detail: z.any().optional(),
            collaborator_id: z.number().optional().nullable(),
            collaborator_detail: z.any().optional(),
            collaborator_name: z.string().optional(),
            // CTV line fields - added when collaborator is selected
            ctv_line_type: z.string().optional(),
            ctv_line_employee_id: z.number().nullable().optional(),
            ctv_line_department_id: z.number().nullable().optional(),
            count_as_line_revenue: z.boolean().optional(),
            // F2 source fields - added when partner is selected (per transaction)
            f2_source: z.nativeEnum(F2SourceType).nullable().optional(),
            f2_source_director_id: z.number().nullable().optional(),
            f2_source_director_detail: z.any().optional(),
          })
          .superRefine((data, ctx) => {
            if (data.sale_type === 'mv' && !data.employee_id) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Vui lòng chọn nhân sự bán hàng',
                path: ['employee_id'],
              })
            }
            if (data.sale_type === 'partner' && !data.exchange_id) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Vui lòng chọn đại lý / sàn liên kết',
                path: ['exchange_id'],
              })
            }
            if (
              data.sale_type === 'partner' &&
              data.f2_source === F2SourceType.director &&
              !data.f2_source_director_id
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Vui lòng chọn giám đốc cho nguồn giám đốc kinh doanh',
                path: ['f2_source_director_id'],
              })
            }
            if (data.sale_type === 'collaborator') {
              if (!data.collaborator_id) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: 'Vui lòng chọn cộng tác viên',
                  path: ['collaborator_id'],
                })
              }
              if (!data.ctv_line_type) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: 'Vui lòng chọn loại line',
                  path: ['ctv_line_type'],
                })
              } else {
                if (
                  data.ctv_line_type === CtvLineType.exchange_dept &&
                  !data.ctv_line_department_id
                ) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Vui lòng chọn phòng ban',
                    path: ['ctv_line_department_id'],
                  })
                }
                if (
                  (data.ctv_line_type === CtvLineType.management ||
                    data.ctv_line_type === CtvLineType.internal_sale) &&
                  !data.ctv_line_employee_id
                ) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Vui lòng chọn nhân viên',
                    path: ['ctv_line_employee_id'],
                  })
                }
              }
            }
          })
      )
      .min(1, 'Vui lòng thêm ít nhất một người phụ trách bán')
      .default([]),
    total_commission_percentage: z.coerce.number().optional().nullable(),
    attachments: z.array(z.string()).optional().default([]),
    kept_attachment_ids: z.array(z.number()).optional(),
    attachments_detail: z.any().array().optional(),
    pct_sale_commission: z.coerce.number().optional().nullable(),
    amt_sale_commission: z.coerce.number().optional().nullable(),
    sale_commission_type: z.enum(['pct', 'amt']).default('pct'),
    fee_calculation_price: z.coerce.number().optional().nullable(),
    pct_revenue: z.coerce.number().optional().nullable(),
    amt_revenue: z.coerce.number().optional().nullable(),
    revenue_type: z.enum(['pct', 'amt']).default('pct'),
    pct_agency_fee: z.coerce.number().optional().nullable(),
    sales_allocation: z.coerce.number().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Validate customer_id on Create mode
    if (!data.is_edit_mode && !data.customer_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn khách hàng',
        path: ['customer_id'],
      })
    }

    if (data.is_edit_mode && !data.contract_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng nhập mã phiếu đặt cọc',
        path: ['contract_number'],
      })
    }

    // CR STT24: phải có tài liệu đính kèm (UNC/CCCD) mới cho lưu.
    // `attachments` chỉ chứa token của file MỚI upload; file cũ còn giữ nằm ở
    // `kept_attachment_ids` (FileUpload emit ngay khi mount). Ở màn Sửa phải cộng cả hai,
    // nếu không hợp đồng đã có file mà user không upload thêm sẽ bị chặn oan.
    const attachmentCount = data.attachments.length + (data.kept_attachment_ids?.length ?? 0)
    if (attachmentCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng đính kèm tài liệu',
        path: ['attachments'],
      })
    }

    // Validate total commission percentage equals 100
    const totalPercentage = data.sales_staff.reduce(
      (sum, staff) => sum + Number(staff.participation_percentage || 0),
      0
    )
    if (totalPercentage !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tổng tỷ lệ doanh thu phải bằng 100% (hiện tại: ' + totalPercentage + '%)',
        path: ['sales_staff'],
      })
    }

    // Hỏi với mọi hình thức thanh toán: tiền mặt đưa thẳng cho CĐT cũng là một nơi
    // nhận tiền có thật, và BE từ 14/08/2026 từ chối payload thiếu nó.
    if (!data.transfer_to_account) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn nguồn tiền',
        path: ['transfer_to_account'],
      })
    }
    if (data.payment_method === DepositContractPaymentMethod.transfer) {
      if (!data.source_account_holder_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vui lòng nhập tên tài khoản nguồn',
          path: ['source_account_holder_name'],
        })
      }
      if (!data.source_account_number?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vui lòng nhập số tài khoản nguồn',
          path: ['source_account_number'],
        })
      }
      if (!data.source_bank_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vui lòng nhập tên ngân hàng',
          path: ['source_bank_name'],
        })
      }
    }

    if (data.customer_type === CustomerType.individual) {
      const missingInfo: string[] = []
      if (missingInfo.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Khách hàng thiếu thông tin bắt buộc: ${missingInfo.join(', ')}. Vui lòng cập nhật.`,
          path: ['customer_id'],
        })
      }
    } else if (data.customer_type === CustomerType.business) {
      const missingInfo: string[] = []
      if (!data.business_name?.trim()) missingInfo.push('Tên doanh nghiệp')
      if (!data.business_tax_code?.trim()) missingInfo.push('Mã số thuế')
      if (!data.business_representative?.trim()) missingInfo.push('Người đại diện')
      if (missingInfo.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Doanh nghiệp thiếu thông tin bắt buộc: ${missingInfo.join(', ')}. Vui lòng cập nhật.`,
          path: ['customer_id'],
        })
      }
    }
  })

export type BookingContractFormValues = z.infer<typeof bookingContractFormSchema>

// We're using the API Booking type directly instead of this interface
// Keeping the enum for form components and filters that still reference it
