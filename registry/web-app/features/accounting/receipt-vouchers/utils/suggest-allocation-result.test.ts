import { describe, expect, it } from 'vitest'

import {
  aggregateSuggestionsByInvoice,
  resolveSuggestAllocation,
  suggestAllocationErrorMessage,
  SUGGEST_ALLOCATION_EMPTY_MESSAGE,
  SUGGEST_ALLOCATION_FALLBACK_MESSAGE,
} from './suggest-allocation-result'

describe('aggregateSuggestionsByInvoice', () => {
  it('gộp nhiều DÒNG của một hoá đơn thành MỘT dòng form', () => {
    const rows = aggregateSuggestionsByInvoice([
      { invoice_id: 7, sales_invoice_line_id: 1, allocated_amount: '600', allocation_pct: '60' },
      { invoice_id: 7, sales_invoice_line_id: 2, allocated_amount: '400', allocation_pct: '40' },
    ])

    expect(rows).toEqual([{ sales_invoice: 7, allocated_amount: '1000', allocation_pct: '100' }])
  })

  it('dòng chênh lệch làm tròn ÂM trừ vào tổng của chính hoá đơn đó', () => {
    const rows = aggregateSuggestionsByInvoice([
      { invoice_id: 7, sales_invoice_line_id: 1, allocated_amount: '1000', allocation_pct: '100' },
      { invoice_id: 7, sales_invoice_line_id: 9, allocated_amount: '-1', allocation_pct: '0' },
    ])

    expect(rows).toEqual([{ sales_invoice: 7, allocated_amount: '999', allocation_pct: '100' }])
  })

  it('giữ tổng ÂM khi cả hoá đơn là điều chỉnh giảm', () => {
    const rows = aggregateSuggestionsByInvoice([
      { invoice_id: 8, allocated_amount: '-5000', allocation_pct: '100' },
    ])

    expect(rows[0].allocated_amount).toBe('-5000')
  })

  it('giữ thứ tự hoá đơn theo lần xuất hiện đầu tiên', () => {
    const rows = aggregateSuggestionsByInvoice([
      { invoice_id: 12, allocated_amount: '1' },
      { invoice_id: 3, allocated_amount: '2' },
      { invoice_id: 12, allocated_amount: '3' },
    ])

    expect(rows.map((r) => r.sales_invoice)).toEqual([12, 3])
    expect(rows[0].allocated_amount).toBe('4')
  })

  it('bỏ qua bản ghi không có invoice_id hợp lệ', () => {
    const rows = aggregateSuggestionsByInvoice([
      { invoice_id: NaN, allocated_amount: '5' },
      { invoice_id: 1, allocated_amount: '5' },
    ])

    expect(rows).toEqual([{ sales_invoice: 1, allocated_amount: '5', allocation_pct: '0' }])
  })
})

describe('resolveSuggestAllocation', () => {
  it('áp dụng gợi ý khi có danh sách', () => {
    const outcome = resolveSuggestAllocation({
      suggestions: [{ invoice_id: 1, allocated_amount: '10', allocation_pct: '5' }],
    })

    expect(outcome).toEqual({
      kind: 'applied',
      invoices: [{ sales_invoice: 1, allocated_amount: '10', allocation_pct: '5' }],
    })
  })

  it('báo rỗng khi máy chủ trả 200 nhưng không gợi ý gì', () => {
    expect(resolveSuggestAllocation({ suggestions: [] })).toEqual({
      kind: 'empty',
      message: SUGGEST_ALLOCATION_EMPTY_MESSAGE,
    })
    expect(resolveSuggestAllocation(null).kind).toBe('empty')
    expect(resolveSuggestAllocation({}).kind).toBe('empty')
  })
})

describe('suggestAllocationErrorMessage', () => {
  it('dùng nguyên câu tiếng Việt của BE trong envelope validation_error', () => {
    const message = suggestAllocationErrorMessage({
      error: {
        type: 'validation_error',
        errors: [
          {
            code: 'invalid',
            attr: 'invoice_ids',
            detail:
              'Các hoá đơn đang chọn cộng lại ra số âm. Vui lòng chọn thêm hoá đơn dương của chủ đầu tư này.',
          },
        ],
      },
    })

    expect(message).toBe(
      'Các hoá đơn đang chọn cộng lại ra số âm. Vui lòng chọn thêm hoá đơn dương của chủ đầu tư này.'
    )
  })

  it('đọc được cả envelope `server` (extractApiData)', () => {
    expect(
      suggestAllocationErrorMessage({ server: { detail: 'Chỉ chọn hoá đơn điều chỉnh giảm.' } })
    ).toBe('Chỉ chọn hoá đơn điều chỉnh giảm.')
  })

  it('có câu dự phòng khi BE không kèm câu chữ nào', () => {
    expect(suggestAllocationErrorMessage({})).toBe(SUGGEST_ALLOCATION_FALLBACK_MESSAGE)
    expect(suggestAllocationErrorMessage(null)).toBe(SUGGEST_ALLOCATION_FALLBACK_MESSAGE)
  })
})
