import { describe, expect, it } from 'vitest'

import { DealRevenueMode } from '@/constants/api-schema-aliases'

import {
  formatAgencyFee,
  formatInvoiceMonth,
  formatRevenueFee,
  type FeeCellSource,
} from './worksheet-fee-cells'

/**
 * CR STT51 (`86eymm0hq`). Ba ô này rẽ nhánh theo cấu hình của deal, nên cái đáng canh không phải
 * "có in ra chữ gì không" mà là **rẽ đúng nhánh** — in số tiền vào ô mà kế toán đang dóng hàng với
 * các ô phần trăm là lỗi chạy trót lọt, không ai thấy cho tới lúc đối chiếu sổ.
 */

function row(over: Partial<FeeCellSource> = {}): FeeCellSource {
  return {
    fee_pct: '0',
    fee_fixed_amt: null,
    revenue_mode: DealRevenueMode.percentage,
    pct_revenue: null,
    revenue_amount: '0',
    invoice_date: null,
    ...over,
  }
}

describe('formatAgencyFee — cột "Phí đại lý"', () => {
  it('in TỶ LỆ khi SA cấu hình phí theo phần trăm', () => {
    expect(formatAgencyFee(row({ fee_pct: '2.1000', fee_fixed_amt: null }))).toBe('2,1%')
  })

  it('in SỐ TIỀN khi SA cấu hình phí theo số tiền', () => {
    // BA 21/08: "đôi khi là %, đôi khi là số tiền, tuỳ theo người dùng thiết lập ở SA, hãy hiển
    // thị hết" — một cột mang hai đơn vị, nên tiêu đề cột cố ý không có hậu tố "(%)".
    expect(formatAgencyFee(row({ fee_pct: '0', fee_fixed_amt: '500000000' }))).toBe('500.000.000')
  })

  it('coi số 0 ĐÚNG NHƯ null — vế không dùng tới bị ghi thành 0 vẫn phải in tỷ lệ', () => {
    // Đây là ca dễ hỏng nhất. Luật nghiệp vụ ở `Deal.get_agency_fee_amount` phía backend:
    // vế không dùng tới được "materialised as Decimal('0')" và số 0 PHẢI rơi về tỷ lệ. Ai đổi
    // sang kiểm `!== null` thì mọi deal cấu hình theo tỷ lệ sẽ hiện "0" thay vì tỷ lệ của nó.
    expect(formatAgencyFee(row({ fee_pct: '2.0000', fee_fixed_amt: '0' }))).toBe('2%')
    // Cùng deal, vế tiền vắng mặt thay vì bị ghi 0 — phải đọc ra y hệt.
    expect(formatAgencyFee(row({ fee_pct: '2.0000', fee_fixed_amt: null }))).toBe('2%')
  })
})

describe('formatRevenueFee — cột "Phí doanh thu"', () => {
  it('deal khai theo PHẦN TRĂM thì in tỷ lệ', () => {
    expect(
      formatRevenueFee(
        row({
          revenue_mode: DealRevenueMode.percentage,
          pct_revenue: '1.50',
          revenue_amount: '15000000',
        })
      )
    ).toBe('1,5%')
  })

  it('deal khai theo SỐ TIỀN CỐ ĐỊNH thì in số tiền', () => {
    expect(
      formatRevenueFee(
        row({ revenue_mode: DealRevenueMode.fixed, pct_revenue: null, revenue_amount: '15000000' })
      )
    ).toBe('15.000.000')
  })

  it('rẽ theo MODE, không theo `pct_revenue` rỗng', () => {
    // Một deal PERCENTAGE chưa kịp snapshot tỷ lệ cũng cho `pct_revenue = null`. Rẽ theo null thì
    // nó rơi nhầm sang nhánh tiền và in "15.000.000" dưới một tiêu đề mà kế toán đang đọc là
    // phần trăm. Đúng phải là gạch ngang: "chưa biết", không phải một con số.
    expect(
      formatRevenueFee(
        row({
          revenue_mode: DealRevenueMode.percentage,
          pct_revenue: null,
          revenue_amount: '15000000',
        })
      )
    ).toBe('—')
  })
})

describe('formatInvoiceMonth — cột "Tháng xuất hoá đơn"', () => {
  it('in MM/yyyy của hoá đơn đại diện', () => {
    expect(formatInvoiceMonth(row({ invoice_date: '2026-07-09' }))).toBe('07/2026')
  })

  it('in gạch ngang khi phiếu thu đại diện không gắn hoá đơn', () => {
    // KHÔNG được suy tháng từ `period_year`/`period_month` — đó là kỳ phân bổ, một đại lượng khác.
    expect(formatInvoiceMonth(row({ invoice_date: null }))).toBe('—')
  })
})
