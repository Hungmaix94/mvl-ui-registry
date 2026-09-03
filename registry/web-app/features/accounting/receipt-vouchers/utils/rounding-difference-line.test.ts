import { describe, expect, it } from 'vitest'

import {
  isRoundingDifferenceLine,
  lineSignedTotal,
  roundingDifferenceLabel,
  splitInvoiceAllocationAcrossLines,
  ROUNDING_DIFFERENCE_LABEL,
  type AllocatableInvoiceLine,
} from './rounding-difference-line'

const unitLine = (over: Partial<AllocatableInvoiceLine> = {}): AllocatableInvoiceLine => ({
  id: 1,
  product_inventory: 101,
  deal: 2001,
  unit_number: 'A-12.05',
  description: 'Phí đại lý',
  line_total: '1000000',
  vat_amount: '100000',
  line_total_with_vat: '1100000',
  ...over,
})

const roundingLine = (over: Partial<AllocatableInvoiceLine> = {}): AllocatableInvoiceLine => ({
  id: 9,
  product_inventory: null,
  deal: null,
  unit_number: null,
  description: 'Chênh lệch làm tròn',
  line_total: '-1',
  vat_amount: '0',
  line_total_with_vat: '-1',
  ...over,
})

describe('isRoundingDifferenceLine', () => {
  it('nhận dòng không gắn căn / giao dịch / mã căn', () => {
    expect(isRoundingDifferenceLine(roundingLine())).toBe(true)
  })

  it('KHÔNG nhận dòng của một căn', () => {
    expect(isRoundingDifferenceLine(unitLine())).toBe(false)
  })

  it('id căn = 0 vẫn là có căn (0 là falsy nhưng hợp lệ)', () => {
    expect(
      isRoundingDifferenceLine(roundingLine({ product_inventory: 0, unit_number: 'A-00.01' }))
    ).toBe(false)
  })

  it('nhận theo cấu trúc, không phụ thuộc chữ trong description', () => {
    // BE đổi câu chữ thì dòng vẫn phải bị khoá — đây là lý do không bắt theo chuỗi.
    expect(isRoundingDifferenceLine(roundingLine({ description: 'Rounding adjustment' }))).toBe(
      true
    )
  })

  it('an toàn với null/undefined', () => {
    expect(isRoundingDifferenceLine(null)).toBe(false)
    expect(isRoundingDifferenceLine(undefined)).toBe(false)
  })
})

describe('lineSignedTotal', () => {
  it('giữ dấu ÂM (bản cũ gác `> 0` trả 0)', () => {
    expect(lineSignedTotal(roundingLine())).toBe(-1)
  })

  it('hàng hoá = 0, chỉ có thuế ⇒ lấy phần thuế', () => {
    expect(
      lineSignedTotal(
        roundingLine({ line_total: '0', vat_amount: '-3', line_total_with_vat: undefined })
      )
    ).toBe(-3)
  })

  it('hàng hoá và thuế NGƯỢC DẤU ⇒ cộng hai vế, không lấy mình line_total', () => {
    expect(
      lineSignedTotal(
        roundingLine({ line_total: '5', vat_amount: '-2', line_total_with_vat: undefined })
      )
    ).toBe(3)
  })

  it('ưu tiên line_total_with_vat khi BE có gửi', () => {
    expect(lineSignedTotal(unitLine())).toBe(1_100_000)
  })

  it('rơi về total_amount cho dòng giả lập khi hoá đơn chưa trả lines[]', () => {
    expect(
      lineSignedTotal({
        line_total: null,
        vat_amount: null,
        line_total_with_vat: null,
        total_amount: '750000',
      })
    ).toBe(750_000)
  })

  it('trả 0 cho dòng rỗng', () => {
    expect(lineSignedTotal({})).toBe(0)
    expect(lineSignedTotal(null)).toBe(0)
  })
})

describe('roundingDifferenceLabel', () => {
  it('dùng description của BE khi có', () => {
    expect(roundingDifferenceLabel(roundingLine())).toBe('Chênh lệch làm tròn')
  })

  it('có nhãn mặc định khi BE để trống', () => {
    expect(roundingDifferenceLabel(roundingLine({ description: '' }))).toBe(
      ROUNDING_DIFFERENCE_LABEL
    )
    expect(roundingDifferenceLabel(roundingLine({ description: null }))).toBe(
      ROUNDING_DIFFERENCE_LABEL
    )
  })
})

describe('splitInvoiceAllocationAcrossLines', () => {
  it('dòng chênh lệch làm tròn nhận ĐÚNG số của nó, phần còn lại chia cho các căn', () => {
    const lines = [
      unitLine({ id: 1, product_inventory: 101, line_total_with_vat: '600' }),
      unitLine({ id: 2, product_inventory: 102, line_total_with_vat: '400' }),
      roundingLine({ line_total_with_vat: '-1' }),
    ]

    const split = splitInvoiceAllocationAcrossLines(77, lines, 999)

    expect(split).toEqual([
      { rowKey: '77-0', allocatedAmount: 600 },
      { rowKey: '77-1', allocatedAmount: 400 },
      { rowKey: '77-2', allocatedAmount: -1 },
    ])
    expect(split.reduce((s, r) => s + r.allocatedAmount, 0)).toBe(999)
  })

  it('dòng căn cuối hấp thụ phần dư nên Σ luôn khớp tuyệt đối', () => {
    const lines = [
      unitLine({ id: 1, line_total_with_vat: '1' }),
      unitLine({ id: 2, line_total_with_vat: '1' }),
      unitLine({ id: 3, line_total_with_vat: '1' }),
    ]

    const split = splitInvoiceAllocationAcrossLines(5, lines, 100)

    expect(split.reduce((s, r) => s + r.allocatedAmount, 0)).toBe(100)
  })

  it('không có dòng căn nào ⇒ chỉ còn dòng chứng từ, giữ nguyên số của nó', () => {
    const split = splitInvoiceAllocationAcrossLines(
      5,
      [roundingLine({ line_total_with_vat: '-7' })],
      -7
    )

    expect(split).toEqual([{ rowKey: '5-0', allocatedAmount: -7 }])
  })

  it('mọi dòng căn đều 0 ⇒ chia đều, không chia cho 0', () => {
    const lines = [
      unitLine({ id: 1, line_total: '0', vat_amount: '0', line_total_with_vat: '0' }),
      unitLine({ id: 2, line_total: '0', vat_amount: '0', line_total_with_vat: '0' }),
    ]

    const split = splitInvoiceAllocationAcrossLines(5, lines, 100)

    expect(split.map((r) => r.allocatedAmount)).toEqual([50, 50])
  })
})
