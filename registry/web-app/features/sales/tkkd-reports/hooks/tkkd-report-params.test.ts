import { describe, expect, it } from 'vitest'
import { buildTkkdReportParams } from './tkkd-report-params'

describe('buildTkkdReportParams', () => {
  it('builds month-mode params from year + month', () => {
    expect(buildTkkdReportParams({ periodType: 'month', year: 2026, month: 7 })).toEqual({
      year: 2026,
      month: 7,
    })
  })

  it('returns undefined in month mode when year or month is missing', () => {
    expect(buildTkkdReportParams({ periodType: 'month', year: 2026 })).toBeUndefined()
    expect(buildTkkdReportParams({ periodType: 'month', month: 7 })).toBeUndefined()
  })

  it('builds week-mode params from the week anchor', () => {
    expect(buildTkkdReportParams({ periodType: 'week', week: '2026-07-10' })).toEqual({
      period_type: 'week',
      week: '2026-07-10',
    })
  })

  it('returns undefined in week mode when week is missing', () => {
    expect(buildTkkdReportParams({ periodType: 'week' })).toBeUndefined()
  })

  it('includes org-chart + sign-date filters when present, omits when absent', () => {
    expect(
      buildTkkdReportParams({
        periodType: 'month',
        year: 2026,
        month: 7,
        branch: 3,
        block: 5,
        department: 9,
        contractDateFrom: '2026-07-01',
        contractDateTo: '2026-07-25',
      })
    ).toEqual({
      year: 2026,
      month: 7,
      branch: 3,
      block: 5,
      department: 9,
      contract_date_from: '2026-07-01',
      contract_date_to: '2026-07-25',
    })

    // Falsy org ids (0 / undefined) are omitted, not sent as keys.
    expect(buildTkkdReportParams({ periodType: 'week', week: '2026-07-10', branch: 0 })).toEqual({
      period_type: 'week',
      week: '2026-07-10',
    })
  })

  describe('transaction-sheet date filter (độc lập với contract sign-date filter)', () => {
    it('maps transactionSheetDateFrom/To to transaction_sheet_date_from/to', () => {
      expect(
        buildTkkdReportParams({
          periodType: 'month',
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

    it('leaves contract_date_from/to untouched when only transaction-sheet date is set (regression)', () => {
      expect(
        buildTkkdReportParams({
          periodType: 'month',
          year: 2026,
          month: 7,
          contractDateFrom: '2026-07-01',
          contractDateTo: '2026-07-25',
        })
      ).toEqual({
        year: 2026,
        month: 7,
        contract_date_from: '2026-07-01',
        contract_date_to: '2026-07-25',
      })
    })

    it('sends both date-range pairs together when both are set (AND, no override)', () => {
      expect(
        buildTkkdReportParams({
          periodType: 'month',
          year: 2026,
          month: 7,
          contractDateFrom: '2026-07-01',
          contractDateTo: '2026-07-25',
          transactionSheetDateFrom: '2026-08-01',
          transactionSheetDateTo: '2026-08-15',
        })
      ).toEqual({
        year: 2026,
        month: 7,
        contract_date_from: '2026-07-01',
        contract_date_to: '2026-07-25',
        transaction_sheet_date_from: '2026-08-01',
        transaction_sheet_date_to: '2026-08-15',
      })
    })
  })
})
