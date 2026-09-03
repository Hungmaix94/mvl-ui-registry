// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { type Allocation, getPeriodFeeInfo } from './PaymentProgressTimeline'

describe('getPeriodFeeInfo — gom % thanh toán phí về một nguồn duy nhất', () => {
  const baseAlloc: Allocation = {
    id: 101,
    worksheet_id: 201,
    period_year: 2026,
    period_month: 8,
    distribution_pct: '43.431861',
    fee_progress_pct: null,
    bonus_progress_pct: null,
    amount_received: '100000000',
    date: '2026-08-01',
    status: 'DRAFT',
    code: 'Kỳ 08/2026',
    payout_allocated_amount: '100000000',
  }

  it('kỳ đang chọn và dial phí đã lưu (đã chốt): isEstimated là false', () => {
    const alloc = { ...baseAlloc, fee_progress_pct: '30.00' }
    const result = getPeriodFeeInfo(alloc, true, 30)

    expect(result.pct).toBe(30)
    expect(result.pctLabel).toBe('30%')
    expect(result.isEstimated).toBe(false)
  })

  it('kỳ đang chọn nhưng dial phí chưa lưu (null): isEstimated là true', () => {
    const alloc = { ...baseAlloc, fee_progress_pct: null }
    const result = getPeriodFeeInfo(alloc, true, 43.43)

    expect(result.pct).toBe(43.43)
    expect(result.pctLabel).toBe('43,43%')
    expect(result.isEstimated).toBe(true)
  })

  it('kỳ không được chọn và có fee_progress_pct đã lưu: đọc fee_progress_pct, isEstimated là false', () => {
    const alloc = { ...baseAlloc, fee_progress_pct: '25.500000' }
    const result = getPeriodFeeInfo(alloc, false, 0)

    expect(result.pct).toBe(25.5)
    expect(result.pctLabel).toBe('25,5%')
    expect(result.isEstimated).toBe(false)
  })

  it('kỳ không được chọn và chưa có fee_progress_pct: fallback về tiền về, isEstimated là true', () => {
    const alloc = { ...baseAlloc, fee_progress_pct: null, fee_collection_pct: '43.431861' }
    const result = getPeriodFeeInfo(alloc, false, 0)

    expect(result.pct).toBe(43.431861)
    expect(result.pctLabel).toBe('43,43%')
    expect(result.isEstimated).toBe(true)
  })

  // BE từng trả chuỗi RỖNG thay vì null cho `fee_progress_pct` (xem parse-pct.test.ts).
  // Hai nhánh phải hiểu "chưa chốt dial" giống nhau, không thì kỳ đang chọn mất nhãn
  // "(tạm tính theo tiền về)" trong khi kỳ cũ vẫn có.
  it('chuỗi RỖNG cũng là chưa chốt dial — kỳ đang chọn', () => {
    const alloc = { ...baseAlloc, fee_progress_pct: '' }
    const result = getPeriodFeeInfo(alloc, true, 43.43)

    expect(result.isEstimated).toBe(true)
  })

  it('chuỗi RỖNG cũng là chưa chốt dial — kỳ không được chọn', () => {
    const alloc = { ...baseAlloc, fee_progress_pct: '', fee_collection_pct: '43.431861' }
    const result = getPeriodFeeInfo(alloc, false, 0)

    expect(result.pct).toBe(43.431861)
    expect(result.isEstimated).toBe(true)
  })
})
