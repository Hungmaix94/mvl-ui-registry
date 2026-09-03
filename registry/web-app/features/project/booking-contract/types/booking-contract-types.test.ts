import { describe, expect, it } from 'vitest'
import { bookingContractFormSchema } from './booking-contract-types'
import {
  BookingTransferToAccount,
  DepositContractPaymentMethod,
} from '@/constants/api-schema-aliases'
import { parseCurrencyVND } from '@/utils/common'

/**
 * Characterization tests cho `bookingContractFormSchema`.
 *
 * Mục đích KHÔNG phải mô tả hành vi mong muốn, mà **chốt hành vi hiện tại** để làm lưới
 * an toàn cho việc viết lại schema theo hướng transform-free (bỏ `preprocess`/`transform`
 * để `z.input === z.output`, gỡ được cast ở `BookingContractForm`). Xem
 * docs/ai/conventions.md § Validation & Zod và § Chống double-submit.
 *
 * Trước khi có file này, form tạo hợp đồng đặt chỗ — luồng có giá trị tài chính cao nhất —
 * không có một test nào. Đừng đổi expectation ở đây để "cho test xanh": nếu một expectation
 * fail sau khi ngài sửa schema, tức hành vi validate đã đổi, phải xác nhận là có chủ đích.
 */

/** Payload tối thiểu hợp lệ ở chế độ TẠO MỚI. */
function makeValidCreatePayload(overrides: Record<string, unknown> = {}) {
  return {
    customer_id: 1,
    investor_id: 10,
    project_id: 20,
    booking_date: new Date(2026, 6, 1),
    payment_amount: 1_000_000,
    payment_method: DepositContractPaymentMethod.cash,
    // Bắt buộc với mọi hình thức thanh toán từ 14/08/2026, kể cả tiền mặt.
    transfer_to_account: BookingTransferToAccount.investor,
    sales_staff: [{ employee_id: 5, participation_percentage: '100' }],
    // CR STT24: đính kèm là bắt buộc, nên payload "tối thiểu hợp lệ" phải có ít nhất 1 file.
    attachments: ['file-token-1'],
    ...overrides,
  }
}

describe('bookingContractFormSchema — payload tối thiểu', () => {
  it('chấp nhận payload tạo mới tối thiểu và tự điền status mặc định', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(makeValidCreatePayload())

    // Assert
    expect(result.success).toBe(true)
    // `status` có `.default()` → đây chính là lý do z.input != z.output (TS2719).
    if (result.success) expect(result.data.status).toBeDefined()
  })
})

describe('bookingContractFormSchema — preprocess ngày (dd/MM/yyyy)', () => {
  it('nhận chuỗi dd/MM/yyyy cho customer_dob và trả về Date đúng ngày local', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ customer_dob: '15/05/1990' })
    )

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      const dob = result.data.customer_dob as Date
      expect(dob.getFullYear()).toBe(1990)
      expect(dob.getMonth()).toBe(4) // tháng 5, 0-indexed
      expect(dob.getDate()).toBe(15)
    }
  })

  it('coi chuỗi rỗng là undefined chứ không phải ngày sai', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ customer_dob: '', customer_id_issued_date: '' })
    )

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customer_dob).toBeUndefined()
      expect(result.data.customer_id_issued_date).toBeUndefined()
    }
  })

  /**
   * ⚠️ PHÁT HIỆN — hành vi hiện tại KHÔNG như ý định của code.
   * Schema khai `invalid_type_error: 'Ngày sinh không hợp lệ'`, nhưng message đó
   * **không bao giờ tới người dùng**: `z.coerce.date()` ép chuỗi rác qua `new Date()`
   * thành Invalid Date, và lỗi phát ra là default của zod — `'Invalid date'` (tiếng Anh).
   * Chưa sửa vì fix đúng phải đổi `z.coerce.date` → `z.date`, mà như vậy sẽ chặn luôn
   * chuỗi `yyyy-MM-dd` từ API ở chế độ sửa (coerce đang xử lý được, `z.date` thì không).
   * TODO: xác nhận mọi shape của `customer_dob` trong initialValues rồi mới đổi.
   * Test này chốt hành vi HIỆN TẠI để việc sửa sau này không âm thầm.
   */
  it('hiện chỉ báo "Invalid date" (tiếng Anh) khi customer_dob không parse được', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ customer_dob: 'không-phải-ngày' })
    )

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('Invalid date')
      expect(messages).not.toContain('Ngày sinh không hợp lệ')
    }
  })

  it('nhận chuỗi dd/MM/yyyy cho booking_date', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ booking_date: '01/07/2026' })
    )

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      const bookingDate = result.data.booking_date as Date
      expect(bookingDate.getFullYear()).toBe(2026)
      expect(bookingDate.getMonth()).toBe(6)
      expect(bookingDate.getDate()).toBe(1)
    }
  })

  it('từ chối booking_date ở tương lai', () => {
    // Arrange
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ booking_date: tomorrow })
    )

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain(
        'Ngày đặt chỗ không được ở tương lai'
      )
    }
  })
})

describe('bookingContractFormSchema — preprocess customer_gender', () => {
  it('hạ chữ thường giá trị gender gửi lên dạng HOA', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ customer_gender: 'MALE' })
    )

    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.customer_gender).toBe('male')
  })

  // Regression: trước đây nhánh string bắt luôn '' nên gender rỗng làm submit fail.
  it('coi chuỗi rỗng là undefined thay vì làm fail z.enum', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ customer_gender: '' })
    )

    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.customer_gender).toBeUndefined()
  })
})

describe('bookingContractFormSchema — transform product_inventory_id', () => {
  it.each([
    ['chuỗi rỗng', '', undefined],
    ['null', null, undefined],
  ])('quy %s về undefined', (_label, input, expected) => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ product_inventory_id: input })
    )

    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.product_inventory_id).toBe(expected)
  })

  it('ép chuỗi số về number', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ product_inventory_id: '42' })
    )

    // Assert
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.product_inventory_id).toBe(42)
  })
})

describe('bookingContractFormSchema — superRefine theo chế độ', () => {
  it('bắt buộc customer_id khi TẠO MỚI', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ customer_id: null, is_edit_mode: false })
    )

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join('.') === 'customer_id')
      expect(issue?.message).toBe('Vui lòng chọn khách hàng')
    }
  })

  it('bắt buộc contract_number khi SỬA, và không bắt buộc customer_id', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ customer_id: null, is_edit_mode: true, contract_number: '   ' })
    )

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('contract_number')
      expect(paths).not.toContain('customer_id')
    }
  })
})

describe('bookingContractFormSchema — tài liệu đính kèm (CR STT24)', () => {
  it('từ chối lưu khi không có tài liệu đính kèm nào', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ attachments: [], kept_attachment_ids: [] })
    )

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join('.') === 'attachments')
      expect(issue?.message).toBe('Vui lòng đính kèm tài liệu')
    }
  })

  it('từ chối lưu khi bỏ trống hẳn field đính kèm', () => {
    // Arrange
    const { attachments: _omitted, ...withoutAttachments } = makeValidCreatePayload()

    // Act
    const result = bookingContractFormSchema.safeParse(withoutAttachments)

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('attachments')
    }
  })

  it('chấp nhận khi có file mới upload', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ attachments: ['token-a'] })
    )

    // Assert
    expect(result.success).toBe(true)
  })

  it('chấp nhận khi SỬA mà chỉ giữ lại file cũ, không upload thêm', () => {
    // Arrange — màn Sửa: file cũ giữ lại nằm ở kept_attachment_ids, attachments rỗng.
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({
        is_edit_mode: true,
        contract_number: '2026-000001',
        attachments: [],
        kept_attachment_ids: [101],
      })
    )

    // Assert
    expect(result.success).toBe(true)
  })
})

describe('bookingContractFormSchema — ràng buộc nghiệp vụ', () => {
  it('bắt buộc tổng tỷ lệ tham gia của sales_staff bằng 100%', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({
        sales_staff: [
          { employee_id: 5, participation_percentage: '60' },
          { employee_id: 6, participation_percentage: '30' },
        ],
      })
    )

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join('.') === 'sales_staff')
      expect(issue?.message).toContain('phải bằng 100%')
      expect(issue?.message).toContain('90%')
    }
  })

  it('chấp nhận khi tổng tỷ lệ chia nhiều người vừa đủ 100%', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({
        sales_staff: [
          { employee_id: 5, participation_percentage: '70' },
          { employee_id: 6, participation_percentage: '30' },
        ],
      })
    )

    // Assert
    expect(result.success).toBe(true)
  })

  it('bắt buộc transfer_to_account kể cả khi trả tiền mặt', () => {
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({
        payment_method: DepositContractPaymentMethod.cash,
        transfer_to_account: undefined,
      })
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.map((i) => i.path.join('.'))).toContain('transfer_to_account')
  })

  it('bắt buộc transfer_to_account khi hình thức là chuyển khoản', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({
        payment_method: DepositContractPaymentMethod.transfer,
        transfer_to_account: undefined,
      })
    )

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join('.'))).toContain('transfer_to_account')
    }
  })

  // Chuyển khoản còn bắt buộc đủ 3 field tài khoản nguồn — khớp SRS §4.3
  // (Transfer → bắt buộc tên chủ TK / số TK / tên ngân hàng nguồn).
  it('bắt buộc đủ 3 field tài khoản nguồn khi chuyển khoản', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({
        payment_method: DepositContractPaymentMethod.transfer,
        transfer_to_account: BookingTransferToAccount.mv,
      })
    )

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('source_account_holder_name')
      expect(paths).toContain('source_account_number')
      expect(paths).toContain('source_bank_name')
    }
  })

  it('chấp nhận chuyển khoản khi đã đủ tài khoản thụ hưởng và tài khoản nguồn', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({
        payment_method: DepositContractPaymentMethod.transfer,
        transfer_to_account: BookingTransferToAccount.mv,
        source_account_holder_name: 'NGUYEN VAN A',
        source_account_number: '0123456789',
        source_bank_name: 'Vietcombank',
      })
    )

    // Assert
    expect(result.success).toBe(true)
  })
})

describe('bookingContractFormSchema — thông báo lỗi bắt buộc', () => {
  it.each([
    ['investor_id', 'Vui lòng chọn chủ đầu tư'],
    ['project_id', 'Vui lòng chọn dự án'],
    // 86eyqrt6r: trước đây ô để trống rơi vào `invalid_type_error` nên báo "Số tiền không hợp
    // lệ". Đổi expectation này là CÓ CHỦ ĐÍCH — `z.coerce` biến `undefined` thành `NaN` nên
    // `required_error` không bao giờ chạy, phải đặt cả hai thông báo giống nhau.
    ['payment_amount', 'Vui lòng nhập số tiền thanh toán'],
  ])('báo lỗi tiếng Việt khi thiếu %s', (field, message) => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ [field]: undefined })
    )

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain(message)
    }
  })
})

/**
 * 86eyqrk7h — sàn "số tiền thanh toán phải > 0".
 *
 * QA gõ `000.000` vào ô Số tiền thanh toán và hợp đồng vẫn lưu, BE trả 200. `CurrencyInput`
 * quy chuỗi đó về đúng số `0` (`formatNumericString` bỏ hết ký tự không phải chữ số, rồi
 * `parseCurrencyVND` parse ra 0), mà schema khi đó dùng `.min(0)` nên 0 lọt qua.
 *
 * ĐÂY KHÔNG PHẢI HỒI QUY: `.min(0)` có từ commit đầu tiên của tính năng (0cb684355,
 * 18/03/2026) và chưa từng bị sửa; SRS 19.1 test-spec 7.1.4 còn ghi "không có giới hạn
 * Project → 201 Thành công". Luật > 0 là luật MỚI do user chốt 26/08/2026.
 */
describe('bookingContractFormSchema — số tiền thanh toán phải > 0 (86eyqrk7h)', () => {
  // Ghim TIỀN ĐỀ của cả nhóm test này: chuỗi QA gõ thật sự quy về số 0. Không có ca này thì
  // "000.000 bị chặn" chỉ là lời khẳng định trong comment — ai đó đổi `parseCurrencyVND` là
  // lập luận sập mà mọi test dưới vẫn xanh.
  it.each([
    ['000.000 (đúng chuỗi QA gõ)', '000.000'],
    ['0', '0'],
    ['00', '00'],
  ])('ô tiền quy "%s" về số 0', (_label, typed) => {
    // Act + Assert
    expect(parseCurrencyVND(typed)).toBe(0)
  })

  it.each([
    ['0 trần', 0],
    ['chuỗi "0"', '0'],
    ['số âm', -1_000_000],
  ])('từ chối %s', (_label, amount) => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ payment_amount: amount })
    )

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain(
        'Số tiền thanh toán phải lớn hơn 0'
      )
    }
  })

  // Chứng: phép từ chối ở trên là do SÀN, không phải do payload mẫu hỏng. Thiếu ca này thì
  // một mutation biến `.min(1)` thành `.min(Number.MAX_SAFE_INTEGER)` vẫn xanh hết.
  it('vẫn chấp nhận số tiền nhỏ nhất hợp lệ (1đ)', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ payment_amount: 1 })
    )

    // Assert
    expect(result.success).toBe(true)
  })

  // Ô trống phải giữ nguyên thông báo "Vui lòng nhập..." của 86eyqrt6r, KHÔNG rơi sang câu
  // "phải lớn hơn 0" — bỏ trống và gõ số 0 là hai lỗi khác nhau với người dùng.
  it('ô để trống vẫn báo "Vui lòng nhập số tiền thanh toán", không báo sàn', () => {
    // Act
    const result = bookingContractFormSchema.safeParse(
      makeValidCreatePayload({ payment_amount: undefined })
    )

    // Assert
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('Vui lòng nhập số tiền thanh toán')
      expect(messages).not.toContain('Số tiền thanh toán phải lớn hơn 0')
    }
  })
})
