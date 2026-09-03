import { describe, it, expect } from 'vitest'
import { ATTACHMENT_REQUIRED_MESSAGE, getCustomerSchema } from './customerFormSchema'

const customerFormSchema = getCustomerSchema('create')
const customerEditSchema = getCustomerSchema('edit')

/** CR 18.1 bắt buộc đính kèm — mọi payload hợp lệ phải mang theo ít nhất 1 tài liệu. */
const attachments = { attachment_tokens: ['token-1'] }

describe('customerFormSchema', () => {
  it('should validate valid individual customer inputs with relaxed optional fields', () => {
    const data = {
      customer_type: 'individual',
      full_name: 'Nguyen Van A',
      phone: '0987654321',
      id_number: 'B1234567', // Alphanumeric passport
      email: 'nva@example.com',
      ...attachments,
    }

    const result = customerFormSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should fail validation for invalid email format', () => {
    const data = {
      customer_type: 'individual',
      full_name: 'Nguyen Van A',
      phone: '0987654321',
      id_number: 'B1234567',
      email: 'invalid-email',
      ...attachments,
    }

    const result = customerFormSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('should validate individual customer with optional fields omitted', () => {
    const data = {
      customer_type: 'individual',
      full_name: 'Tran Thi B',
      phone: '0912345678',
      id_number: '123456789',
      email: 'ttb@example.com',
      ...attachments,
    }

    const result = customerFormSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should validate business customer with relaxed optional fields', () => {
    const data = {
      customer_type: 'business',
      business_name: 'Cong ty TNHH MVL',
      business_tax_code: '123456789',
      phone: '0281234567',
      email: 'mvl@example.com',
      ...attachments,
    }

    const result = customerFormSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  /**
   * `CustomerForm` khai báo defaultValues cho CẢ hai loại khách hàng trong cùng một
   * `useForm`, nên state luôn mang theo `full_name` (cá nhân) lẫn `business_name` (DN).
   * Payload gửi lên BE là output đã parse của resolver — nhánh nào thì chỉ còn field của
   * nhánh đó. Nếu discriminatedUnion ngừng strip, KH doanh nghiệp sẽ ghi đè `full_name`
   * bằng rác từ ô "Họ và tên" mà người dùng không hề thấy.
   */
  it('strips individual-only fields out of a business payload', () => {
    const formState = {
      customer_type: 'business',
      business_name: 'Cong ty TNHH MVL',
      business_tax_code: '123456789',
      phone: '0281234567',
      email: 'mvl@example.com',
      ...attachments,
      // Rác còn lại từ defaultValues dùng chung của nhánh cá nhân:
      full_name: 'Nguyen Van A',
      id_number: '123456789',
      gender: 'male',
      address_detail: '123 Le Loi',
    }

    const result = customerFormSchema.safeParse(formState)
    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data).not.toHaveProperty('full_name')
    expect(result.data).not.toHaveProperty('id_number')
    expect(result.data).not.toHaveProperty('gender')
    expect(result.data).not.toHaveProperty('address_detail')
    expect(result.data).toHaveProperty('business_name', 'Cong ty TNHH MVL')
  })

  it('strips business-only fields out of an individual payload', () => {
    const formState = {
      customer_type: 'individual',
      full_name: 'Nguyen Van A',
      phone: '0987654321',
      id_number: 'B1234567',
      email: 'nva@example.com',
      ...attachments,
      business_name: 'Cong ty TNHH MVL',
      business_tax_code: '123456789',
    }

    const result = customerFormSchema.safeParse(formState)
    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data).not.toHaveProperty('business_name')
    expect(result.data).not.toHaveProperty('business_tax_code')
    expect(result.data).toHaveProperty('full_name', 'Nguyen Van A')
  })
})

/**
 * CR 18.1 — "Bắt buộc đính kèm file khi tạo mới/chỉnh sửa thông tin khách hàng".
 *
 * Ở chế độ chỉnh sửa, tài liệu hợp lệ có thể đến từ 2 nguồn: file mới upload
 * (`attachment_tokens`) hoặc file cũ được giữ lại (`attachment_keep_ids`). Chỉ khi cả hai
 * cùng rỗng mới bị chặn.
 */
describe('customerFormSchema — bắt buộc tài liệu đính kèm', () => {
  const individualBase = {
    customer_type: 'individual',
    full_name: 'Nguyen Van A',
    phone: '0987654321',
    id_number: 'B1234567',
    email: 'nva@example.com',
  }

  function attachmentIssues(result: ReturnType<typeof customerFormSchema.safeParse>) {
    if (result.success) return []
    return result.error.issues.filter((issue) => issue.path[0] === 'attachment_tokens')
  }

  it('chặn tạo mới khi không có tài liệu nào', () => {
    const result = customerFormSchema.safeParse(individualBase)

    expect(result.success).toBe(false)
    expect(attachmentIssues(result)).toHaveLength(1)
    expect(attachmentIssues(result)[0].message).toBe(ATTACHMENT_REQUIRED_MESSAGE)
  })

  it('chặn tạo mới khi attachment_tokens chỉ chứa chuỗi rỗng', () => {
    // `FileUpload` trả về [''] khi ô upload còn trống — không được tính là có tài liệu.
    const result = customerFormSchema.safeParse({
      ...individualBase,
      attachment_tokens: ['', ''],
    })

    expect(result.success).toBe(false)
    expect(attachmentIssues(result)).toHaveLength(1)
  })

  it('chặn khách hàng doanh nghiệp tạo mới không có tài liệu', () => {
    const result = customerFormSchema.safeParse({
      customer_type: 'business',
      business_name: 'Cong ty TNHH MVL',
      business_tax_code: '123456789',
      phone: '0281234567',
      email: 'mvl@example.com',
    })

    expect(result.success).toBe(false)
    expect(attachmentIssues(result)).toHaveLength(1)
  })

  it('cho phép chỉnh sửa khi chỉ giữ lại file cũ, không upload file mới', () => {
    const result = customerEditSchema.safeParse({
      ...individualBase,
      attachment_tokens: [],
      attachment_keep_ids: [12],
    })

    expect(result.success).toBe(true)
  })

  it('chặn chỉnh sửa khi người dùng xoá hết file cũ và không upload file mới', () => {
    const result = customerEditSchema.safeParse({
      ...individualBase,
      attachment_tokens: [],
      attachment_keep_ids: [],
    })

    expect(result.success).toBe(false)
    expect(attachmentIssues(result)[0].message).toBe(ATTACHMENT_REQUIRED_MESSAGE)
  })

  /**
   * `ZodEffects` bỏ qua refinement khi schema bên trong parse "aborted". Nếu ràng buộc đính kèm
   * chỉ nằm ở `.superRefine()` bọc ngoài union thì submit form trống sẽ chỉ hiện lỗi các field
   * bắt buộc khác, phải sửa hết rồi submit lần hai mới lòi ra lỗi thiếu tài liệu. Ở mode 'create'
   * ràng buộc đặt ở field level nên hai loại lỗi phải cùng xuất hiện trong MỘT lượt validate.
   */
  it('báo lỗi thiếu tài liệu cùng lượt với lỗi field bắt buộc khác (tạo mới)', () => {
    const result = customerFormSchema.safeParse({
      customer_type: 'individual',
      phone: '0987654321',
      email: 'nva@example.com',
      id_number: 'B1234567',
      // thiếu full_name (bắt buộc) và thiếu luôn tài liệu đính kèm
    })

    expect(result.success).toBe(false)
    if (result.success) return

    const paths = result.error.issues.map((issue) => issue.path[0])
    expect(paths).toContain('full_name')
    expect(paths).toContain('attachment_tokens')
  })

  it('không tính attachment_keep_ids ở chế độ tạo mới', () => {
    // Ở màn tạo mới không tồn tại file cũ; nếu state còn sót keep_ids thì vẫn phải chặn.
    const result = customerFormSchema.safeParse({
      ...individualBase,
      attachment_keep_ids: [12],
    })

    expect(result.success).toBe(false)
    expect(attachmentIssues(result)).toHaveLength(1)
  })
})
