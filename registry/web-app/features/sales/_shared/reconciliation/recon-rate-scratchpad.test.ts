import { describe, expect, it } from 'vitest'

import { computePeriodCommission } from './recon-calculations'
import { rateScratchpadAmount } from './recon-rate-scratchpad'

describe('rateScratchpadAmount', () => {
  it('chưa nhập tỷ lệ ⇒ null, KHÔNG phải 0', () => {
    const base = { feeCalculationPrice: 1_000_000_000, pctAgencyFee: 2, amtAgencyFee: null }

    expect(rateScratchpadAmount({ ...base, pctPeriodCommission: null })).toBeNull()
    expect(rateScratchpadAmount({ ...base, pctPeriodCommission: undefined })).toBeNull()
    expect(rateScratchpadAmount({ ...base, pctPeriodCommission: NaN })).toBeNull()
  })

  it('quy đổi theo phí trọn căn dạng TỶ LỆ % trên giá tính phí', () => {
    // 1.000.000.000 × 2% = 20.000.000 phí trọn căn; 25% tiến độ ⇒ 5.000.000.
    expect(
      rateScratchpadAmount({
        feeCalculationPrice: 1_000_000_000,
        pctAgencyFee: 2,
        amtAgencyFee: null,
        pctPeriodCommission: 25,
      })
    ).toBe(5_000_000)
  })

  it('quy đổi theo phí trọn căn dạng SỐ TIỀN cố định', () => {
    expect(
      rateScratchpadAmount({
        feeCalculationPrice: 0,
        pctAgencyFee: null,
        amtAgencyFee: 104_325_237,
        pctPeriodCommission: 50,
      })
    ).toBe(52_162_619)
  })

  it('tỷ lệ 0 vẫn là một tỷ lệ đã nhập ⇒ trả 0', () => {
    expect(
      rateScratchpadAmount({
        feeCalculationPrice: 1_000_000_000,
        pctAgencyFee: 2,
        amtAgencyFee: null,
        pctPeriodCommission: 0,
      })
    ).toBe(0)
  })

  it('tiến độ lũy kế vượt 100% vẫn quy đổi được (kỳ sau của căn đã đối chiếu nhiều đợt)', () => {
    expect(
      rateScratchpadAmount({
        feeCalculationPrice: 0,
        pctAgencyFee: null,
        amtAgencyFee: 100,
        pctPeriodCommission: 120,
      })
    ).toBe(120)
  })
})

/**
 * Giấy nháp chỉ có giá trị nếu nó nói ĐÚNG con số BE sẽ tính. BE giữ phí trọn căn ở dạng chính xác
 * rồi làm tròn MỘT lần (`InvestorReconciliation._period_commission_exact`); helper hiển thị của FE
 * (`computePeriodCommission` → `agencyCommissionFull`) làm tròn phí trọn căn TRƯỚC. Hai quy tắc lệch
 * nhau đúng 1đ khi phí trọn căn rơi vào phần lẻ — và đó là lý do ô này KHÔNG dùng lại helper đó.
 */
describe('giấy nháp phải khớp quy tắc làm tròn của BE, không phải của helper hiển thị', () => {
  // Cấu hình THẬT của Chamora HĐ 830: 5% trên 1.896.822.490,35 — KHÔNG phải phí cố định.
  const CHAMORA = {
    feeCalculationPrice: 1_896_822_490.35,
    pctAgencyFee: 5,
    amtAgencyFee: null,
  }

  it('HĐ 830: giữ chính xác đến cuối rồi làm tròn một lần', () => {
    // 1.896.822.490,35 × 5% = 94.841.124,5175 (phí trọn căn, CHƯA làm tròn)
    //                × 50%  = 47.420.562,25875 → 47.420.562
    expect(rateScratchpadAmount({ ...CHAMORA, pctPeriodCommission: 50 })).toBe(47_420_562)
  })

  it('helper hiển thị làm tròn sớm nên ra số KHÁC — ghim để không ai "dọn dẹp" bằng cách dùng lại nó', () => {
    // round(94.841.124,5175) = 94.841.125; × 50% = 47.420.562,5 → 47.420.563
    const displayHelper = computePeriodCommission({ ...CHAMORA, progressDelta: 0.5 })
    const scratchpad = rateScratchpadAmount({ ...CHAMORA, pctPeriodCommission: 50 })

    expect(displayHelper).toBe(47_420_563)
    expect(scratchpad).toBe(47_420_562)
    expect(displayHelper - (scratchpad as number)).toBe(1)
  })
})
