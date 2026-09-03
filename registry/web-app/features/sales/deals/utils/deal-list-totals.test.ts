import { describe, expect, it } from 'vitest'

import type { DealListSummary } from '../services/deal-service'
import { readDealListSummary } from './deal-list-totals'

/**
 * Payload thật BE chốt trong PR #2852 (355 deal khớp filter, 7 deal huỷ/bỏ bị loại).
 * `total_sales_fee` có 8 chữ số thập phân — cố tình, để giữ parity với cột trên bảng.
 */
const REAL_SUMMARY: DealListSummary = {
  deal_count: 348,
  excluded_deal_count: 7,
  total_sales_fee: '1003809524.00000000',
  agency_fee_amount: '60000000',
  revenue_amount: '100000000',
  total_amount: '60000000',
  // Sáu khoá dưới đây phục vụ dòng tổng dưới bảng, không phải các thẻ ở đầu màn — nhưng
  // BE trả chúng trong cùng một khối nên fixture phải có, nếu không nó không còn là hình
  // dạng payload thật nữa.
  listed_price: '2000000000',
  fee_calculation_price: '2000000000',
  total_advanced_amount: '150000000.00',
  invoiced_net_amount: '40000000',
  bonus_amount: '8000000',
  remaining_amount: '20000000',
}

describe('readDealListSummary', () => {
  it('maps every summary key to its own card field', () => {
    // Arrange & Act
    const totals = readDealListSummary(REAL_SUMMARY)

    // Assert
    expect(totals).toEqual({
      dealCount: 348,
      excludedDealCount: 7,
      salesFeeAmount: 1003809524,
      agencyFeeAmount: 60000000,
      revenueAmount: 100000000,
      totalAmount: 60000000,
    })
  })

  it('parses the 8-decimal sales fee as a number, not a string', () => {
    // Arrange & Act
    const totals = readDealListSummary({ ...REAL_SUMMARY, total_sales_fee: '1234567.89000000' })

    // Assert
    expect(totals?.salesFeeAmount).toBe(1234567.89)
    expect(typeof totals?.salesFeeAmount).toBe('number')
  })

  it('returns null when the response carries no summary', () => {
    // Arrange & Act & Assert — không được bịa số 0, chỗ gọi phải hiện dấu gạch
    expect(readDealListSummary(undefined)).toBeNull()
  })

  /**
   * REGRESSION: thẻ "Tổng tiền trả sale" từng đọc `total_amount`. Ở payload này hai khoá lệch
   * hẳn nhau nên nhầm lại là đỏ ngay.
   */
  it('never sources the sales fee from total_amount', () => {
    // Arrange & Act
    const totals = readDealListSummary(REAL_SUMMARY)

    // Assert
    expect(totals?.salesFeeAmount).not.toBe(totals?.totalAmount)
    expect(totals?.salesFeeAmount).not.toBe(totals?.agencyFeeAmount)
  })

  /**
   * REGRESSION: thẻ đếm phải đọc `deal_count` (đã loại huỷ/bỏ), không phải `count` của paginator.
   * Bất biến BE cam kết: deal_count + excluded_deal_count === count.
   */
  it('keeps the deal count separate from the excluded count', () => {
    // Arrange
    const paginatorCount = 355

    // Act
    const totals = readDealListSummary(REAL_SUMMARY)

    // Assert
    expect(totals?.dealCount).toBe(348)
    expect((totals?.dealCount ?? 0) + (totals?.excludedDealCount ?? 0)).toBe(paginatorCount)
  })

  /**
   * Lọc ?status=cancelled: bảng vẫn có dòng nhưng mọi chỉ tiêu về 0 và toàn bộ deal bị loại —
   * quy tắc loại trừ thắng bộ lọc của người dùng. Thẻ phải nói ra, không được im lặng.
   */
  it('reports zeroes with every deal excluded when filtering by a cancelled status', () => {
    // Arrange
    const cancelledOnly: DealListSummary = {
      deal_count: 0,
      excluded_deal_count: 12,
      total_sales_fee: '0',
      agency_fee_amount: '0',
      revenue_amount: '0',
      total_amount: '0',
      listed_price: '0',
      fee_calculation_price: '0',
      total_advanced_amount: '0.00',
      invoiced_net_amount: '0',
      bonus_amount: '0',
      remaining_amount: '0',
    }

    // Act
    const totals = readDealListSummary(cancelledOnly)

    // Assert
    expect(totals).toEqual({
      dealCount: 0,
      excludedDealCount: 12,
      salesFeeAmount: 0,
      agencyFeeAmount: 0,
      revenueAmount: 0,
      totalAmount: 0,
    })
  })

  it('treats unparsable or empty decimals as zero instead of NaN', () => {
    // Arrange & Act
    const totals = readDealListSummary({
      ...REAL_SUMMARY,
      total_sales_fee: '',
      agency_fee_amount: 'n/a',
    })

    // Assert
    expect(totals?.salesFeeAmount).toBe(0)
    expect(totals?.agencyFeeAmount).toBe(0)
  })
})
