import { describe, expect, it } from 'vitest'

import type {
  FeeSupportCalculation,
  FeeSupportCalculationRow,
} from '../services/fee-support-request-service'
import { buildFeeSupportSummaryRows } from './FeeSupportCalculationSummary'

/**
 * Bảng phẳng là bề mặt QA đối chiếu trực tiếp với file Excel trong CR STT16, nên
 * test khoá đúng hai thứ dễ trôi khi sửa sau này: DANH SÁCH + THỨ TỰ dòng, và
 * việc mọi con số phải map thẳng từ `calculation` (FE không tự tính lại).
 */
const row = (
  amount: string | null,
  pct_effective: string | null = null,
  extra: Partial<FeeSupportCalculationRow> = {}
): FeeSupportCalculationRow => ({
  amount,
  pct_effective,
  pct_config: null,
  includes_vat: null,
  ...extra,
})

function makeCalculation(): FeeSupportCalculation {
  return {
    source: 'deal_config',
    fee_calculation_price: '10000000000',
    commission_fee_calculation_price: '10000000000',
    vat_rate: '10.00',
    inflow: {
      rows: {
        agency_fee: row('500000000', '5.00', { pct_config: '5.00', includes_vat: true }),
        investor_bonus: row('25000000', '0.25'),
        shared_bonus: row('40000000', '0.40'),
      },
      total: '565000000',
      total_pct_effective: '5.65',
    },
    outflow: {
      rows: {
        sale: row('127800000', '1.28'),
        f2: row('82400000', '0.82'),
        management: row('27830000', '0.28'),
        promotion: row('0', '0'),
        deduction: row('-2200000', '-0.02'),
      },
      total: '235830000',
      total_pct_effective: '2.36',
      is_actual: true,
    },
    request: {
      sale_regulated: row('210000000', '2.10'),
      bonus_regulated: row('3000000', '0.03'),
      // #2831: tổng theo QUY ĐỊNH = quy định + thưởng, KHÔNG cộng phần xin thêm.
      sale_total: row('213000000', '2.13'),
      support: row('100000000', '1.00'),
      bonus_support: row('100000000', '1.00'),
      support_total: row('200000000', '2.00'),
      customer_cut: row('200000000', '2.00'),
      // Cắt cho khách trọn phần xin thêm ⇒ sale không được thêm gì. 0 là HỢP LỆ.
      sale_net: row('0', '0'),
      is_applied: false,
    },
    remainder: {
      mv_remaining: row('89800000', '0.90'),
      after_sale_f2_before: row('354800000', '3.55'),
      after_sale_f2_after: row('154800000', '1.55'),
      final_before: row('329170000', '3.29'),
      final_after: row('129170000', '1.29'),
    },
    warnings: [],
  } as unknown as FeeSupportCalculation
}

describe('buildFeeSupportSummaryRows (CR STT16 — bám file Excel tham chiếu)', () => {
  it('giữ đúng thứ tự đọc của file Excel', () => {
    expect(buildFeeSupportSummaryRows(makeCalculation()).map((r) => r.key)).toEqual([
      'fee_price',
      'agency_fee',
      'bonus_received',
      'sale_regulated',
      'bonus_regulated',
      'sale_total',
      'support',
      // CR54 (86eyqwp4v): "Phí xin thêm" đứng ngay sau dòng nó trừ từ đó.
      'support_extra',
      'bonus_support',
      'support_total',
      'customer_cut',
      // 2026-08-26 — cắt khách phần THƯỞNG: pot riêng, neo vào 'bonus_regulated',
      // nên đứng ngay sau dòng cắt khách phần hoa hồng.
      'customer_cut_bonus',
      'sale_net',
      'mv_remaining',
    ])
  })

  it('phủ đủ 11 trường CR liệt kê (Mã căn hiển thị ở caption, không phải dòng bảng)', () => {
    const labels = buildFeeSupportSummaryRows(makeCalculation()).map((r) => r.label)
    for (const required of [
      'Giá tính phí',
      'Phí đại lý MV nhận',
      'Thưởng MV nhận',
      'Phí sale quy định',
      'Thưởng sale',
      'Phí xin hỗ trợ',
      'Tổng phí nhận',
      'Cắt khách (HH)',
      'Cắt khách (thưởng)',
      'Sale hưởng',
      'Phí đại lý còn lại (MV)',
      // CR54 (86eyqwp4v) — nhãn mới + dòng mới.
      'Tổng phí xin hỗ trợ HH sale',
      'Phí xin thêm',
    ]) {
      expect(labels).toContain(required)
    }
  })

  it('CR54 — nhãn cũ "Xin hỗ trợ hoa hồng sale" không còn ở bất kỳ dòng nào', () => {
    const rows = buildFeeSupportSummaryRows(makeCalculation())

    // Nhãn cũ từng nằm ở CẢ nhãn dòng `support` lẫn ghi chú của `support_total`;
    // đổi mỗi nhãn dòng mà quên ghi chú là màn hình gọi một thứ bằng hai tên.
    for (const row of rows) {
      expect(row.label).not.toBe('Xin hỗ trợ hoa hồng sale')
      expect(row.note ?? '').not.toContain('Xin hỗ trợ hoa hồng sale')
    }
  })

  it('map THẲNG số của BE, không tự cộng trừ', () => {
    const byKey = Object.fromEntries(
      buildFeeSupportSummaryRows(makeCalculation()).map((r) => [r.key, r])
    )

    expect(byKey.fee_price.amount).toBe('10000000000')
    expect(byKey.agency_fee).toMatchObject({ pct: '5.00', amount: '500000000' })
    // Ngoại lệ duy nhất: "Thưởng MV nhận" gộp 2 kênh (FSD 18.8 §3.4.1).
    expect(byKey.bonus_received).toMatchObject({ pct: '0.65', amount: '65000000' })
    expect(byKey.sale_total).toMatchObject({ pct: '2.13', amount: '213000000' })
    expect(byKey.support_total).toMatchObject({ pct: '2.00', amount: '200000000' })
    expect(byKey.mv_remaining).toMatchObject({ pct: '0.90', amount: '89800000' })
    // Bản #2784 cộng thừa `support` vào sale_total (ra 310tr) — BA đã bác.
    expect(byKey.sale_total.amount).not.toBe('310000000')
  })

  it('gắn nhóm màu theo Excel: giá tính phí / khối sale / khối MV', () => {
    const byKey = Object.fromEntries(
      buildFeeSupportSummaryRows(makeCalculation()).map((r) => [r.key, r])
    )

    expect(byKey.fee_price.tone).toBe('price')
    expect(byKey.sale_regulated.tone).toBe('sale')
    expect(byKey.bonus_regulated.tone).toBe('sale')
    expect(byKey.mv_remaining.tone).toBe('mv')
  })

  it('in đậm đúng các dòng kết quả', () => {
    const emphasised = buildFeeSupportSummaryRows(makeCalculation())
      .filter((r) => r.emphasised)
      .map((r) => r.key)
    expect(emphasised).toEqual(['sale_total', 'support_total', 'sale_net', 'mv_remaining'])
  })

  it('chỉ hiện chú thích "Cấu hình x%" khi rate cấu hình khác 0', () => {
    const withConfig = buildFeeSupportSummaryRows(makeCalculation())
    expect(withConfig.find((r) => r.key === 'agency_fee')?.note).toBe('Cấu hình 5%')

    const calc = makeCalculation()
    // "0" là chuỗi truthy — guard phải so sánh bằng số, không dùng truthiness.
    calc.inflow.rows.agency_fee = row('500000000', '5.00', { pct_config: '0' })
    expect(buildFeeSupportSummaryRows(calc).find((r) => r.key === 'agency_fee')?.note).toBeNull()
  })

  it('sale_net = 0 vẫn hiện thành dòng có số 0, KHÔNG bị coi là rỗng', () => {
    const saleNet = buildFeeSupportSummaryRows(makeCalculation()).find((r) => r.key === 'sale_net')

    // Cắt khách trích TỪ phần xin hỗ trợ (FSD §5 rule 1) nên xin 1% rồi cắt trọn
    // 1% cho khách thì sale không thêm gì — đó chính là số người duyệt cần thấy.
    expect(saleNet?.amount).toBe('0')
    expect(saleNet?.amount).not.toBeNull()
    expect(saleNet?.pct).toBe('0')
  })

  it('thiếu rate phí đại lý → dòng vẫn còn, để trống cả hai vế', () => {
    const calc = makeCalculation()
    calc.remainder.mv_remaining = row(null)

    const mvRemaining = buildFeeSupportSummaryRows(calc).find((r) => r.key === 'mv_remaining')
    expect(mvRemaining).toBeDefined()
    expect(mvRemaining?.amount).toBeNull()
    expect(mvRemaining?.pct).toBeNull()
  })

  /**
   * CR `86eyhjjug`: bản đầu chỉ map `investor_bonus` nên bỏ sót hẳn `shared_bonus`.
   * FSD 18.8 §3.4.1 chốt BE giữ tách 2 kênh, FE gộp lúc hiển thị.
   */
  describe('CR 86eyhjjug — "Thưởng MV nhận" gộp investor_bonus + shared_bonus', () => {
    const bonusRowOf = (calc: FeeSupportCalculation) =>
      buildFeeSupportSummaryRows(calc).find((r) => r.key === 'bonus_received')

    it('cộng cả tiền lẫn % của hai kênh', () => {
      const bonus = bonusRowOf(makeCalculation())

      expect(bonus?.amount).toBe('65000000')
      expect(bonus?.pct).toBe('0.65')
      // Bản cũ trả thẳng investor_bonus — chốt lại để khỏi trôi ngược.
      expect(bonus?.amount).not.toBe('25000000')
    })

    it('chỉ một kênh có số → lấy đúng số đó, không coi kênh kia là 0', () => {
      const calc = makeCalculation()
      calc.inflow.rows.shared_bonus = row(null)

      expect(bonusRowOf(calc)).toMatchObject({ amount: '25000000', pct: '0.25' })
    })

    it('cả hai kênh đều null → null để ô hiện "—", KHÔNG phải 0đ', () => {
      const calc = makeCalculation()
      calc.inflow.rows.investor_bonus = row(null)
      calc.inflow.rows.shared_bonus = row(null)

      const bonus = bonusRowOf(calc)
      expect(bonus?.amount).toBeNull()
      expect(bonus?.pct).toBeNull()
    })

    it('0đ vẫn là 0đ, không bị nuốt thành null', () => {
      const calc = makeCalculation()
      calc.inflow.rows.investor_bonus = row('0', '0')
      calc.inflow.rows.shared_bonus = row(null)

      expect(bonusRowOf(calc)).toMatchObject({ amount: '0', pct: '0' })
    })

    it('bật chip "gồm VAT" khi BẤT KỲ kênh nào có rate gốc gồm VAT', () => {
      // Khối bóc tách (đã gỡ) từng gắn chip cho từng kênh riêng; dòng gộp phải gánh
      // lại, nếu không % hiệu dụng thấp hơn cấu hình mà không có lời giải thích.
      expect(bonusRowOf(makeCalculation())?.includesVat).toBe(false)

      const calc = makeCalculation()
      calc.inflow.rows.shared_bonus = row('40000000', '0.40', { includes_vat: true })
      expect(bonusRowOf(calc)?.includesVat).toBe(true)
    })
  })

  /** CR54 `86eyqwp4v` — dòng "Phí xin thêm" = `support − sale_regulated`. */
  describe('CR54 — dòng "Phí xin thêm"', () => {
    const extraRowOf = (calc: FeeSupportCalculation) =>
      buildFeeSupportSummaryRows(calc).find((r) => r.key === 'support_extra')

    it('trừ đúng cả tiền lẫn %, KHÔNG lấy support_total', () => {
      const calc = makeCalculation()
      calc.request.support = row('280000000', '2.80')
      calc.request.sale_regulated = row('266000000', '2.66')

      expect(extraRowOf(calc)).toMatchObject({ amount: '14000000', pct: '0.14' })
      // support_total (support + bonus_support) là dòng KHÁC — trừ nhầm từ nó ra 80tr.
      expect(extraRowOf(calc)?.amount).not.toBe('80000000')
    })

    /**
     * Điểm chỏi giữa CR và nghiệp vụ đang chạy (FSD 18.8 §3.4.1: `support` là khoản
     * xin THÊM, không gồm phí sale quy định) — đã báo BA, user chốt làm đúng CR.
     * Fixture mặc định (support 100tr < sale_regulated 210tr) chính là ca đó.
     */
    it('giữ nguyên dấu ÂM khi phiếu xin ít hơn mức quy định', () => {
      expect(extraRowOf(makeCalculation())).toMatchObject({
        amount: '-110000000',
        pct: '-1.10',
      })
    })

    it('thiếu một vế → để trống cả dòng, không coi vế thiếu là 0', () => {
      const calc = makeCalculation()
      // Phiếu chỉ xin thưởng: không có kênh hoa hồng sale nào để mà "xin thêm".
      calc.request.support = row(null)

      expect(extraRowOf(calc)?.amount).toBeNull()
      expect(extraRowOf(calc)?.pct).toBeNull()
    })

    it('ghi chú nêu đúng công thức bằng chữ của hai dòng nó trừ', () => {
      expect(extraRowOf(makeCalculation())?.note).toBe(
        'Tổng phí xin hỗ trợ HH sale − Phí sale quy định'
      )
    })

    it('không in đậm — đây là dòng thành phần, không phải dòng kết quả', () => {
      expect(extraRowOf(makeCalculation())?.emphasised).toBeFalsy()
    })
  })

  /** CR54 `86eyqwp4v` — thưởng nhập bằng số tiền thì bỏ cột %. */
  describe('CR54 — ẩn % của dòng "Xin hỗ trợ thưởng" khi phiếu xin theo số tiền', () => {
    const bonusSupportOf = (isAmountMode: boolean) =>
      buildFeeSupportSummaryRows(makeCalculation(), {
        bonusSupportIsAmountMode: isAmountMode,
      }).find((r) => r.key === 'bonus_support')

    it('mode SỐ TIỀN: bỏ % (BE vẫn trả % quy đổi ngược), giữ nguyên tiền', () => {
      const bonus = bonusSupportOf(true)

      expect(bonus?.pct).toBeNull()
      expect(bonus?.amount).toBe('100000000')
      expect(bonus?.note).toBe('Phiếu xin theo số tiền nên không có tỷ lệ %')
    })

    it('mode %: giữ nguyên cột % như cũ', () => {
      expect(bonusSupportOf(false)).toMatchObject({ pct: '1.00', amount: '100000000' })
    })

    it('mặc định (không truyền option) = mode %, không tự ẩn', () => {
      const bonus = buildFeeSupportSummaryRows(makeCalculation()).find(
        (r) => r.key === 'bonus_support'
      )
      expect(bonus?.pct).toBe('1.00')
    })

    /**
     * Dữ liệu thật trên dev còn phiếu `support_bonus_amount = 0` (FSR-2026-000022):
     * BE trả cả hai vế null nên dòng vốn đã trống — gắn ghi chú "xin theo số tiền"
     * vào đó là đi giải thích một khoản không tồn tại.
     */
    it('dòng thưởng không có số → không gắn ghi chú, dù phiếu ở mode số tiền', () => {
      const calc = makeCalculation()
      calc.request.bonus_support = row(null)

      const bonus = buildFeeSupportSummaryRows(calc, { bonusSupportIsAmountMode: true }).find(
        (r) => r.key === 'bonus_support'
      )
      expect(bonus?.amount).toBeNull()
      expect(bonus?.note).toBeUndefined()
    })

    it('CHỈ đụng dòng thưởng — dòng hoa hồng sale giữ nguyên %', () => {
      // Ranh giới BA chốt: ẩn % ở dòng "Xin hỗ trợ thưởng", không phải mọi dòng
      // nhập bằng tiền. Nới ra là đổi phạm vi CR mà không ai duyệt.
      const rows = buildFeeSupportSummaryRows(makeCalculation(), {
        bonusSupportIsAmountMode: true,
      })
      const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))

      expect(byKey.support.pct).toBe('1.00')
      expect(byKey.sale_regulated.pct).toBe('2.10')
      expect(byKey.support_total.pct).toBe('2.00')
    })
  })
})
