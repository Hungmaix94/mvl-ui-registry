import { describe, it, expect } from 'vitest'
import {
  sumDealSubtotals,
  sumItemsByPctType,
  getDealProxyInfo,
  formatProxyBadgeLabel,
  formatOriginalOwnerLabel,
  getRedirectedOutItems,
  sumRedirectedOut,
  groupRedirectedOut,
  getAdvancePitCredit,
  getTaxableIncomeBase,
  getPayrollInfo,
  getDealPaymentProgressPct,
  getDealDialFeeProgressPct,
  getDealEffectiveCommissionPct,
  getDealRecognisedCommission,
  sumDealRecognisedCommission,
  getDealUnitLabel,
  getDealStaffIncentive,
  sumStaffIncentive,
  sumDealItemsByPctType,
  buildDealCommissionSources,
  getDealRecognisedTotal,
  sumDealRecognisedTotal,
  getDealAggregateCommissionPct,
  type DealPayableGroup,
  type DealUnitRef,
  type RedirectedOutItem,
} from './summary-breakdown'

const makeDeal = (overrides: Partial<DealPayableGroup> = {}): DealPayableGroup =>
  ({
    deal_id: 1,
    deal_code: 'HD01',
    unit_code: null,
    project: null,
    customer: null,
    fee_calculation_price: '1000000000',
    participation_pct: '100',
    participation_source: 'share',
    commission_percentage: '2',
    total_commission: '20000000',
    received_amount: '0',
    payment_progress_pct: '0',
    receipt_dates: [],
    subtotal: '5000000',
    items: [],
    ...overrides,
  }) as DealPayableGroup

describe('getDealUnitLabel', () => {
  it('returns unit_number — the ma can the business reads', () => {
    expect(getDealUnitLabel({ unit_number: 'A-12.05', unit_code: 'BH000002399' })).toBe('A-12.05')
  })

  it('returns null when unit_number is missing — NEVER falls back to unit_code', () => {
    expect(getDealUnitLabel({ unit_code: 'BH000002399' })).toBeNull()
    expect(getDealUnitLabel({ unit_number: null, unit_code: 'BH000002399' })).toBeNull()
    expect(getDealUnitLabel({ unit_number: '', unit_code: 'BH000002399' })).toBeNull()
  })

  it('returns null for absent or non-object deals', () => {
    expect(getDealUnitLabel(undefined)).toBeNull()
    expect(getDealUnitLabel(null)).toBeNull()
    // source_info tren cac man quan ly la `any` — co the la chuoi JSON chua parse.
    expect(getDealUnitLabel('HD01' as unknown as DealUnitRef)).toBeNull()
  })
})

describe('sumDealSubtotals', () => {
  it('sums subtotal per deal — not total_commission (whole-deal fee)', () => {
    const deals = [
      makeDeal({ subtotal: '5000000', total_commission: '20000000' }),
      makeDeal({ subtotal: '3000000', total_commission: '99000000' }),
    ]
    expect(sumDealSubtotals(deals)).toBe(8000000)
  })

  it('treats missing/empty subtotal as 0', () => {
    expect(sumDealSubtotals([makeDeal({ subtotal: '' }), makeDeal({ subtotal: '100' })])).toBe(100)
  })
})

describe('getDealRecognisedCommission', () => {
  // Deal phi 10 ty / F2 2% -> HH ghi nhan dung = 200.000.000d. Tien ve 3.333.333.333d nen
  // progress that la 33,33333% nhung BE quantize con "33.33", va subtotal = 66.666.667d.
  // Suy nguoc `subtotal x 100 / progress` ra 200.020.003d — du 20.003d tien ao.
  const roundedProgressDeal = makeDeal({
    fee_calculation_price: '10000000000',
    commission_percentage: '2',
    subtotal: '66666667',
    payment_progress_pct: '33.33',
    f2_total_commission: '200000000',
  } as Partial<DealPayableGroup>)

  it('reads the served figure — never divides subtotal by the 2dp-rounded progress', () => {
    expect(getDealRecognisedCommission(roundedProgressDeal)).toBe(200000000)

    // Chot chan: dung dung phep chia ma PR cu dung thi lech that.
    const derived = (66666667 * 100) / 33.33
    expect(Math.round(derived)).toBe(200020003)
    expect(getDealRecognisedCommission(roundedProgressDeal)).not.toBe(Math.round(derived))
  })

  it('still returns the full amount when no receipt landed in the period (progress 0)', () => {
    // Nhanh vo nhat cua phep chia: progress = 0 -> khong co gi de chia -> tra thang subtotal,
    // dong hien "ghi nhan 10tr · ve 0% · thuc te 10tr" tu mau thuan.
    const deal = makeDeal({
      subtotal: '10000000',
      payment_progress_pct: '0.00',
      f2_total_commission: '200000000',
    } as Partial<DealPayableGroup>)
    expect(getDealRecognisedCommission(deal)).toBe(200000000)
    expect(getDealRecognisedCommission(deal)).not.toBe(Number(deal.subtotal))
  })

  it('is unaffected by over-collection (progress > 100)', () => {
    // Chia nguoc o day cho ra so NHO HON subtotal — dong bao "ghi nhan < thuc te".
    const deal = makeDeal({
      subtotal: '12000000',
      payment_progress_pct: '120.00',
      f2_total_commission: '10000000',
    } as Partial<DealPayableGroup>)
    expect(getDealRecognisedCommission(deal)).toBe(10000000)
  })

  it('returns null when BE has not served the field — shows "—", never a derived lookalike', () => {
    expect(getDealRecognisedCommission(makeDeal())).toBeNull()
    expect(
      getDealRecognisedCommission(
        makeDeal({ f2_total_commission: null } as Partial<DealPayableGroup>)
      )
    ).toBeNull()
    expect(
      getDealRecognisedCommission(
        makeDeal({ f2_total_commission: '' } as Partial<DealPayableGroup>)
      )
    ).toBeNull()
    expect(
      getDealRecognisedCommission(
        makeDeal({ f2_total_commission: 'abc' } as Partial<DealPayableGroup>)
      )
    ).toBeNull()
  })

  it('accepts a real zero — a waived share is not missing data', () => {
    expect(
      getDealRecognisedCommission(
        makeDeal({ f2_total_commission: '0' } as Partial<DealPayableGroup>)
      )
    ).toBe(0)
  })
})

describe('sumDealRecognisedCommission', () => {
  it('sums the served figures', () => {
    const deals = [
      makeDeal({ f2_total_commission: '200000000' } as Partial<DealPayableGroup>),
      makeDeal({ f2_total_commission: '50000000' } as Partial<DealPayableGroup>),
    ]
    expect(sumDealRecognisedCommission(deals)).toBe(250000000)
  })

  it('skips deals without the field instead of counting them as 0', () => {
    const deals = [
      makeDeal({ f2_total_commission: '200000000' } as Partial<DealPayableGroup>),
      makeDeal(),
    ]
    expect(sumDealRecognisedCommission(deals)).toBe(200000000)
  })

  it('returns null when NO deal has the field — the total row shows "—", not 0đ', () => {
    expect(sumDealRecognisedCommission([makeDeal(), makeDeal()])).toBeNull()
    expect(sumDealRecognisedCommission([])).toBeNull()
  })
})

describe('sumItemsByPctType', () => {
  it('sums only the matching pct_type item per deal', () => {
    const deals = [
      makeDeal({
        items: [
          {
            line_id: 1,
            payable_id: 1,
            pct_type: 'pct_sale_commission',
            amount: '400',
            share_full_amount: null,
            status: 'unpaid',
            already_paid_externally: false,
            pit_withheld_at_payment: '0',
            received_on_behalf: false,
            original_beneficiary: null,
          },
          {
            line_id: 2,
            payable_id: 2,
            pct_type: 'pct_mv_bonus_to_sale',
            amount: '50',
            share_full_amount: null,
            status: 'unpaid',
            already_paid_externally: false,
            pit_withheld_at_payment: '0',
            received_on_behalf: false,
            original_beneficiary: null,
          },
        ],
      }),
      makeDeal({
        items: [
          {
            line_id: 3,
            payable_id: 3,
            pct_type: 'pct_sale_commission',
            amount: '600',
            share_full_amount: null,
            status: 'unpaid',
            already_paid_externally: false,
            pit_withheld_at_payment: '0',
            received_on_behalf: false,
            original_beneficiary: null,
          },
        ],
      }),
    ]
    expect(sumItemsByPctType(deals, 'pct_sale_commission')).toBe(1000)
    expect(sumItemsByPctType(deals, 'pct_mv_bonus_to_sale')).toBe(50)
    expect(sumItemsByPctType(deals, 'pct_f2_commission')).toBe(0)
  })
})

/**
 * Cột "Thưởng MV" ở Mục 1 màn Chia HH Sale theo tháng (ClickUp 86eyhybt4).
 *
 * `staff_incentive` là pct_type DUY NHẤT không có tiền tố `pct_`/`amt_`, nên mọi
 * bộ lọc theo tiền tố — kể cả cách Mục 1 đang dò `COMMISSION_PCT_TYPES.*.pct` —
 * đều bỏ sót nó. Tiền vẫn nằm trong `subtotal` nhưng không có cột nào hiện ra,
 * nên kế toán không đối chiếu được "HH ghi nhận" với các cấu phần của nó.
 */
describe('getDealStaffIncentive / sumStaffIncentive (Thưởng MV)', () => {
  const staffIncentiveItem = (amount: string) => ({
    line_id: 9,
    payable_id: 9,
    pct_type: 'staff_incentive',
    amount,
    status: 'unpaid',
    already_paid_externally: false,
    pit_withheld_at_payment: '0',
    received_on_behalf: false,
    original_beneficiary: null,
  })

  it('đọc được Thưởng MV dù pct_type không có tiền tố pct_/amt_', () => {
    const deal = makeDeal({ items: [staffIncentiveItem('5000000')] as never })

    expect(getDealStaffIncentive(deal)).toBe(5000000)
  })

  it('deal không có Thưởng MV trả 0 — không nhầm sang thưởng CĐT', () => {
    const deal = makeDeal({
      items: [
        {
          line_id: 1,
          payable_id: 1,
          pct_type: 'pct_investor_bonus_to_sale',
          amount: '7000000',
          status: 'unpaid',
          already_paid_externally: false,
          pit_withheld_at_payment: '0',
          received_on_behalf: false,
          original_beneficiary: null,
        },
      ] as never,
    })

    expect(getDealStaffIncentive(deal)).toBe(0)
  })

  it('cộng đúng tổng Thưởng MV cho dòng TỔNG của Mục 1', () => {
    const deals = [
      makeDeal({ items: [staffIncentiveItem('5000000')] as never }),
      makeDeal({ items: [staffIncentiveItem('3000000')] as never }),
      makeDeal({ items: [] }),
    ]

    expect(sumStaffIncentive(deals)).toBe(8000000)
  })
})

describe('getDealProxyInfo', () => {
  it('flags a deal whose item was received on behalf of someone else', () => {
    const deal = makeDeal({
      items: [
        {
          line_id: 1,
          payable_id: 1,
          pct_type: 'pct_sale_commission',
          amount: '400',
          share_full_amount: null,
          status: 'unpaid',
          already_paid_externally: false,
          pit_withheld_at_payment: '0',
          received_on_behalf: true,
          original_beneficiary: { type: 'employee', id: 17, name: 'Nguyen Van Sale' },
        },
      ],
    })
    const info = getDealProxyInfo(deal)
    expect(info.isProxy).toBe(true)
    expect(info.original).toEqual({ type: 'employee', id: 17, name: 'Nguyen Van Sale' })
  })

  it('returns non-proxy for own items or when the flag is absent (old BE)', () => {
    const own = makeDeal({
      items: [
        {
          line_id: 1,
          payable_id: 1,
          pct_type: 'pct_sale_commission',
          amount: '400',
          share_full_amount: null,
          status: 'unpaid',
          already_paid_externally: false,
          pit_withheld_at_payment: '0',
          received_on_behalf: false,
          original_beneficiary: null,
        },
      ],
    })
    expect(getDealProxyInfo(own)).toEqual({ isProxy: false, original: null })
    expect(getDealProxyInfo(makeDeal())).toEqual({ isProxy: false, original: null })
  })
})

describe('getRedirectedOutItems / sumRedirectedOut', () => {
  const item: RedirectedOutItem = {
    split_id: 1,
    deal_id: 41,
    deal_code: 'HD41',
    payee: { type: 'collaborator', id: 9, name: 'CTV B' },
    amount: '2000000',
    status: 'confirmed',
    reason: '',
  }

  it('reads redirected_out from the summary payload and sums amounts', () => {
    const summary = { redirected_out: [item, { ...item, split_id: 2, amount: '500000' }] }
    const items = getRedirectedOutItems(summary)
    expect(items).toHaveLength(2)
    expect(sumRedirectedOut(items)).toBe(2500000)
  })

  it('returns [] when the field is absent (old BE) or malformed', () => {
    expect(getRedirectedOutItems({})).toEqual([])
    expect(getRedirectedOutItems(undefined)).toEqual([])
    expect(getRedirectedOutItems({ redirected_out: 'x' })).toEqual([])
  })
})

describe('groupRedirectedOut', () => {
  const base: RedirectedOutItem = {
    split_id: 1,
    deal_id: 41,
    deal_code: 'HD41',
    payee: { type: 'collaborator', id: 9, name: 'CTV B' },
    amount: '10570000',
    status: 'confirmed',
    reason: '',
  }

  it('merges splits of the same (deal, payee) into one row — one row per deal', () => {
    // 2 receipt vouchers => 2 splits for the same deal + payee.
    const groups = groupRedirectedOut([
      base,
      { ...base, split_id: 2, amount: '9430000', reason: 'nhan ho dot 2' },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].amount).toBe(20000000)
    expect(groups[0].split_count).toBe(2)
    expect(groups[0].status).toBe('confirmed')
    expect(groups[0].reasons).toEqual(['nhan ho dot 2'])
  })

  it('keeps separate rows for different deals or different payees', () => {
    const groups = groupRedirectedOut([
      base,
      { ...base, split_id: 2, deal_id: 42, deal_code: 'HD42' },
      { ...base, split_id: 3, payee: { type: 'employee', id: 1, name: 'NV A' } },
    ])
    expect(groups).toHaveLength(3)
  })

  it('status is paid only when EVERY split is paid', () => {
    const paidAll = groupRedirectedOut([
      { ...base, status: 'paid' },
      { ...base, split_id: 2, status: 'paid' },
    ])
    expect(paidAll[0].status).toBe('paid')
    const mixed = groupRedirectedOut([
      { ...base, status: 'paid' },
      { ...base, split_id: 2, status: 'confirmed' },
    ])
    expect(mixed[0].status).toBe('confirmed')
  })
})

describe('formatProxyBadgeLabel', () => {
  it('renders type label + name', () => {
    expect(formatProxyBadgeLabel({ type: 'employee', id: 1, name: 'A' })).toBe('Nhận hộ · NV A')
    expect(formatProxyBadgeLabel({ type: 'exchange', id: 2, name: 'San X' })).toBe(
      'Nhận hộ · Sàn San X'
    )
  })

  it('falls back to plain label without original info', () => {
    expect(formatProxyBadgeLabel(null)).toBe('Nhận hộ')
  })
})

describe('formatOriginalOwnerLabel', () => {
  it('chỉ trả tên + loại, không kèm chữ "Nhận hộ"', () => {
    expect(formatOriginalOwnerLabel({ type: 'employee', id: 1, name: 'Nguyễn Quỳnh Trang' })).toBe(
      'NV Nguyễn Quỳnh Trang'
    )
    expect(formatOriginalOwnerLabel({ type: 'exchange', id: 2, name: 'San X' })).toBe('Sàn San X')
  })

  it('nói rõ khi thiếu thông tin người gốc thay vì trả chuỗi rỗng', () => {
    expect(formatOriginalOwnerLabel(null)).toBe('Không rõ người đứng tên')
  })
})

describe('getAdvancePitCredit', () => {
  it('parses a string decimal advance_pit_credit', () => {
    expect(getAdvancePitCredit({ advance_pit_credit: '150000' })).toBe(150000)
  })

  it('reads a numeric advance_pit_credit', () => {
    expect(getAdvancePitCredit({ advance_pit_credit: 2000 })).toBe(2000)
  })

  it('returns 0 when the field is missing, null, or the summary is nullish', () => {
    expect(getAdvancePitCredit({})).toBe(0)
    expect(getAdvancePitCredit({ advance_pit_credit: null } as unknown)).toBe(0)
    expect(getAdvancePitCredit(null)).toBe(0)
    expect(getAdvancePitCredit(undefined)).toBe(0)
  })
})

describe('getTaxableIncomeBase', () => {
  it('regression 86eyeg058: does NOT double-count already-paid-externally bonus (real summary id=282, kỳ 08/2026)', () => {
    // pre_tax_total (BE taxable_total) already includes the already-paid-externally bonus
    // (2.000.000đ). Old FE code added it a second time, showing 146.854.545 instead of this.
    expect(getTaxableIncomeBase({ pre_tax_total: '144854545', pre_tax_hold_amount: '0' })).toBe(
      144854545
    )
  })

  it('subtracts pre_tax_hold_amount', () => {
    expect(getTaxableIncomeBase({ pre_tax_total: 100000000, pre_tax_hold_amount: 30000000 })).toBe(
      70000000
    )
  })

  it('clamps at 0 when the hold exceeds the taxable total', () => {
    expect(getTaxableIncomeBase({ pre_tax_total: 10000000, pre_tax_hold_amount: 15000000 })).toBe(0)
  })

  it('treats missing fields as 0', () => {
    expect(getTaxableIncomeBase({})).toBe(0)
  })
})

describe('getPayrollInfo', () => {
  it('reads the 5 figures from summary.payroll_info (BE _PayrollInfo, CR 86eyeg058)', () => {
    const summary = {
      payroll_info: {
        total_income: '25000000',
        insurance_amount: '2625000',
        dependents_count: 2,
        total_deduction: '14625000',
        pit_amount: '1037500',
      },
    } as any
    expect(getPayrollInfo(summary)).toEqual({
      totalIncome: '25000000',
      insuranceAmount: '2625000',
      dependentsCount: 2,
      totalDeduction: '14625000',
      salaryPit: '1037500',
    })
  })

  it('returns all-null when payroll_info is null (no delivered payslip this period)', () => {
    const summary = { payroll_info: null } as any
    expect(getPayrollInfo(summary)).toEqual({
      totalIncome: null,
      insuranceAmount: null,
      dependentsCount: null,
      totalDeduction: null,
      salaryPit: null,
    })
  })
})

describe('getDealEffectiveCommissionPct', () => {
  // BE 2026-08-04 phục vụ sẵn số này (`effective_display_rate`) — nó là NGUỒN duy nhất biết
  // share custom-override là share-own, nên phải thắng mọi phép tính lại ở FE.
  it('ưu tiên effective_commission_pct do BE trả, kể cả khi khác tích pool × tham gia', () => {
    const deal = makeDeal({
      commission_percentage: '1.5',
      participation_pct: '40',
      // share sửa tay: BE không nhân tỷ lệ tham gia vào tiền của họ nên trả về rate thô
      effective_commission_pct: '1.5000',
    } as Partial<DealPayableGroup>)
    expect(getDealEffectiveCommissionPct(deal)).toBeCloseTo(1.5, 10)
  })

  it('BE chưa deploy (thiếu field) → tự tính pool × tham gia như cũ', () => {
    const deal = makeDeal({ commission_percentage: '2', participation_pct: '33' })
    expect(getDealEffectiveCommissionPct(deal)).toBeCloseTo(0.66, 10)
  })

  // CR STT16 (86eyd8qvq): cột "% HH" từng đọc ra 2% cho CẢ BA sale của cùng một căn dù tỷ lệ
  // tham gia khác nhau — vì tỷ lệ tham gia bị đặt ở mẫu số nên triệt tiêu với chính nó trong
  // `amount`. Kỳ vọng kế toán: % hoa hồng người đó nhận trên CẢ CĂN = % pool × tỷ lệ tham gia.
  it.each([
    [33, 0.66],
    [34, 0.68],
    [33, 0.66],
  ])('sale tham gia %i%% trên pool 2%% → %f%%', (participationPct, expected) => {
    const deal = makeDeal({
      commission_percentage: '2',
      participation_pct: String(participationPct),
    })
    expect(getDealEffectiveCommissionPct(deal)).toBeCloseTo(expected, 10)
  })

  it('ws 270 (thread ClickUp 24/07): pool 2.1% × tham gia 35% = 0.735%', () => {
    const deal = makeDeal({ commission_percentage: '2.1', participation_pct: '35' })
    expect(getDealEffectiveCommissionPct(deal)).toBeCloseTo(0.735, 10)
  })

  it('share không có tỷ lệ tham gia → nhận trọn % pool', () => {
    const deal = makeDeal({ commission_percentage: '2', participation_pct: null })
    expect(getDealEffectiveCommissionPct(deal)).toBeCloseTo(2, 10)
  })

  // Share amount-mode (F2 cố định, override nhập thẳng tiền) không có % nào để hiện. Chia
  // ngược từ tiền chỉ đẻ ra một con số nhìn như thật — cùng quy tắc với bảng chia thực nhận 20.8.
  it('share không có rate (amount-mode) → null để ô hiển thị "—", KHÔNG suy % từ tiền', () => {
    const deal = makeDeal({
      commission_percentage: null,
      effective_commission_pct: null,
      participation_pct: '33',
      fee_calculation_price: '1000000000',
    } as Partial<DealPayableGroup>)
    expect(getDealEffectiveCommissionPct(deal)).toBeNull()
  })

  it('rate 0% → null, không rơi xuống nhánh nào khác', () => {
    const deal = makeDeal({ commission_percentage: '0', participation_pct: '50' })
    expect(getDealEffectiveCommissionPct(deal)).toBeNull()
  })
})

describe('getDealPaymentProgressPct / getDealDialFeeProgressPct', () => {
  // Hai tỷ lệ của CÙNG một deal, đo trên dev: HD06-2026-001788 kỳ 08/2026.
  const deal = { payment_progress_pct: '30.80', dial_fee_progress_pct: '24.2424242424' } as any

  it('đọc đúng hai tỷ lệ, không lẫn nhau', () => {
    expect(getDealPaymentProgressPct(deal)).toBe(30.8)
    expect(getDealDialFeeProgressPct(deal)).toBeCloseTo(24.2424242424, 6)
  })

  it('trả null khi BE chưa có dial, để màn hiện "—" thay vì mượn tỷ lệ kia', () => {
    expect(getDealDialFeeProgressPct({ payment_progress_pct: '30.80' } as any)).toBeNull()
    expect(getDealDialFeeProgressPct({ dial_fee_progress_pct: null } as any)).toBeNull()
  })

  it('0% là số thật, không phải thiếu dữ liệu — kỳ chưa có phiếu thu', () => {
    expect(getDealPaymentProgressPct({ payment_progress_pct: '0' } as any)).toBe(0)
    expect(getDealDialFeeProgressPct({ dial_fee_progress_pct: '0' } as any)).toBe(0)
  })

  it('trả null khi thiếu hẳn field, KHÔNG mặc định 100%', () => {
    // Đây chính là lỗi cũ: màn đọc `deal.payout_ratio ?? 1.0` mà field đó không tồn tại,
    // nên cột "% tiền về" hiện 100,00% cho mọi deal của mọi người.
    expect(getDealPaymentProgressPct({} as any)).toBeNull()
    expect(getDealDialFeeProgressPct({} as any)).toBeNull()
  })

  it('bỏ qua giá trị không phải số', () => {
    expect(getDealPaymentProgressPct({ payment_progress_pct: '' } as any)).toBeNull()
    expect(getDealDialFeeProgressPct({ dial_fee_progress_pct: 'n/a' } as any)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Nhận hộ nhiều người trên CÙNG một deal — dữ liệu thật từ staging summary 42,
// deal HD06-2026-000001, kỳ 08/2026 (dial phí 50%):
//   Phan Thành Đạt   share 38.347.964 · 0,6300% · nhận hộ 100% → 19.173.982
//   Nguyễn Văn Hoàng share 38.347.964 · 0,6300% · nhận hộ 100% → 19.173.982
//   Bùi Quang Cường  share 32.869.684 · 0,5400% · nhận hộ  60% →  9.860.905
//                                                          Σ = 48.208.869 = subtotal
// ---------------------------------------------------------------------------

const SALE_PCT = 'pct_sale_commission'
const MV_BONUS_PCT = 'pct_mv_bonus_to_sale'

const proxyItem = (
  name: string,
  id: number,
  {
    amount,
    shareFull,
    effectivePct,
    proxyPct,
    pctType = SALE_PCT,
  }: {
    amount: string
    shareFull: string
    effectivePct: string
    proxyPct: string
    pctType?: string
  }
) =>
  ({
    line_id: id,
    payable_id: id,
    pct_type: pctType,
    amount,
    share_full_amount: shareFull,
    participation_pct: '35.000',
    effective_commission_pct: effectivePct,
    proxy_pct: proxyPct,
    proxy_base_amount: String(Number(shareFull) / 2),
    status: 'UNPAID',
    already_paid_externally: false,
    pit_withheld_at_payment: '0',
    received_on_behalf: true,
    original_beneficiary: { type: 'employee' as const, id, name },
  }) as any

const ownItem = (overrides: Record<string, unknown> = {}) =>
  ({
    line_id: 90,
    payable_id: 90,
    pct_type: SALE_PCT,
    amount: '10000000',
    share_full_amount: '20000000',
    participation_pct: '50.000',
    effective_commission_pct: '1.0000',
    proxy_pct: '100.00',
    proxy_base_amount: '10000000',
    status: 'UNPAID',
    already_paid_externally: false,
    pit_withheld_at_payment: '0',
    received_on_behalf: false,
    original_beneficiary: null,
    ...overrides,
  }) as any

const THREE_PROXY_ITEMS = [
  proxyItem('Phan Thành Đạt', 661, {
    amount: '19173982',
    shareFull: '38347964',
    effectivePct: '0.6300',
    proxyPct: '100.00',
  }),
  proxyItem('Nguyễn Văn Hoàng', 652, {
    amount: '19173982',
    shareFull: '38347964',
    effectivePct: '0.6300',
    proxyPct: '100.00',
  }),
  proxyItem('Bùi Quang Cường', 649, {
    amount: '9860905',
    shareFull: '32869684',
    effectivePct: '0.5400',
    proxyPct: '60.00',
  }),
]

const threeProxyDeal = () =>
  makeDeal({
    subtotal: '48208869',
    effective_commission_pct: '0.6300',
    dial_fee_progress_pct: '50.0000000000',
    items: THREE_PROXY_ITEMS,
  })

describe('sumDealItemsByPctType', () => {
  it('cộng MỌI item cùng pct_type, không lấy mỗi item đầu', () => {
    // Lỗi cũ dùng `.find()`: trả 19.173.982 thay vì 48.208.869.
    expect(sumDealItemsByPctType(threeProxyDeal(), SALE_PCT)).toBe(48208869)
  })

  it('bỏ qua pct_type khác và deal rỗng', () => {
    expect(sumDealItemsByPctType(threeProxyDeal(), MV_BONUS_PCT)).toBe(0)
    expect(sumDealItemsByPctType(makeDeal(), SALE_PCT)).toBe(0)
  })
})

describe('buildDealCommissionSources', () => {
  it('case chính chủ — một nguồn, không phải nhận hộ', () => {
    const sources = buildDealCommissionSources(makeDeal({ items: [ownItem()] }))
    expect(sources).toHaveLength(1)
    expect(sources[0].isProxy).toBe(false)
    expect(sources[0].label).toBe('Chính chủ')
    expect(sources[0].ownerLabel).toBeNull()
    expect(sources[0].effectivePct).toBe(1)
    expect(sources[0].contributedPct).toBe(1)
  })

  it('case nhận hộ đúng 1 người 100% — một nguồn, tỷ lệ trọn suất', () => {
    const sources = buildDealCommissionSources(makeDeal({ items: [THREE_PROXY_ITEMS[0]] }))
    expect(sources).toHaveLength(1)
    expect(sources[0].label).toBe('Nhận hộ · NV Phan Thành Đạt')
    // Pill của bảng dùng ownerLabel, tách khỏi label để tên dài không làm vỡ viền bo.
    expect(sources[0].ownerLabel).toBe('NV Phan Thành Đạt')
    expect(sources[0].proxyPct).toBe(100)
    expect(sources[0].recognised).toBe(38347964)
  })

  it('case nhận hộ nhiều người theo tỷ lệ khác nhau — mỗi nguồn giữ rate của chính nó', () => {
    const sources = buildDealCommissionSources(threeProxyDeal())
    expect(sources.map((s) => s.label)).toEqual([
      'Nhận hộ · NV Phan Thành Đạt',
      'Nhận hộ · NV Nguyễn Văn Hoàng',
      'Nhận hộ · NV Bùi Quang Cường',
    ])
    expect(sources.map((s) => s.effectivePct)).toEqual([0.63, 0.63, 0.54])
    expect(sources.map((s) => s.proxyPct)).toEqual([100, 100, 60])
    // Cường chỉ nhận hộ 60% suất: ghi nhận là 60% của 32.869.684, không phải cả suất.
    expect(sources.map((s) => s.recognised)).toEqual([38347964, 38347964, 19721810.4])
    expect(sources.map((s) => s.actual)).toEqual([19173982, 19173982, 9860905])
  })

  it('case vừa tự bán vừa nhận hộ — chính chủ và người được nhận hộ là hai nguồn riêng', () => {
    const sources = buildDealCommissionSources(
      makeDeal({ items: [ownItem(), THREE_PROXY_ITEMS[2]] })
    )
    expect(sources.map((s) => s.key)).toEqual(['self', 'employee-649'])
    expect(sources.map((s) => s.isProxy)).toEqual([false, true])
  })

  it('gộp nhiều pct_type của CÙNG một người đứng tên vào một nguồn', () => {
    const bonus = proxyItem('Phan Thành Đạt', 661, {
      amount: '1000000',
      shareFull: '2000000',
      effectivePct: '0.1000',
      proxyPct: '100.00',
      pctType: MV_BONUS_PCT,
    })
    const sources = buildDealCommissionSources(makeDeal({ items: [THREE_PROXY_ITEMS[0], bonus] }))
    expect(sources).toHaveLength(1)
    expect(sources[0].actual).toBe(20173982)
    expect(sources[0].recognised).toBe(40347964)
    // % HH đọc từ item HH bán hàng, thưởng không đè lên.
    expect(sources[0].effectivePct).toBe(0.63)
  })

  it('coi item không có proxy_pct là trọn suất, và không để nó đè tỷ lệ của nhóm', () => {
    const noPct = { ...THREE_PROXY_ITEMS[2], proxy_pct: null }
    const sources = buildDealCommissionSources(makeDeal({ items: [noPct] }))
    expect(sources[0].proxyPct).toBeNull()
    expect(sources[0].recognised).toBe(32869684)
  })

  it('nhận hộ mà thiếu thông tin người gốc vẫn là một nguồn riêng', () => {
    const unknown = { ...THREE_PROXY_ITEMS[0], original_beneficiary: null }
    const sources = buildDealCommissionSources(makeDeal({ items: [ownItem(), unknown] }))
    expect(sources.map((s) => s.key)).toEqual(['self', 'proxy-unknown'])
    expect(sources[1].label).toBe('Nhận hộ')
  })
})

describe('getDealRecognisedTotal', () => {
  it('cộng share theo tỷ lệ nhận hộ, và nhân dial ra đúng subtotal', () => {
    const deal = threeProxyDeal()
    const recognised = getDealRecognisedTotal(deal)
    expect(recognised).toBe(96417738.4)
    // Kiểm chứng khép kín: ghi nhận × dial 50% == subtotal BE trả.
    expect(Math.round((recognised as number) * 0.5)).toBe(Number(deal.subtotal))
  })

  it('trả null khi không item nào có share_full_amount — ô hiện "—", không phải 0', () => {
    const noShare = { ...THREE_PROXY_ITEMS[0], share_full_amount: null }
    expect(getDealRecognisedTotal(makeDeal({ items: [noShare] }))).toBeNull()
    expect(getDealRecognisedTotal(makeDeal())).toBeNull()
  })

  it('sumDealRecognisedTotal bỏ qua deal không có số, null khi không deal nào có', () => {
    expect(sumDealRecognisedTotal([threeProxyDeal(), makeDeal()])).toBe(96417738.4)
    expect(sumDealRecognisedTotal([makeDeal()])).toBeNull()
  })
})

describe('getDealAggregateCommissionPct', () => {
  it('cộng % của mọi nguồn theo tỷ lệ nhận hộ thay vì lấy rate của một sale', () => {
    // Header BE trả 0,6300% (rate riêng của Đạt) — con số đang hiện sai trên màn.
    expect(getDealAggregateCommissionPct(threeProxyDeal())).toBeCloseTo(1.584, 10)
  })

  it('deal một nguồn giữ nguyên rate của nguồn đó', () => {
    expect(getDealAggregateCommissionPct(makeDeal({ items: [ownItem()] }))).toBe(1)
  })

  it('rơi về rate của group header khi không item HH bán hàng nào có rate', () => {
    const bonusOnly = { ...ownItem(), pct_type: MV_BONUS_PCT }
    const deal = makeDeal({ items: [bonusOnly], effective_commission_pct: '0.7700' })
    expect(getDealAggregateCommissionPct(deal)).toBe(0.77)
  })

  it('trả null khi không có rate ở đâu cả — KHÔNG suy % từ tiền', () => {
    const noRate = { ...ownItem(), effective_commission_pct: null }
    const deal = makeDeal({
      items: [noRate],
      effective_commission_pct: null,
      commission_percentage: null,
    })
    expect(getDealAggregateCommissionPct(deal)).toBeNull()
  })
})
