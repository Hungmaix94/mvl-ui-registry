import { describe, expect, it } from 'vitest'
import { buildDepositCumulativeParams } from './deposit-cumulative-params'

describe('buildDepositCumulativeParams', () => {
  it('builds params from year + month', () => {
    expect(buildDepositCumulativeParams({ year: 2026, month: 7 })).toEqual({
      year: 2026,
      month: 7,
    })
  })

  it('returns undefined when year or month is missing', () => {
    expect(buildDepositCumulativeParams({ year: 2026 })).toBeUndefined()
    expect(buildDepositCumulativeParams({ month: 7 })).toBeUndefined()
    expect(buildDepositCumulativeParams({})).toBeUndefined()
  })

  it('includes org-chart filters when present, omits falsy ones', () => {
    expect(
      buildDepositCumulativeParams({
        year: 2026,
        month: 7,
        branch: 3,
        block: 5,
        department: 9,
      })
    ).toEqual({ year: 2026, month: 7, branch: 3, block: 5, department: 9 })

    // Falsy org ids (0 / undefined) are omitted, not sent as keys.
    expect(buildDepositCumulativeParams({ year: 2026, month: 7, branch: 0 })).toEqual({
      year: 2026,
      month: 7,
    })
  })

  describe('Ngày làm phiếu TTGD (transactionSheetDateFrom/To) — độc lập với các bộ lọc khác', () => {
    it('maps transactionSheetDateFrom/To to transaction_sheet_date_from/to', () => {
      expect(
        buildDepositCumulativeParams({
          year: 2026,
          month: 7,
          transactionSheetDateFrom: '2026-08-01',
          transactionSheetDateTo: '2026-08-15',
        })
      ).toEqual({
        year: 2026,
        month: 7,
        transaction_sheet_date_from: '2026-08-01',
        transaction_sheet_date_to: '2026-08-15',
      })
    })

    it('leaves org-chart params untouched when only transaction-sheet date is set (regression)', () => {
      expect(
        buildDepositCumulativeParams({
          year: 2026,
          month: 7,
          branch: 3,
          block: 5,
          department: 9,
        })
      ).toEqual({ year: 2026, month: 7, branch: 3, block: 5, department: 9 })
    })

    it('sends org-chart + transaction-sheet date params together (AND, no override)', () => {
      expect(
        buildDepositCumulativeParams({
          year: 2026,
          month: 7,
          branch: 3,
          transactionSheetDateFrom: '2026-08-01',
          transactionSheetDateTo: '2026-08-15',
        })
      ).toEqual({
        year: 2026,
        month: 7,
        branch: 3,
        transaction_sheet_date_from: '2026-08-01',
        transaction_sheet_date_to: '2026-08-15',
      })
    })
  })
})
