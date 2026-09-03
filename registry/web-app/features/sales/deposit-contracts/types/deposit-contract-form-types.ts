import { z } from 'zod'
// Lấy enum trực tiếp từ schema (service chỉ re-export) để tầng types không phụ thuộc tầng service.
import { BookingRefundSaleSale_type as SaleType } from '@/api/schema.ts'
import {
  CtvLineType,
  DepositContractPaymentMethod,
  F2Source as F2SourceType,
} from '@/constants/api-schema-aliases'
import {
  BANK_ACCOUNT_NUMBER_FORMAT_MESSAGE,
  BANK_ACCOUNT_NUMBER_MAX_LENGTH,
  BANK_ACCOUNT_NUMBER_MAX_MESSAGE,
  isValidBankAccountNumber,
} from '@/utils/bank-account-number'

/** Discriminator cho các cặp tỉ lệ / số tiền (pct_* vs amt_*). */
export const RATE_TYPE = { PCT: 'pct', AMT: 'amt' } as const
export type RateType = (typeof RATE_TYPE)[keyof typeof RATE_TYPE]

/** Loại khách hàng (frontend state — không phải field của form). */
export const CUSTOMER_TYPE = { INDIVIDUAL: 'individual', BUSINESS: 'business' } as const
export type CustomerType = (typeof CUSTOMER_TYPE)[keyof typeof CUSTOMER_TYPE]
export const depositContractSaleSchema = z
  .object({
    id: z.number().optional(),
    employee: z.number().nullable().optional(),
    exchange: z.number().nullable().optional(),
    collaborator: z.number().nullable().optional(),
    employee_detail: z.any().optional(),
    exchange_detail: z.any().optional(),
    collaborator_detail: z.any().optional(),
    sale_type: z.nativeEnum(SaleType),
    percentage: z.coerce.number().min(0).max(100),
    pct_commission: z.coerce.number().min(0).nullable().optional(),
    amt_commission: z.coerce.number().min(0).nullable().optional(),
    is_confirmed: z.boolean().optional(),
    confirmed_at: z.string().nullable().optional(),
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
    if (data.sale_type === SaleType.mv && !data.employee) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn nhân sự bán hàng',
        path: ['employee'],
      })
    }
    if (data.sale_type === SaleType.partner && !data.exchange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn đại lý / sàn liên kết',
        path: ['exchange'],
      })
    }
    if (
      data.sale_type === SaleType.partner &&
      data.f2_source === F2SourceType.director &&
      !data.f2_source_director_id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn giám đốc cho nguồn giám đốc kinh doanh',
        path: ['f2_source_director_id'],
      })
    }
    if (data.sale_type === SaleType.collaborator) {
      if (!data.collaborator) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vui lòng chọn cộng tác viên',
          path: ['collaborator'],
        })
      }
      if (!data.ctv_line_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vui lòng chọn loại line',
          path: ['ctv_line_type'],
        })
      } else {
        if (data.ctv_line_type === CtvLineType.exchange_dept && !data.ctv_line_department_id) {
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

export const depositContractFormSchema = z
  .object({
    contract_number: z.string().optional(),
    booking: z.number().nullable().optional(),
    customer: z
      .preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
        z.number().nullable()
      )
      .refine((val): boolean => val !== null, {
        message: 'Vui lòng chọn khách hàng',
      }),
    investor: z
      .preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
        z.number().nullable()
      )
      .refine((val): boolean => val !== null, {
        message: 'Vui lòng chọn chủ đầu tư',
      }),
    project: z
      .preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
        z.number().nullable()
      )
      .refine((val): boolean => val !== null, {
        message: 'Vui lòng chọn dự án',
      }),
    product_inventory: z
      .preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
        z.number().nullable()
      )
      .refine((val): boolean => val !== null, {
        message: 'Vui lòng chọn bất động sản',
      }),
    booking_ids: z.array(z.number()).optional().default([]),

    contract_date: z
      .union([
        z.date({
          required_error: 'Vui lòng chọn ngày đặt cọc',
          invalid_type_error: 'Ngày đặt cọc không hợp lệ',
        }),
        z.string().min(1, 'Vui lòng chọn ngày đặt cọc'),
      ])
      .nullable()
      .refine((val) => val !== null && val !== undefined && val !== '', {
        message: 'Vui lòng chọn ngày đặt cọc',
      }),
    supplementary_amount: z.coerce.number().min(0).optional().default(0),
    registration_amount: z
      .preprocess(
        (val) => {
          if (val === '' || val === null || val === undefined) return undefined
          const num = Number(val)
          return isNaN(num) ? undefined : num
        },
        z.number({
          required_error: 'Vui lòng nhập số tiền đặt cọc / Giữ chỗ',
          invalid_type_error: 'Vui lòng nhập số tiền đặt cọc / Giữ chỗ',
        })
      )
      .refine((val) => val > 0, {
        message: 'Số tiền đặt cọc / Giữ chỗ phải lớn hơn 0',
      }),
    listed_price: z.coerce.number().nullable().optional(),
    fee_calculation_price: z.coerce.number().nullable().optional(),
    pct_sale_commission: z.coerce.number().nullable().optional(),
    amt_sale_commission: z.coerce.number().nullable().optional(),
    sale_commission_type: z.nativeEnum(RATE_TYPE).optional().default(RATE_TYPE.PCT),
    pct_revenue: z.coerce.number().nullable().optional(),
    amt_revenue: z.coerce.number().nullable().optional(),
    revenue_type: z.nativeEnum(RATE_TYPE).optional(),
    pct_agency_fee: z.coerce.number().nullable().optional(),
    note: z.string().optional(),
    /**
     * v3 (18.8) — cờ "sẽ có đề xuất hỗ trợ phí": bật thì BE chặn MỌI bước duyệt cọc cho
     * tới khi phiếu đề xuất được DUYỆT (không còn chỉ cần "đã tạo" như bản 1b/DR-7 cũ).
     * Chặn ở cả bước đẩy sang kế toán, nên cọc vướng vẫn dừng ở trạng thái sửa được.
     */
    // Cờ "Giao dịch này có đề xuất hỗ trợ phí bán hàng" — điều phối tạo/hủy phiếu
    // hỗ trợ bán hàng liên kết (xem useFeeSupportProposalToggle).
    has_fee_support_proposal: z.boolean().optional().default(false),

    /** Hình thức thanh toán — chỉ bắt buộc khi có tiền bổ sung > 0. */
    payment_method: z.nativeEnum(DepositContractPaymentMethod).nullish().optional(),
    source_account_name: z.string().optional(),
    source_account_number: z.string().optional(),
    source_bank_name: z.string().optional(),

    /**
     * Tiền cọc chuyển VÀO tài khoản nào — khác hẳn `source_account_*` (tài khoản
     * khách chuyển ĐI). Đây là thứ quyết định MVL có đang cầm tiền hay không, và
     * do đó có phải đòi lại từ CĐT trước khi hoàn cho khách hay không.
     *
     * Optional ở model: hợp đồng tạo từ chuyển đổi phiếu đặt chỗ thì BE tự kế thừa,
     * và app mobile không gửi field này. Web bắt buộc khi không kế thừa được.
     */
    transfer_to_account: z.string().optional(),

    attachments: z.array(z.any()).optional().default([]),
    kept_attachment_ids: z.array(z.number()).optional(),
    attachments_detail: z.any().array().optional(),

    sales_staff: z
      .array(depositContractSaleSchema)
      .min(1, 'Cần ít nhất một người/sàn bán hàng')
      .refine(
        (sales) => {
          const total = sales.reduce((sum, sale) => sum + (Number(sale.percentage) || 0), 0)
          return Math.abs(total - 100) < 0.01 // Cho phép sai số nhỏ do float
        },
        (sales) => {
          const total = sales.reduce((sum, sale) => sum + (Number(sale.percentage) || 0), 0)
          return {
            message: `Tổng tỷ lệ doanh thu phải bằng 100% (hiện tại: ${total}%)`,
          }
        }
      ),
  })
  .superRefine((data, ctx) => {
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

    const isSupplementaryAmountGtZero = Number(data.supplementary_amount) > 0

    // Nơi nhận tiền hỏi với MỌI hình thức thanh toán, không riêng chuyển khoản và không
    // phụ thuộc tiền bổ sung: tiền mặt đưa thẳng cho CĐT cũng phải ghi nhận, và BE từ
    // 14/08/2026 từ chối payload thiếu nó. "Tài khoản khác" đã bị gỡ khỏi enum nên cặp
    // field số-tài-khoản-nhận không còn tồn tại.
    if (!data.transfer_to_account?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn nguồn tiền',
        path: ['transfer_to_account'],
      })
    }

    if (isSupplementaryAmountGtZero) {
      if (!data.payment_method) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vui lòng chọn hình thức thanh toán',
          path: ['payment_method'],
        })
      } else if (data.payment_method === DepositContractPaymentMethod.transfer) {
        if (!data.source_account_name?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Vui lòng nhập tên tài khoản nguồn',
            path: ['source_account_name'],
          })
        }
        // Cùng luật khuôn dạng với ô "Số tài khoản" của hộp thoại Hoàn tiền (ClickUp
        // 86eyqjbtb): hai ô cùng đổ về một kiểu cột `CharField(max_length=50)` bên BE, mà
        // BE không kiểm khuôn dạng ở ô nào cả. Bỏ trống vẫn phải nghe "chưa nhập" trước.
        const sourceAccountNumber = data.source_account_number?.trim() ?? ''
        if (!sourceAccountNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Vui lòng nhập số tài khoản nguồn',
            path: ['source_account_number'],
          })
        } else if (!isValidBankAccountNumber(sourceAccountNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              sourceAccountNumber.length > BANK_ACCOUNT_NUMBER_MAX_LENGTH
                ? BANK_ACCOUNT_NUMBER_MAX_MESSAGE
                : BANK_ACCOUNT_NUMBER_FORMAT_MESSAGE,
            path: ['source_account_number'],
          })
        }
        if (!data.source_bank_name?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Vui lòng chọn ngân hàng nguồn',
            path: ['source_bank_name'],
          })
        }
      }
    }
  })

export type DepositContractFormValues = z.infer<typeof depositContractFormSchema>
export type DepositContractSaleValues = z.infer<typeof depositContractSaleSchema>
