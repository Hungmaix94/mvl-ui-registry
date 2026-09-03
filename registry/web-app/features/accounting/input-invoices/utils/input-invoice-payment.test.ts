import { describe, expect, it } from 'vitest'
import type { InputInvoice } from '../services/input-invoice-service'
import { formatPct } from '@/utils/common'
import {
  canCreatePaymentVoucherForInvoice,
  inputInvoiceDraftHoldingVouchers,
  inputInvoicePaidPct,
  inputInvoiceRemainingToPay,
  inputInvoiceSummaryRemaining,
} from './input-invoice-payment'
import {
  InputInvoiceStatus as InputInvoiceStatus,
  PaymentVoucherPayeeType as CounterpartyType,
} from '@/constants/api-schema-aliases'

function makeInvoice(overrides: Partial<InputInvoice> = {}): InputInvoice {
  return {
    id: 1,
    counterparty_type: CounterpartyType.EXCHANGE,
    status: InputInvoiceStatus.VERIFIED,
    total_amount: '100000000',
    total_amount_with_vat: '110000000',
    paid_amount: '0',
    lines: [],
    ...overrides,
  } as unknown as InputInvoice
}

describe('inputInvoiceRemainingToPay', () => {
  it('trừ số đã chi khỏi tổng đã gồm VAT', () => {
    expect(
      inputInvoiceRemainingToPay(
        makeInvoice({ total_amount_with_vat: '110000000', paid_amount: '40000000' })
      )
    ).toBe(70000000)
  })

  it('lùi về tiền hàng khi hóa đơn chưa có tổng gồm VAT', () => {
    const invoice = makeInvoice({ total_amount: '50000000', paid_amount: '20000000' })
    // The augmented type allows the VAT total to be absent on legacy rows.
    delete (invoice as { total_amount_with_vat?: unknown }).total_amount_with_vat
    expect(inputInvoiceRemainingToPay(invoice)).toBe(30000000)
  })

  it('coi chuỗi rỗng là THIẾU tổng gồm VAT, lùi về tiền hàng thay vì tính thành 0', () => {
    // Cột "Tổng cộng" của chính bảng này guard bằng truthiness -> chuỗi rỗng có thật ở client.
    // `??` không bắt được '' nên trước đây ra 0 - paid = số âm đỏ cho hóa đơn chưa tính VAT.
    const invoice = makeInvoice({
      total_amount_with_vat: '',
      total_amount: '80000000',
      paid_amount: '30000000',
    })
    expect(inputInvoiceRemainingToPay(invoice)).toBe(50000000)
    expect(inputInvoicePaidPct(invoice)).toBeCloseTo(37.5, 10)
  })

  it('trả số âm khi chi vượt, không kẹp về 0', () => {
    expect(
      inputInvoiceRemainingToPay(
        makeInvoice({ total_amount_with_vat: '10000000', paid_amount: '12000000' })
      )
    ).toBe(-2000000)
  })
})

describe('inputInvoicePaidPct', () => {
  it('chia cho Tổng cộng (đã gồm VAT), không phải Tiền hàng', () => {
    // 55tr / 110tr = 50%. Chia cho tiền hàng 100tr sẽ ra 55% — sai.
    expect(
      inputInvoicePaidPct(
        makeInvoice({
          total_amount: '100000000',
          total_amount_with_vat: '110000000',
          paid_amount: '55000000',
        })
      )
    ).toBe(50)
  })

  it('hóa đơn chi hết đọc đúng 100%, không vượt trần', () => {
    expect(
      inputInvoicePaidPct(
        makeInvoice({ total_amount_with_vat: '110000000', paid_amount: '110000000' })
      )
    ).toBe(100)
  })

  it('trả 0 khi tổng tiền bằng 0 — nghiệp vụ chốt hiện 0%, không hiện "—"', () => {
    expect(inputInvoicePaidPct(makeInvoice({ total_amount_with_vat: '0', paid_amount: '0' }))).toBe(
      0
    )
    expect(formatPct(inputInvoicePaidPct(makeInvoice({ total_amount_with_vat: '0' })), 1)).toBe(
      '0%'
    )
  })

  it('làm tròn NỬA LÊN tới 1 số lẻ: 0,07% hiện thành 0,1%', () => {
    const pct = inputInvoicePaidPct(
      makeInvoice({ total_amount_with_vat: '100000000', paid_amount: '70000' })
    )
    expect(pct).toBeCloseTo(0.07, 10)
    expect(formatPct(pct, 1)).toBe('0,1%')
  })

  it('hóa đơn điều chỉnh có tổng ÂM và chưa chi thì ra 0%, KHÔNG phải "-0%"', () => {
    // 0 / số âm = -0 trong IEEE 754, Intl in ra "-0%". Bắt được khi verify HDIN000000212.
    const pct = inputInvoicePaidPct(
      makeInvoice({ total_amount_with_vat: '-10999989', paid_amount: '0' })
    )
    expect(Object.is(pct, -0)).toBe(false)
    expect(formatPct(pct, 1)).toBe('0%')
  })

  it('không kẹp khi chi vượt — 120% vẫn hiện 120%', () => {
    expect(
      inputInvoicePaidPct(
        makeInvoice({ total_amount_with_vat: '10000000', paid_amount: '12000000' })
      )
    ).toBe(120)
  })
})

describe('inputInvoiceSummaryRemaining', () => {
  it('lấy hiệu của hai tổng mà endpoint /summary/ trả về', () => {
    expect(inputInvoiceSummaryRemaining(900000000, 350000000)).toBe(550000000)
  })

  it('trả null khi thiếu một vế — dòng tổng in "—" thay vì số 0 sai', () => {
    expect(inputInvoiceSummaryRemaining(null, 350000000)).toBeNull()
    expect(inputInvoiceSummaryRemaining(900000000, null)).toBeNull()
  })

  it('giữ số âm khi cả tập lọc bị chi vượt', () => {
    expect(inputInvoiceSummaryRemaining(100000000, 120000000)).toBe(-20000000)
  })
})

describe('inputInvoiceDraftHoldingVouchers', () => {
  it('gom phiếu nháp giữ chỗ từ mọi dòng và loại trùng', () => {
    const invoice = makeInvoice({
      lines: [
        { holding_vouchers: [{ id: 7, code: 'PC000000007' }] },
        {
          holding_vouchers: [
            { id: 7, code: 'PC000000007' },
            { id: 9, code: 'PC000000009' },
          ],
        },
      ],
    } as unknown as Partial<InputInvoice>)

    expect(inputInvoiceDraftHoldingVouchers(invoice)).toEqual([
      { id: 7, code: 'PC000000007' },
      { id: 9, code: 'PC000000009' },
    ])
  })

  it('trả mảng rỗng khi hóa đơn chưa nạp dòng', () => {
    const invoice = makeInvoice()
    delete (invoice as { lines?: unknown }).lines
    expect(inputInvoiceDraftHoldingVouchers(invoice)).toEqual([])
  })
})

describe('canCreatePaymentVoucherForInvoice', () => {
  it('cho phép với hóa đơn F2 đã xác nhận và còn tiền chưa chi', () => {
    expect(canCreatePaymentVoucherForInvoice(makeInvoice())).toBe(true)
  })

  it('cho phép với hóa đơn đã chi một phần (PARTIAL)', () => {
    expect(
      canCreatePaymentVoucherForInvoice(
        makeInvoice({ status: InputInvoiceStatus.PARTIAL, paid_amount: '10000000' })
      )
    ).toBe(true)
  })

  it('chặn khi đối tác không phải sàn liên kết — BE 400 unsupported counterparty', () => {
    for (const counterparty of [
      CounterpartyType.COLLABORATOR,
      CounterpartyType.SUPPLIER,
      CounterpartyType.EMPLOYEE,
    ]) {
      expect(
        canCreatePaymentVoucherForInvoice(makeInvoice({ counterparty_type: counterparty }))
      ).toBe(false)
    }
  })

  it('chặn khi hóa đơn chưa được xác nhận', () => {
    for (const status of [
      InputInvoiceStatus.DRAFT,
      InputInvoiceStatus.PENDING,
      InputInvoiceStatus.RECEIVED,
      InputInvoiceStatus.REJECTED,
    ]) {
      expect(canCreatePaymentVoucherForInvoice(makeInvoice({ status }))).toBe(false)
    }
  })

  it('chặn khi hóa đơn đã chi hết', () => {
    expect(
      canCreatePaymentVoucherForInvoice(
        makeInvoice({ status: InputInvoiceStatus.PAID, paid_amount: '110000000' })
      )
    ).toBe(false)
  })

  it('chặn khi hóa đơn còn tiền nhưng đã ở trạng thái PAID', () => {
    expect(
      canCreatePaymentVoucherForInvoice(
        makeInvoice({ status: InputInvoiceStatus.PAID, paid_amount: '0' })
      )
    ).toBe(false)
  })

  it('vẫn cho phép khi đang có phiếu nháp giữ chỗ — nghiệp vụ muốn cảnh báo, không ẩn nút', () => {
    const invoice = makeInvoice({
      lines: [{ holding_vouchers: [{ id: 7, code: 'PC000000007' }] }],
    } as unknown as Partial<InputInvoice>)
    expect(canCreatePaymentVoucherForInvoice(invoice)).toBe(true)
  })

  it('chặn khi chưa có hóa đơn', () => {
    expect(canCreatePaymentVoucherForInvoice(null)).toBe(false)
  })
})
