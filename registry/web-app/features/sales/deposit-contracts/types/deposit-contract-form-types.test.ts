import { describe, expect, it } from 'vitest'

import { BookingRefundSaleSale_type as SaleType } from '@/api/schema'
import { depositContractFormSchema } from './deposit-contract-form-types'
import { DepositContractPaymentMethod as PaymentMethod } from '@/constants/api-schema-aliases'

/** Payload hợp lệ tối thiểu — từng test chỉ ghi đè phần đang kiểm tra. */
function buildValues(overrides: Record<string, unknown> = {}) {
  return {
    customer: 1,
    investor: 2,
    project: 3,
    product_inventory: 4,
    contract_date: new Date('2026-07-22'),
    registration_amount: 1_000_000,
    payment_method: PaymentMethod.transfer,
    // Bắt buộc với mọi hình thức thanh toán từ 14/08/2026, kể cả tiền mặt.
    transfer_to_account: 'mv',
    sales_staff: [{ sale_type: SaleType.mv, employee: 10, percentage: 100 }],
    // CR STT24: đính kèm là bắt buộc, nên payload "tối thiểu hợp lệ" phải có ít nhất 1 file.
    attachments: ['file-token-1'],
    ...overrides,
  }
}

function errorsFor(values: Record<string, unknown>, field: string) {
  const result = depositContractFormSchema.safeParse(values)
  if (result.success) return []
  return result.error.issues.filter((issue) => issue.path.join('.') === field)
}

describe('depositContractFormSchema — tài liệu đính kèm (CR STT24)', () => {
  it('rejects saving a deposit contract with no attachment at all', () => {
    // Arrange
    const values = buildValues({ attachments: [], kept_attachment_ids: [] })

    // Act
    const issues = errorsFor(values, 'attachments')

    // Assert
    expect(issues).toHaveLength(1)
    expect(issues[0].message).toBe('Vui lòng đính kèm tài liệu')
  })

  it('rejects saving when the attachment field is omitted entirely', () => {
    // Arrange
    const { attachments: _omitted, ...withoutAttachments } = buildValues()

    // Act
    const issues = errorsFor(withoutAttachments, 'attachments')

    // Assert
    expect(issues).toHaveLength(1)
  })

  it('accepts a newly uploaded file token', () => {
    // Act
    const result = depositContractFormSchema.safeParse(buildValues({ attachments: ['token-a'] }))

    // Assert
    expect(result.success).toBe(true)
  })

  it('accepts an edit that keeps existing files without uploading a new one', () => {
    // Arrange — màn Sửa: file cũ giữ lại nằm ở kept_attachment_ids, attachments rỗng.
    const values = buildValues({ attachments: [], kept_attachment_ids: [101] })

    // Act
    const result = depositContractFormSchema.safeParse(values)

    // Assert
    expect(result.success).toBe(true)
  })
})

describe('depositContractFormSchema — hình thức thanh toán', () => {
  it('accepts a payload that states the payment method', () => {
    const result = depositContractFormSchema.safeParse(buildValues())

    expect(result.success).toBe(true)
  })

  it('accepts a payload with no payment method when there is no supplementary amount', () => {
    const result = depositContractFormSchema.safeParse(
      buildValues({ payment_method: undefined, supplementary_amount: 0 })
    )

    expect(result.success).toBe(true)
  })

  it('rejects a payment method outside the backend enum when supplementary amount > 0', () => {
    const issues = errorsFor(
      buildValues({ supplementary_amount: 5_000_000, payment_method: 'card' }),
      'payment_method'
    )

    expect(issues).toHaveLength(1)
  })

  it('rejects adding a supplementary amount without a payment method', () => {
    const issues = errorsFor(
      buildValues({
        booking: 9,
        booking_ids: [9],
        supplementary_amount: 5_000_000,
        payment_method: undefined,
      }),
      'payment_method'
    )

    expect(issues).toHaveLength(1)
    expect(issues[0].message).toBe('Vui lòng chọn hình thức thanh toán')
  })

  it('requires source account details when supplementary amount is transferred', () => {
    const values = buildValues({
      supplementary_amount: 5_000_000,
      payment_method: PaymentMethod.transfer,
    })

    expect(errorsFor(values, 'source_account_name')).toHaveLength(1)
    expect(errorsFor(values, 'source_account_number')).toHaveLength(1)
    expect(errorsFor(values, 'source_bank_name')).toHaveLength(1)
  })

  // ClickUp 86eyqjbtb: ô số tài khoản trước đây chỉ chặn "để trống", nên mọi chuỗi rác đều
  // đi lọt xuống BE — nơi cũng không kiểm khuôn dạng. Cùng luật với ô "Số tài khoản" của
  // hộp thoại Hoàn tiền, vì hai ô cùng đổ về cột `CharField(max_length=50)`.
  describe('khuôn dạng số tài khoản nguồn (ClickUp 86eyqjbtb)', () => {
    const transferred = (sourceAccountNumber: string) =>
      buildValues({
        supplementary_amount: 5_000_000,
        payment_method: PaymentMethod.transfer,
        source_account_name: 'NGUYEN VAN A',
        source_account_number: sourceAccountNumber,
        source_bank_name: 'Ngân hàng TMCP Ngoại thương Việt Nam',
      })

    it('nhận số tài khoản chỉ gồm chữ số', () => {
      expect(depositContractFormSchema.safeParse(transferred('9999888877')).success).toBe(true)
    })

    it('từ chối chữ cái, dấu cách và ký tự đặc biệt', () => {
      for (const bad of [
        'VCB0123456789',
        '0123 4567 89',
        '0123-4567',
        "'9999888877",
        'abc!!!###',
      ]) {
        const issues = errorsFor(transferred(bad), 'source_account_number')
        expect(issues, bad).toHaveLength(1)
        expect(issues[0].message).toBe('Số tài khoản chỉ được chứa chữ số')
      }
    })

    it('từ chối chuỗi dài hơn bề rộng cột DB và nói rõ là dài quá', () => {
      const issues = errorsFor(transferred('9'.repeat(51)), 'source_account_number')

      expect(issues).toHaveLength(1)
      expect(issues[0].message).toBe('Số tài khoản không vượt quá 50 ký tự')
    })

    // Bỏ trống là "chưa nhập", KHÔNG phải "sai khuôn dạng" — thứ tự hai luật này mà đảo thì
    // người dùng chưa gõ gì đã bị mắng về khuôn dạng.
    it('để trống vẫn báo là chưa nhập, không phải sai khuôn dạng', () => {
      const issues = errorsFor(transferred('   '), 'source_account_number')

      expect(issues).toHaveLength(1)
      expect(issues[0].message).toBe('Vui lòng nhập số tài khoản nguồn')
    })
  })

  // Nơi nhận tiền hỏi với mọi hình thức thanh toán và không phụ thuộc tiền bổ sung:
  // tiền mặt đưa thẳng cho CĐT cũng là một nơi giữ tiền có thật, và chính nhóm này
  // trước đây để trống 100%.
  it('requires the custody account for a cash deposit too', () => {
    const issues = errorsFor(
      buildValues({
        payment_method: PaymentMethod.cash,
        supplementary_amount: 0,
        transfer_to_account: undefined,
      }),
      'transfer_to_account'
    )

    expect(issues).toHaveLength(1)
    expect(issues[0].message).toBe('Vui lòng chọn nguồn tiền')
  })

  it('does not ask for an account number for the two standard accounts', () => {
    for (const target of ['mv', 'investor']) {
      const issues = errorsFor(
        buildValues({ supplementary_amount: 0, transfer_to_account: target }),
        'custom_account_number'
      )
      expect(issues).toHaveLength(0)
    }
  })

  it('does not require source account details when supplementary amount is paid in cash', () => {
    const result = depositContractFormSchema.safeParse(
      buildValues({ supplementary_amount: 5_000_000, payment_method: PaymentMethod.cash })
    )

    expect(result.success).toBe(true)
  })

  it('does not require source account details when there is no supplementary amount', () => {
    const result = depositContractFormSchema.safeParse(
      buildValues({ supplementary_amount: 0, payment_method: PaymentMethod.transfer })
    )

    expect(result.success).toBe(true)
  })
})
