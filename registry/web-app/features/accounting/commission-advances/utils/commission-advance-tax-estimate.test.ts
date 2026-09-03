import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TAX_ESTIMATE_RATE,
  MAX_TAX_ESTIMATE_RATE,
  MIN_TAX_ESTIMATE_RATE,
  TAX_ESTIMATE_RATES,
  TAX_ESTIMATE_RATE_OPTIONS,
  TAX_ESTIMATE_RATE_STEP,
  advanceAmountForLine,
  clampTaxRate,
  findShareForRecipient,
  grossShareForRecipient,
  estimateNetAfterTax,
  isApprovedOverEstimatedNet,
  remainingGross,
  stepTaxRate,
  sumRecipientGrossTotals,
  type CommissionShareLike,
} from './commission-advance-tax-estimate'

describe('TAX_ESTIMATE_RATES / options', () => {
  it('offers exactly the four rates BA chốt cho task 86eympqft', () => {
    expect([...TAX_ESTIMATE_RATES]).toEqual([0, 10, 20, 35])
  })

  it('defaults to 10%', () => {
    expect(DEFAULT_TAX_ESTIMATE_RATE).toBe(10)
  })

  it('renders options as string value + percent label for Select', () => {
    expect(TAX_ESTIMATE_RATE_OPTIONS).toEqual([
      { value: '0', label: '0%' },
      { value: '10', label: '10%' },
      { value: '20', label: '20%' },
      { value: '35', label: '35%' },
    ])
  })
})

describe('clampTaxRate', () => {
  it('keeps a rate that is already inside [0, 100]', () => {
    expect(clampTaxRate(0)).toBe(0)
    expect(clampTaxRate(17)).toBe(17)
    expect(clampTaxRate(100)).toBe(100)
  })

  it('clamps out-of-range rates to the bounds', () => {
    expect(clampTaxRate(-40)).toBe(MIN_TAX_ESTIMATE_RATE)
    expect(clampTaxRate(1_000)).toBe(MAX_TAX_ESTIMATE_RATE)
  })

  it('falls back to the default rate for non-numeric input instead of leaking NaN', () => {
    // NaN sẽ lan xuống mọi số thực nhận và màn hình hiện "NaN VNĐ".
    expect(clampTaxRate(Number.NaN)).toBe(DEFAULT_TAX_ESTIMATE_RATE)
    expect(clampTaxRate(undefined)).toBe(DEFAULT_TAX_ESTIMATE_RATE)
    expect(clampTaxRate(null)).toBe(DEFAULT_TAX_ESTIMATE_RATE)
  })
})

describe('stepTaxRate (nút ±5%)', () => {
  it('steps by exactly the configured step', () => {
    expect(TAX_ESTIMATE_RATE_STEP).toBe(5)
    expect(stepTaxRate(10, TAX_ESTIMATE_RATE_STEP)).toBe(15)
    expect(stepTaxRate(10, -TAX_ESTIMATE_RATE_STEP)).toBe(5)
  })

  it('steps from an off-grid rate without snapping to a multiple of the step', () => {
    expect(stepTaxRate(17, TAX_ESTIMATE_RATE_STEP)).toBe(22)
    expect(stepTaxRate(17, -TAX_ESTIMATE_RATE_STEP)).toBe(12)
  })

  it('never walks outside [0, 100]', () => {
    expect(stepTaxRate(2, -TAX_ESTIMATE_RATE_STEP)).toBe(MIN_TAX_ESTIMATE_RATE)
    expect(stepTaxRate(98, TAX_ESTIMATE_RATE_STEP)).toBe(MAX_TAX_ESTIMATE_RATE)
    expect(stepTaxRate(MIN_TAX_ESTIMATE_RATE, -TAX_ESTIMATE_RATE_STEP)).toBe(MIN_TAX_ESTIMATE_RATE)
    expect(stepTaxRate(MAX_TAX_ESTIMATE_RATE, TAX_ESTIMATE_RATE_STEP)).toBe(MAX_TAX_ESTIMATE_RATE)
  })
})

describe('findShareForRecipient', () => {
  const employeeShare: CommissionShareLike = {
    employee: { id: 7 },
    calculated_amount: '20000000',
  }
  const ctvShareOfSameEmployee: CommissionShareLike = {
    employee: { id: 7 },
    recipient_kind: 'ctv_referrer',
    calculated_amount: '5000000',
  }
  const collaboratorShare: CommissionShareLike = {
    collaborator: { id: 42 },
    calculated_amount: '9000000',
  }
  const shares = [ctvShareOfSameEmployee, employeeShare, collaboratorShare]

  it('matches an employee line to the internal employee share', () => {
    expect(findShareForRecipient(shares, { recipient_employee: 7 })).toBe(employeeShare)
  })

  it('never matches an employee line to a CTV share that carries the same employee id', () => {
    // Đây là bug thật nếu bỏ isEmployeeShare: dòng nhân viên ăn nhầm tiền gốc của dòng CTV.
    expect(
      findShareForRecipient([ctvShareOfSameEmployee], { recipient_employee: 7 })
    ).toBeUndefined()
  })

  it('matches a collaborator line by collaborator id', () => {
    expect(findShareForRecipient(shares, { recipient_collaborator: 42 })).toBe(collaboratorShare)
  })

  it('returns undefined when nothing matches, and when inputs are missing', () => {
    expect(findShareForRecipient(shares, { recipient_employee: 999 })).toBeUndefined()
    expect(findShareForRecipient(undefined, { recipient_employee: 7 })).toBeUndefined()
    expect(findShareForRecipient(shares, null)).toBeUndefined()
    expect(findShareForRecipient(shares, {})).toBeUndefined()
  })
})

describe('grossShareForRecipient', () => {
  const shares: CommissionShareLike[] = [{ employee: { id: 7 }, calculated_amount: '20000000' }]

  it('reads calculated_amount as a number', () => {
    expect(grossShareForRecipient(shares, { recipient_employee: 7 })).toBe(20_000_000)
  })

  it('returns undefined — not 0 — when the line matches no share', () => {
    // 0 sẽ hiển thị như "không được nhận đồng nào"; chưa biết thì phải ra '—'.
    expect(grossShareForRecipient(shares, { recipient_employee: 999 })).toBeUndefined()
  })

  it('returns undefined when calculated_amount is not a number', () => {
    expect(
      grossShareForRecipient([{ employee: { id: 7 }, calculated_amount: 'n/a' }], {
        recipient_employee: 7,
      })
    ).toBeUndefined()
  })
})

describe('estimateNetAfterTax', () => {
  it('applies each of the four rates to a 20M share', () => {
    expect(estimateNetAfterTax(20_000_000, 0)).toBe(20_000_000)
    expect(estimateNetAfterTax(20_000_000, 10)).toBe(18_000_000)
    expect(estimateNetAfterTax(20_000_000, 20)).toBe(16_000_000)
    expect(estimateNetAfterTax(20_000_000, 35)).toBe(13_000_000)
  })

  it('matches the formula the Tạo/Sửa form has been shipping (floor of gross × (1 − rate))', () => {
    // Nguồn đối chiếu độc lập: cột "Ước tính thực nhận" ở CommissionAdvanceForm.
    const cases: Array<[number, number]> = [
      [12_345_678, 10],
      [7_777_777, 35],
      [999, 20],
      [1, 35],
    ]
    for (const [gross, rate] of cases) {
      expect(estimateNetAfterTax(gross, rate)).toBe(Math.floor(gross * (1 - rate / 100)))
    }
  })

  it('rounds DOWN so the figure never promises more than the recipient nets', () => {
    expect(estimateNetAfterTax(999, 20)).toBe(799) // 799.2 -> 799
    expect(estimateNetAfterTax(1, 35)).toBe(0) // 0.65 -> 0
  })

  it('returns undefined when the gross share is unknown', () => {
    expect(estimateNetAfterTax(undefined, 10)).toBeUndefined()
    expect(estimateNetAfterTax(null, 10)).toBeUndefined()
    expect(estimateNetAfterTax(Number.NaN, 10)).toBeUndefined()
  })

  it('treats a 0 gross share as a known 0, not as unknown', () => {
    expect(estimateNetAfterTax(0, 10)).toBe(0)
  })

  it('clamps an out-of-range rate instead of producing a negative or inflated net', () => {
    expect(estimateNetAfterTax(20_000_000, 150)).toBe(0)
    expect(estimateNetAfterTax(20_000_000, -50)).toBe(20_000_000)
  })

  it('falls back to the default rate when the rate is not a number', () => {
    expect(estimateNetAfterTax(20_000_000, Number.NaN)).toBe(18_000_000)
  })
})

describe('isApprovedOverEstimatedNet', () => {
  it('flags an approved amount above the estimated net', () => {
    expect(isApprovedOverEstimatedNet(19_000_000, 18_000_000)).toBe(true)
  })

  it('does not flag an amount equal to or below the estimated net', () => {
    expect(isApprovedOverEstimatedNet(18_000_000, 18_000_000)).toBe(false)
    expect(isApprovedOverEstimatedNet(1_000_000, 18_000_000)).toBe(false)
  })

  it('does not invent a warning when the estimated net is unknown', () => {
    expect(isApprovedOverEstimatedNet(19_000_000, undefined)).toBe(false)
  })
})

describe('advanceAmountForLine', () => {
  it('uses the approved amount once the line has been approved', () => {
    expect(
      advanceAmountForLine({ requested_amount: '20000000', approved_amount: '19500000' })
    ).toBe(19_500_000)
  })

  it('falls back to the requested amount while the line is still awaiting approval', () => {
    expect(advanceAmountForLine({ requested_amount: '20000000', approved_amount: null })).toBe(
      20_000_000
    )
    expect(advanceAmountForLine({ requested_amount: '20000000' })).toBe(20_000_000)
  })

  it('keeps an approved 0 as a real 0 instead of falling back to the requested amount', () => {
    // Duyệt 0đ là một quyết định, không phải "chưa duyệt".
    expect(advanceAmountForLine({ requested_amount: '20000000', approved_amount: '0' })).toBe(0)
  })

  it('reads numbers as well as the decimal strings the API returns', () => {
    expect(
      advanceAmountForLine({ requested_amount: 20_000_000, approved_amount: 19_500_000 })
    ).toBe(19_500_000)
  })

  it('treats an unusable amount as 0 so no NaN reaches the screen', () => {
    expect(advanceAmountForLine({ requested_amount: 'n/a' })).toBe(0)
    expect(advanceAmountForLine({})).toBe(0)
    expect(advanceAmountForLine(null)).toBe(0)
  })
})

describe('remainingGross (HH còn lại)', () => {
  it('subtracts the amount this voucher takes from the whole-unit commission', () => {
    // Ảnh BA gửi 15/08: Duy có HH cả căn 71.880.000, phiếu duyệt 19.500.000.
    expect(remainingGross(71_880_000, 19_500_000)).toBe(52_380_000)
  })

  it('returns undefined — not 0 — when the whole-unit commission is unknown', () => {
    // Phiếu tạm ứng theo kỳ (deal = null) không tra được bảng chia ⇒ cột phải ra '—'.
    expect(remainingGross(undefined, 19_500_000)).toBeUndefined()
    expect(remainingGross(null, 19_500_000)).toBeUndefined()
    expect(remainingGross(Number.NaN, 19_500_000)).toBeUndefined()
  })

  it('goes negative when the voucher takes more than the whole-unit commission', () => {
    // Không kẹp về 0: ứng vượt HH là đúng thứ màn này sinh ra để kế toán nhìn thấy.
    expect(remainingGross(71_880_000, 80_000_000)).toBe(-8_120_000)
  })

  it('treats a known 0 whole-unit commission as known', () => {
    expect(remainingGross(0, 0)).toBe(0)
  })
})

describe('sumRecipientGrossTotals (dòng TỔNG CỘNG)', () => {
  it('cộng đúng hai cột trên ba dòng đều tra được bảng chia', () => {
    expect(
      sumRecipientGrossTotals([
        { gross: 71_880_000, advanceAmount: 19_500_000 },
        { gross: 86_256_000, advanceAmount: 14_500_000 },
        { gross: 64_692_000, advanceAmount: 17_500_000 },
      ])
    ).toEqual({ gross: 222_828_000, remaining: 171_328_000 })
  })

  it('chỉ MỘT dòng chưa tra được là cả ô tổng ra undefined', () => {
    // Cộng tập con thì kế toán cộng chéo "HH cả căn − Số tiền duyệt" ra khác "HH còn lại",
    // mà không có gì trên màn báo là tổng đang thiếu dòng. '—' thì đọc ra ngay.
    expect(
      sumRecipientGrossTotals([
        { gross: 71_880_000, advanceAmount: 19_500_000 },
        { gross: undefined, advanceAmount: 5_000_000 },
      ])
    ).toEqual({ gross: undefined, remaining: undefined })
  })

  it('không dòng nào tra được thì ra undefined chứ không phải 0', () => {
    // 0 ở dòng tổng đọc như "cả phiếu không còn hoa hồng"; sự thật chỉ là chưa biết.
    expect(sumRecipientGrossTotals([{ gross: undefined, advanceAmount: 5_000_000 }])).toEqual({
      gross: undefined,
      remaining: undefined,
    })
    expect(sumRecipientGrossTotals([])).toEqual({ gross: undefined, remaining: undefined })
    expect(sumRecipientGrossTotals(undefined)).toEqual({ gross: undefined, remaining: undefined })
  })

  it('tổng HH còn lại âm khi cả phiếu ứng vượt hoa hồng', () => {
    expect(
      sumRecipientGrossTotals([
        { gross: 10_000_000, advanceAmount: 12_000_000 },
        { gross: 5_000_000, advanceAmount: 6_000_000 },
      ])
    ).toEqual({ gross: 15_000_000, remaining: -3_000_000 })
  })

  it('tổng của các dòng khớp đúng tổng cột — Σ(HH cả căn) − Σ(số ứng) = Σ(HH còn lại)', () => {
    const rows = [
      { gross: 71_880_000, advanceAmount: 19_500_000 },
      { gross: 86_256_000, advanceAmount: 14_500_000 },
    ]
    const totals = sumRecipientGrossTotals(rows)
    const sumGross = rows.reduce((s, r) => s + (r.gross ?? 0), 0)
    const sumAdvance = rows.reduce((s, r) => s + r.advanceAmount, 0)
    expect(totals.gross).toBe(sumGross)
    expect(totals.remaining).toBe(sumGross - sumAdvance)
  })
})

describe('grossShareForRecipient ↔ remainingGross đi cùng nhau', () => {
  const shares: CommissionShareLike[] = [
    { employee: { id: 13695 }, calculated_amount: '71880000', recipient_kind: 'mv_sale' },
  ]

  it('nối đúng chuỗi bảng chia → HH cả căn → HH còn lại cho một dòng thụ hưởng', () => {
    const line = { recipient_employee: 13695, recipient_collaborator: null }
    const gross = grossShareForRecipient(shares, line)
    expect(gross).toBe(71_880_000)
    expect(remainingGross(gross, advanceAmountForLine({ approved_amount: '19500000' }))).toBe(
      52_380_000
    )
  })

  it('dòng không khớp share nào thì cả hai cột đều là chưa biết', () => {
    const gross = grossShareForRecipient(shares, { recipient_employee: 99999 })
    expect(gross).toBeUndefined()
    expect(remainingGross(gross, 19_500_000)).toBeUndefined()
  })
})
