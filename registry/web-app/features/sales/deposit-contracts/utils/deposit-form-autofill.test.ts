import { describe, expect, it, vi } from 'vitest'
import {
  applyCommissionToForm,
  clearBookingAutofill,
  extractSaleStaffIds,
} from './deposit-form-autofill'

const RATE_TYPE = { PCT: 'pct', AMT: 'amt' } as const

describe('applyCommissionToForm', () => {
  it('correctly maps percentage-based commission and returns values', () => {
    const setValueMock = vi.fn()
    const commission = {
      pct_agency_fee: '4.50',
      pct_sale_commission: '2.00',
      pct_revenue: '3.50',
      amt_revenue: null,
    }

    const result = applyCommissionToForm(setValueMock as any, commission)

    expect(result).toEqual({ pct: 2.0, amt: undefined })
    expect(setValueMock).toHaveBeenCalledWith('pct_agency_fee', 4.5, { shouldValidate: true })
    expect(setValueMock).toHaveBeenCalledWith('pct_sale_commission', 2.0, { shouldValidate: true })
    expect(setValueMock).toHaveBeenCalledWith('amt_sale_commission', undefined, {
      shouldValidate: true,
    })
    expect(setValueMock).toHaveBeenCalledWith('sale_commission_type', RATE_TYPE.PCT, {
      shouldValidate: true,
    })
    expect(setValueMock).toHaveBeenCalledWith('pct_revenue', 3.5, { shouldValidate: true })
    expect(setValueMock).toHaveBeenCalledWith('revenue_type', RATE_TYPE.PCT, {
      shouldValidate: true,
    })
  })

  it('correctly maps amount-based commission and returns values', () => {
    const setValueMock = vi.fn()
    const commission = {
      pct_agency_fee: '3.00',
      amt_sale_commission: '15000000',
      pct_sale_commission: '0.00',
      amt_revenue: '10000000',
      pct_revenue: null,
    }

    const result = applyCommissionToForm(setValueMock as any, commission)

    expect(result).toEqual({ pct: undefined, amt: 15000000 })
    expect(setValueMock).toHaveBeenCalledWith('pct_agency_fee', 3.0, { shouldValidate: true })
    expect(setValueMock).toHaveBeenCalledWith('amt_sale_commission', 15000000, {
      shouldValidate: true,
    })
    expect(setValueMock).toHaveBeenCalledWith('pct_sale_commission', undefined, {
      shouldValidate: true,
    })
    expect(setValueMock).toHaveBeenCalledWith('sale_commission_type', RATE_TYPE.AMT, {
      shouldValidate: true,
    })
    expect(setValueMock).toHaveBeenCalledWith('amt_revenue', 10000000, { shouldValidate: true })
    expect(setValueMock).toHaveBeenCalledWith('revenue_type', RATE_TYPE.AMT, {
      shouldValidate: true,
    })
  })

  it('handles null/empty commission gracefully', () => {
    const setValueMock = vi.fn()

    const result = applyCommissionToForm(setValueMock as any, null)

    expect(result).toEqual({ pct: undefined, amt: undefined })
    expect(setValueMock).toHaveBeenCalledWith('pct_agency_fee', undefined, { shouldValidate: true })
    expect(setValueMock).toHaveBeenCalledWith('pct_sale_commission', undefined, {
      shouldValidate: true,
    })
    expect(setValueMock).toHaveBeenCalledWith('amt_sale_commission', undefined, {
      shouldValidate: true,
    })
    expect(setValueMock).toHaveBeenCalledWith('sale_commission_type', RATE_TYPE.PCT, {
      shouldValidate: true,
    })
  })
})

describe('extractSaleStaffIds', () => {
  it('correctly extracts exchId when exchange is null but exchange_detail has id', () => {
    const sale = {
      sale_type: 'partner',
      exchange: null,
      exchange_detail: { id: 42, name: 'Sàn F2 Test' },
    }
    const ids = extractSaleStaffIds(sale)
    expect(ids).toEqual({ empId: null, exchId: 42, colId: null })
  })

  it('correctly extracts IDs when numeric properties exist', () => {
    const sale = {
      employee: 10,
      exchange: 20,
      collaborator: 30,
    }
    const ids = extractSaleStaffIds(sale)
    expect(ids).toEqual({ empId: 10, exchId: 20, colId: 30 })
  })

  it('handles empty/null sale object', () => {
    expect(extractSaleStaffIds(null)).toEqual({ empId: null, exchId: null, colId: null })
  })
})

/**
 * ClickUp 86eyqr9e0 — "đã chọn khách hàng mà vẫn báo Vui lòng chọn khách hàng".
 *
 * Bỏ hết HĐ đặt chỗ liên quan ⇒ gỡ autofill. Hai luật dưới đây LÀ nội dung bản sửa; test này giữ
 * chúng, đừng nới lỏng khi thấy đỏ mà chưa đọc docblock của `clearBookingAutofill`.
 */
describe('clearBookingAutofill (86eyqr9e0)', () => {
  const fieldsTouched = (setValue: ReturnType<typeof vi.fn>) =>
    setValue.mock.calls.map((call) => call[0] as string)

  it('KHÔNG bao giờ đụng tới `customer` — khách hàng không phải "con" của HĐ đặt chỗ', () => {
    const setValue = vi.fn()

    clearBookingAutofill(setValue as any, { investor: 7, project: 9, customer: 42 } as any)

    // Đối chứng: hàm CÓ chạy và CÓ reset các field khác — nếu không, phép "không chứa customer"
    // dưới đây sẽ đúng một cách vô nghĩa.
    expect(fieldsTouched(setValue)).toContain('investor')
    expect(fieldsTouched(setValue)).not.toContain('customer')
  })

  it('KHÔNG validate — lỗi bắn trước lần submit đầu sẽ kẹt lại trên màn (mode: onSubmit)', () => {
    const setValue = vi.fn()

    clearBookingAutofill(setValue as any, null)

    expect(setValue.mock.calls.length).toBeGreaterThan(0)
    for (const [field, , options] of setValue.mock.calls) {
      expect(options, `field "${field}" phải reset im lặng, không validate`).toEqual({
        shouldValidate: false,
      })
    }
  })

  it('vẫn gỡ autofill của các field còn lại: màn Tạo mới (không có initialValues) về rỗng', () => {
    const setValue = vi.fn()

    clearBookingAutofill(setValue as any, null)

    expect(setValue).toHaveBeenCalledWith('investor', null, { shouldValidate: false })
    expect(setValue).toHaveBeenCalledWith('project', null, { shouldValidate: false })
    expect(setValue).toHaveBeenCalledWith('product_inventory', null, { shouldValidate: false })
    expect(setValue).toHaveBeenCalledWith('listed_price', undefined, { shouldValidate: false })
    expect(setValue).toHaveBeenCalledWith('supplementary_amount', 0, { shouldValidate: false })
  })

  it('màn Sửa: trả các field còn lại về đúng giá trị đã lưu của hợp đồng', () => {
    const setValue = vi.fn()

    clearBookingAutofill(setValue as any, {
      investor: 3,
      project: 11,
      product_inventory: 205,
      listed_price: 2_500_000_000,
      fee_calculation_price: 2_400_000_000,
      registration_amount: 50_000_000,
      supplementary_amount: 1_000_000,
    })

    expect(setValue).toHaveBeenCalledWith('investor', 3, { shouldValidate: false })
    expect(setValue).toHaveBeenCalledWith('project', 11, { shouldValidate: false })
    expect(setValue).toHaveBeenCalledWith('product_inventory', 205, { shouldValidate: false })
    expect(setValue).toHaveBeenCalledWith('listed_price', 2_500_000_000, { shouldValidate: false })
    expect(setValue).toHaveBeenCalledWith('registration_amount', 50_000_000, {
      shouldValidate: false,
    })
  })
})
