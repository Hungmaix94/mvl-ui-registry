import { describe, expect, it } from 'vitest'
import {
  PaymentMethod,
  PayeeType,
} from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants'
import { paymentVoucherWizardSchema, toPaymentVoucherPayload } from './payment-voucher-schema'

// Trạng thái form hợp lệ tối thiểu sau khi điền xong Bước 1 (mirror giá trị thật từ UI:
// Select trả string id, CurrencyInput trả number)
const baseStep1 = {
  voucher_date: '2026-06-10',
  payee_type: PayeeType.EMPLOYEE,
  payee_name: 'Nguyen Van A',
  payee_employee: 7,
  payee_collaborator: null,
  payee_exchange: null,
  bank_on: true,
  bank_amount: 500000,
  from_bank_account: '3',
  bank_ref: '',
  cash_on: false,
  offset_on: false,
  accounting_period: 2,
  payment_method: PaymentMethod.TRANSFER,
  invoices: [],
  selected_invoice_ids: [],
  attachment: null,
}

const issuePaths = (result: ReturnType<typeof paymentVoucherWizardSchema.safeParse>) =>
  result.success ? [] : result.error.issues.map((i) => i.path.join('.'))

describe('paymentVoucherWizardSchema — payee theo loại đối tượng', () => {
  it('EMPLOYEE: pass khi đã chọn nhân viên cụ thể', () => {
    const result = paymentVoucherWizardSchema.safeParse(baseStep1)
    expect(result.success).toBe(true)
  })

  it('EMPLOYEE: fail tại payee_employee khi chỉ gõ tên mà chưa chọn nhân viên', () => {
    const result = paymentVoucherWizardSchema.safeParse({ ...baseStep1, payee_employee: null })
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('payee_employee')
  })

  it('COLLABORATOR: fail tại payee_collaborator khi chưa chọn CTV', () => {
    const result = paymentVoucherWizardSchema.safeParse({
      ...baseStep1,
      payee_type: PayeeType.COLLABORATOR,
      payee_employee: null,
      payee_collaborator: null,
    })
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('payee_collaborator')
  })

  it('EXCHANGE: fail tại payee_exchange khi chưa chọn sàn', () => {
    const result = paymentVoucherWizardSchema.safeParse({
      ...baseStep1,
      payee_type: PayeeType.EXCHANGE,
      payee_employee: null,
      payee_exchange: null,
    })
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('payee_exchange')
  })

  it('SUPPLIER: pass chỉ với tên người nhận (API không có FK nhà cung cấp)', () => {
    const result = paymentVoucherWizardSchema.safeParse({
      ...baseStep1,
      payee_type: PayeeType.SUPPLIER,
      payee_employee: null,
    })
    expect(result.success).toBe(true)
  })

  it('coerce string id từ Select: from_bank_account "3" → 3', () => {
    const result = paymentVoucherWizardSchema.safeParse(baseStep1)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.from_bank_account).toBe(3)
    }
  })
})

// CR 86eycj1de: "Mã tham chiếu ngân hàng" là tuỳ chọn ở Thêm mới/Sửa và cả Ghi sổ.
describe('bank_ref là tuỳ chọn (CR 86eycj1de)', () => {
  it('pass khi chuyển khoản nhưng bỏ trống mã tham chiếu', () => {
    const result = paymentVoucherWizardSchema.safeParse({ ...baseStep1, bank_ref: '' })
    expect(result.success).toBe(true)
    expect(issuePaths(result)).not.toContain('bank_ref')
  })

  it('payload bỏ qua mã tham chiếu rỗng thay vì gửi chuỗi trắng', () => {
    const parsed = paymentVoucherWizardSchema.parse({ ...baseStep1, bank_ref: '' })
    expect(toPaymentVoucherPayload(parsed).bank_ref).toBeUndefined()
  })

  it('vẫn giữ các validation khác: thiếu tài khoản chi thì fail', () => {
    const result = paymentVoucherWizardSchema.safeParse({
      ...baseStep1,
      bank_ref: '',
      from_bank_account: null,
    })
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('from_bank_account')
  })
})

describe('toPaymentVoucherPayload', () => {
  it('derive payment_method/total_amount và null hóa FK khác loại', () => {
    const parsed = paymentVoucherWizardSchema.parse({
      ...baseStep1,
      payee_collaborator: 99, // rác từ lần chọn loại trước — phải bị null hóa
    })
    const payload = toPaymentVoucherPayload(parsed)
    expect(payload.payment_method).toBe(PaymentMethod.TRANSFER)
    expect(payload.total_amount).toBe('500000')
    expect(payload.payee_employee).toBe(7)
    expect(payload.payee_collaborator).toBeNull()
    expect(payload.payee_exchange).toBeNull()
    expect(payload.from_bank_account).toBe(3)
    expect(payload.invoices).toBeUndefined()
  })

  it('tính toán total_amount = invoicesSum - offsetSum khi có hóa đơn và cấn trừ', () => {
    const parsed = paymentVoucherWizardSchema.parse({
      ...baseStep1,
      payee_type: PayeeType.EXCHANGE,
      payee_employee: null,
      payee_exchange: 5,
      bank_on: true,
      bank_amount: 700000,
      offset_on: true,
      offset_amount: 300000,
      invoices: [
        { input_invoice: 1, allocated_amount: '600000', allocation_pct: '60' },
        { input_invoice: 2, allocated_amount: '400000', allocation_pct: '40' },
      ],
      offset_invoices: [
        { sales_invoice: 10, allocated_amount: '200000', allocation_pct: '20' },
        { sales_invoice: 11, allocated_amount: '100000', allocation_pct: '10' },
      ],
    })
    const payload = toPaymentVoucherPayload(parsed)
    expect(payload.total_amount).toBe('700000') // 1,000,000 - 300,000 = 700,000
    expect(payload.payment_method).toBe(PaymentMethod.TRANSFER)
  })
})

describe('paymentVoucherWizardSchema — luồng thu thập hoa hồng F2', () => {
  // Bước 2 của luồng F2 không render ô số tiền: server tính từ các hóa đơn được tick.
  // Trước khi có cờ f2_collect, schema vẫn đòi bank_amount nên form fail trên field vô
  // hình và nút "Lưu phiếu chi" không có phản hồi gì.
  //
  // Tài khoản chi thì ngược lại: ô đó CÓ hiển thị và phải chọn. Bỏ qua nó thì mọi phiếu
  // F2 sinh ra đều là chuyển khoản không có tài khoản, kế toán phải mở màn sửa chỉ để
  // điền một ô.
  const f2Step1 = {
    ...baseStep1,
    payee_type: PayeeType.EXCHANGE,
    payee_employee: null,
    payee_exchange: 1896,
    f2_collect: true,
    bank_amount: undefined,
    from_bank_account: null,
  }

  it('pass khi chưa nhập tiền, miễn là đã chọn tài khoản chi', () => {
    const result = paymentVoucherWizardSchema.safeParse({ ...f2Step1, from_bank_account: 5 })
    expect(result.success).toBe(true)
  })

  it('chuyển khoản mà chưa chọn tài khoản chi thì chặn', () => {
    const result = paymentVoucherWizardSchema.safeParse(f2Step1)
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('from_bank_account')
  })

  it('chi tiền mặt thì không đòi tài khoản chi', () => {
    const result = paymentVoucherWizardSchema.safeParse({
      ...f2Step1,
      cash_on: true,
      bank_on: false,
    })
    expect(result.success).toBe(true)
  })

  it('vẫn bắt buộc chọn sàn giao dịch', () => {
    const result = paymentVoucherWizardSchema.safeParse({ ...f2Step1, payee_exchange: null })
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('payee_exchange')
  })

  it('không bật cờ thì vẫn đòi số tiền như luồng thủ công', () => {
    const result = paymentVoucherWizardSchema.safeParse({ ...f2Step1, f2_collect: false })
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('bank_amount')
  })
})
