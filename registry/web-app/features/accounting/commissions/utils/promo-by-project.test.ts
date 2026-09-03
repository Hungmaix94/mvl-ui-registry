import { describe, it, expect } from 'vitest'
import {
  buildPromoProjectRows,
  getPromoColumnPctTypes,
  sumPromoProjectRows,
  type PromoLine,
} from './promo-by-project'

/** 1 payee row: quỹ xúc tiến 500M trên doanh thu phí 5 tỷ, tiền về 50%. */
function promoLine(
  overrides: Partial<PromoLine['source_info']> = {},
  amount = '75000000'
): PromoLine {
  return {
    amount,
    source_info: {
      project: { id: 7, code: 'PRJ-7', name: 'Khu đô thị X' },
      distribution: {
        id: 15,
        code: 'PBXT-2026-0015',
        period_year: 2026,
        period_month: 5,
        total_fee_calculation_price: '5000000000',
        snapshot_pct_promotion_revenue: '10.00',
        marketing_cost: '0',
        revenue_base: '500000000',
        payout_ratio: '0.500000',
        formula_amount: '150000000',
        by_pct_type: [
          {
            pct_type: 'pct_relationship',
            snapshot_pct_split: '25.00',
            snapshot_contribution_level: '80.00',
            effective_pct: '20.0000000000',
            formula_amount: '100000000',
            amount: '50000000',
          },
          {
            pct_type: 'pct_coordination',
            snapshot_pct_split: '10.00',
            snapshot_contribution_level: '100.00',
            effective_pct: '10.0000000000',
            formula_amount: '50000000',
            amount: '25000000',
          },
        ],
      },
      ...overrides,
    },
  }
}

describe('buildPromoProjectRows', () => {
  it('dựng 1 dòng / dự án kèm doanh thu, quỹ và từng vai trò', () => {
    const [row] = buildPromoProjectRows([promoLine()])

    expect(row.projectName).toBe('Khu đô thị X')
    expect(row.projectRevenue).toBe(5_000_000_000)
    expect(row.promotionPool).toBe(500_000_000)
    expect(row.distributions).toEqual([{ id: 15, code: 'PBXT-2026-0015', periodLabel: '05/2026' }])

    // % neo vào quỹ xúc tiến: 100M/500M = 20%, 50M/500M = 10%.
    expect(row.roles.pct_relationship).toMatchObject({
      amount: 50_000_000,
      formulaAmount: 100_000_000,
      pct: 20,
      pctSplit: '25.00',
      contributionLevel: '80.00',
    })
    expect(row.roles.pct_coordination.pct).toBe(10)

    expect(row.formulaTotal).toBe(150_000_000)
    expect(row.amountTotal).toBe(75_000_000)
    expect(row.payoutPct).toBe(50)
    expect(row.unassignedAmount).toBe(0)
  })

  it('cột vai trò cộng lại đúng bằng tiền thực nhận của dòng', () => {
    const [row] = buildPromoProjectRows([promoLine()])
    const roleTotal = Object.values(row.roles).reduce((sum, cell) => sum + cell.amount, 0)

    expect(roleTotal).toBe(row.amountTotal)
  })

  it('gộp nhiều phiếu phân bổ của cùng dự án, % neo vào tổng quỹ', () => {
    const second = promoLine({}, '25000000')
    second.source_info!.distribution = {
      id: 16,
      code: 'PBXT-2026-0016',
      period_year: 2026,
      period_month: 4,
      total_fee_calculation_price: '1000000000',
      revenue_base: '100000000',
      payout_ratio: '0.500000',
      formula_amount: '50000000',
      by_pct_type: [
        {
          pct_type: 'pct_relationship',
          snapshot_pct_split: '50.00',
          snapshot_contribution_level: '100.00',
          effective_pct: '50.0000000000',
          formula_amount: '50000000',
          amount: '25000000',
        },
      ],
    }

    const rows = buildPromoProjectRows([promoLine(), second])

    expect(rows).toHaveLength(1)
    const [row] = rows
    expect(row.distributions.map((d) => d.code)).toEqual(['PBXT-2026-0015', 'PBXT-2026-0016'])
    expect(row.promotionPool).toBe(600_000_000)
    // 150M ghi nhận / 600M quỹ = 25%; cặp % cấu hình không còn mô tả đúng ô gộp nên bị bỏ.
    expect(row.roles.pct_relationship.pct).toBe(25)
    expect(row.roles.pct_relationship.pctSplit).toBeNull()
    expect(row.amountTotal).toBe(100_000_000)
  })

  it('tách dòng theo từng dự án', () => {
    const other = promoLine({ project: { id: 9, code: 'PRJ-9', name: 'Dự án Y' } }, '10000000')
    const rows = buildPromoProjectRows([promoLine(), other])

    expect(rows.map((r) => r.projectName)).toEqual(['Khu đô thị X', 'Dự án Y'])
  })

  it('payee không gắn phiếu phân bổ vẫn giữ nguyên tiền, đánh dấu chưa rõ vai trò', () => {
    const [row] = buildPromoProjectRows([promoLine({ distribution: null }, '12000000')])

    expect(row.amountTotal).toBe(12_000_000)
    expect(row.unassignedAmount).toBe(12_000_000)
    expect(row.roles).toEqual({})
    expect(row.payoutPct).toBeNull()
  })

  it('không chia cho 0 khi quỹ xúc tiến rỗng', () => {
    const line = promoLine()
    line.source_info!.distribution!.revenue_base = '0'
    const [row] = buildPromoProjectRows([line])

    expect(row.roles.pct_relationship.pct).toBeNull()
  })
})

describe('getPromoColumnPctTypes', () => {
  it('luôn đủ 5 vai trò theo thứ tự cố định, kể cả khi người này không hưởng hết', () => {
    // Fixture chỉ có 2 vai trò, nhưng khung cột phải giữ nguyên giữa các kỳ / các người.
    const rows = buildPromoProjectRows([promoLine()])

    expect(getPromoColumnPctTypes(rows)).toEqual([
      'pct_relationship',
      'pct_planning',
      'pct_packaging',
      'pct_sales_support',
      'pct_coordination',
    ])
  })

  it('vai trò lạ nối thêm vào cuối, không bị nuốt mất', () => {
    const line = promoLine()
    line.source_info!.distribution!.by_pct_type!.push({
      pct_type: 'pct_unknown',
      snapshot_pct_split: '5.00',
      snapshot_contribution_level: '100.00',
      effective_pct: '5.0000000000',
      formula_amount: '25000000',
      amount: '12500000',
    })

    expect(getPromoColumnPctTypes(buildPromoProjectRows([line]))).toEqual([
      'pct_relationship',
      'pct_planning',
      'pct_packaging',
      'pct_sales_support',
      'pct_coordination',
      'pct_unknown',
    ])
  })
})

describe('sumPromoProjectRows', () => {
  it('cộng theo cột để đối chiếu với tổng nhóm', () => {
    const rows = buildPromoProjectRows([
      promoLine(),
      promoLine({ project: { id: 9, code: 'PRJ-9', name: 'Dự án Y' } }, '75000000'),
    ])
    const totals = sumPromoProjectRows(rows)

    expect(totals.projectRevenue).toBe(10_000_000_000)
    expect(totals.promotionPool).toBe(1_000_000_000)
    expect(totals.roles.pct_relationship).toBe(100_000_000)
    expect(totals.amountTotal).toBe(150_000_000)
  })
})
