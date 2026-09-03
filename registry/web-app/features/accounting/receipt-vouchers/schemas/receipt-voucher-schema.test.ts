import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  receiptVoucherSchema,
  receiptVoucherStep1Schema,
  toReceiptVoucherPayload,
  type ReceiptVoucherFormValues,
} from './receipt-voucher-schema'

// Regression guard (PT000000664): the commission period is force-synced by the BE from
// `accounting_period`, so the FE must NEVER send commission_period_year/month again. If
// someone re-adds those fields to the payload builder, this test fails.
describe('toReceiptVoucherPayload', () => {
  const base = {
    receipt_date: '2026-07-01',
    payer_type: 'INVESTOR',
    payer_investor: 1,
    bank_on: true,
    bank_amount: '1000000',
    to_bank_account: 10,
    accounting_period: 42,
    invoices: [],
  } as unknown as ReceiptVoucherFormValues

  it('does not emit commission_period_year/month', () => {
    const payload = toReceiptVoucherPayload(base)
    expect(payload).not.toHaveProperty('commission_period_year')
    expect(payload).not.toHaveProperty('commission_period_month')
  })

  it('still forwards accounting_period (the BE syncs the period from it)', () => {
    const payload = toReceiptVoucherPayload(base)
    expect(payload.accounting_period).toBe(42)
  })

  it('omits commission period fields for an offset receipt too', () => {
    const offset = {
      ...base,
      bank_on: false,
      offset_on: true,
      offset_invoices: [{ input_invoice: 5, allocated_amount: '500000' }],
    } as unknown as ReceiptVoucherFormValues
    const payload = toReceiptVoucherPayload(offset)
    expect(payload).not.toHaveProperty('commission_period_year')
    expect(payload).not.toHaveProperty('commission_period_month')
  })
})

// CR 86eycj1de: "Mã tham chiếu ngân hàng" chuyển từ bắt buộc sang tuỳ chọn ở Thêm mới/Sửa
// (và cả Ghi sổ). Các test dưới chặn việc vô tình gắn lại required cho bank_transaction_ref.
describe('bank_transaction_ref là tuỳ chọn (CR 86eycj1de)', () => {
  const transferStep1 = {
    receipt_date: '2026-07-01',
    payer_type: 'INVESTOR',
    payer_investor: 1,
    payer_name: 'Chủ đầu tư A',
    bank_on: true,
    bank_amount: '1000000',
    to_bank_account: 10,
    cash_on: false,
    offset_on: false,
    accounting_period: 42,
  }

  // Nhận kết quả safeParse của cả schema bước 1 lẫn schema đầy đủ.
  const issuePaths = (result: z.SafeParseReturnType<unknown, unknown>) =>
    result.success ? [] : result.error.issues.map((i) => i.path.join('.'))

  it('step 1: pass khi chuyển khoản nhưng bỏ trống mã tham chiếu', () => {
    const result = receiptVoucherStep1Schema.safeParse(transferStep1)
    expect(result.success).toBe(true)
  })

  it('step 1: không sinh lỗi ở bank_transaction_ref khi chuỗi rỗng', () => {
    const result = receiptVoucherStep1Schema.safeParse({
      ...transferStep1,
      bank_transaction_ref: '   ',
    })
    expect(issuePaths(result)).not.toContain('bank_transaction_ref')
  })

  it('schema đầy đủ: pass khi chuyển khoản nhưng bỏ trống mã tham chiếu', () => {
    const result = receiptVoucherSchema.safeParse({ ...transferStep1, invoices: [] })
    expect(result.success).toBe(true)
  })

  it('vẫn giữ các validation khác: thiếu tài khoản nhận thì fail', () => {
    const result = receiptVoucherSchema.safeParse({
      ...transferStep1,
      to_bank_account: null,
      invoices: [],
    })
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('to_bank_account')
  })

  it('payload bỏ qua mã tham chiếu rỗng thay vì gửi chuỗi trắng', () => {
    const payload = toReceiptVoucherPayload({
      ...transferStep1,
      bank_transaction_ref: '',
      invoices: [],
    } as unknown as ReceiptVoucherFormValues)
    expect(payload.bank_transaction_ref).toBeUndefined()
  })
})
