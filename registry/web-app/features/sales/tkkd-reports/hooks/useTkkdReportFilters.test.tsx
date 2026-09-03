import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { getWeekRangeApi } from '@/utils/date-utils'
import { useTkkdReportFilters } from './useTkkdReportFilters'

vi.mock('@/features/accounting/accounting-periods/services/accounting-period-service', () => ({
  useAllAccountingPeriods: () => ({ data: [{ id: 12, year: 2026, month: 7 }] }),
  useCurrentAccountingPeriod: () => ({ data: { id: 12, year: 2026, month: 7 }, isLoading: false }),
}))

function renderFilters(initialUrl: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  )
  return renderHook(() => useTkkdReportFilters(), { wrapper })
}

describe('useTkkdReportFilters (86euvmaba)', () => {
  // Regression: switching to week mode only set `period_type=week`, leaving `week`
  // empty → params stayed undefined → the report never queried and sat blank.
  it('seeds the current week when week mode has no week yet', async () => {
    const thisMonday = getWeekRangeApi(new Date()).from
    const { result } = renderFilters('/report?period_type=week')

    await waitFor(() => expect(result.current.week).toBe(thisMonday))
    expect(result.current.isUrlReady).toBe(true)
    expect(result.current.params).toEqual({ period_type: 'week', week: thisMonday })
  })

  it('keeps the week already present in the URL', async () => {
    const { result } = renderFilters('/report?period_type=week&week=2026-07-06')

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.week).toBe('2026-07-06')
    expect(result.current.params).toEqual({ period_type: 'week', week: '2026-07-06' })
  })

  it('seeds the current accounting period in month mode', async () => {
    const { result } = renderFilters('/report')

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.periodType).toBe('month')
    expect(result.current.params).toEqual({ year: 2026, month: 7 })
  })
})

// The optional filters now live in a filter dialog (PageTitle `handleFilter` +
// `AppDialog variant="filter"`), so the hook has to expose a badge count and a
// batched apply instead of the old apply-on-change filter bar.
describe('useTkkdReportFilters — filter dialog contract', () => {
  it('counts the date range as one filter and each org level as one', async () => {
    const { result } = renderFilters(
      '/report?year=2026&month=7&contract_date_from=2026-07-01&contract_date_to=2026-07-31&branch=3&department=9'
    )

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    // range (1) + branch (1) + department (1); block is absent
    expect(result.current.activeFilterCount).toBe(3)
  })

  it('reports no active filter when only the period is set', async () => {
    const { result } = renderFilters('/report?year=2026&month=7')

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.activeFilterCount).toBe(0)
  })

  it('hydrates the dialog with Date objects parsed from the URL', async () => {
    const { result } = renderFilters(
      '/report?year=2026&month=7&contract_date_from=2026-07-01&branch=3'
    )

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    const values = result.current.filterFormValues
    expect(values.contractDateFrom?.getFullYear()).toBe(2026)
    expect(values.contractDateFrom?.getMonth()).toBe(6)
    expect(values.contractDateFrom?.getDate()).toBe(1)
    expect(values.contractDateTo).toBeUndefined()
    expect(values.branch).toBe('3')
    expect(values.block).toBeUndefined()
  })

  it('applyFilters writes the whole set at once and keeps the period', async () => {
    const { result } = renderFilters('/report?year=2026&month=7')
    await waitFor(() => expect(result.current.isUrlReady).toBe(true))

    act(() => {
      result.current.applyFilters({
        contractDateFrom: new Date(2026, 6, 1),
        contractDateTo: new Date(2026, 6, 31),
        block: '5',
      })
    })

    await waitFor(() => expect(result.current.activeFilterCount).toBe(2))
    expect(result.current.params).toEqual({
      year: 2026,
      month: 7,
      contract_date_from: '2026-07-01',
      contract_date_to: '2026-07-31',
      block: 5,
    })
  })

  // "Clear → Xác nhận" must actually drop the params, not silently re-send them.
  it('applyFilters clears params omitted by the form', async () => {
    const { result } = renderFilters(
      '/report?year=2026&month=7&contract_date_from=2026-07-01&branch=3&block=5'
    )
    await waitFor(() => expect(result.current.isUrlReady).toBe(true))

    act(() => {
      result.current.applyFilters({})
    })

    await waitFor(() => expect(result.current.activeFilterCount).toBe(0))
    expect(result.current.params).toEqual({ year: 2026, month: 7 })
  })
})

describe('useTkkdReportFilters — Ngày làm phiếu TTGD (độc lập với Ngày ký HĐ cọc)', () => {
  it('forwards transaction_sheet_date_from/to from the URL to the API', async () => {
    const { result } = renderFilters(
      '/report?year=2026&month=7&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15'
    )

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.params).toEqual({
      year: 2026,
      month: 7,
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  // Regression: field mới không được đổi hành vi của "Ngày ký HĐ cọc" đã có sẵn.
  it('leaves contract_date_from/to untouched when only transaction-sheet date is set', async () => {
    const { result } = renderFilters(
      '/report?year=2026&month=7&contract_date_from=2026-07-01&contract_date_to=2026-07-31'
    )

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.params).toEqual({
      year: 2026,
      month: 7,
      contract_date_from: '2026-07-01',
      contract_date_to: '2026-07-31',
    })
    expect(result.current.params).not.toHaveProperty('transaction_sheet_date_from')
  })

  it('sends both date-range pairs together when both are set', async () => {
    const { result } = renderFilters(
      '/report?year=2026&month=7&contract_date_from=2026-07-01&contract_date_to=2026-07-31' +
        '&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15'
    )

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.params).toEqual({
      year: 2026,
      month: 7,
      contract_date_from: '2026-07-01',
      contract_date_to: '2026-07-31',
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  it('counts the transaction-sheet date range as its own active filter', async () => {
    const { result } = renderFilters(
      '/report?year=2026&month=7&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15'
    )

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.activeFilterCount).toBe(1)
  })

  it('counts the contract sign-date range and transaction-sheet date range separately when both are set', async () => {
    const { result } = renderFilters(
      '/report?year=2026&month=7&contract_date_from=2026-07-01&contract_date_to=2026-07-31' +
        '&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15'
    )

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.activeFilterCount).toBe(2)
  })

  it('hydrates the dialog with a Date object parsed from the URL', async () => {
    const { result } = renderFilters(
      '/report?year=2026&month=7&transaction_sheet_date_from=2026-08-01'
    )

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    const values = result.current.filterFormValues
    expect(values.transactionSheetDateFrom?.getFullYear()).toBe(2026)
    expect(values.transactionSheetDateFrom?.getMonth()).toBe(7)
    expect(values.transactionSheetDateFrom?.getDate()).toBe(1)
    expect(values.transactionSheetDateTo).toBeUndefined()
  })

  it('applyFilters writes both date ranges together and keeps the period', async () => {
    const { result } = renderFilters('/report?year=2026&month=7')
    await waitFor(() => expect(result.current.isUrlReady).toBe(true))

    act(() => {
      result.current.applyFilters({
        contractDateFrom: new Date(2026, 6, 1),
        contractDateTo: new Date(2026, 6, 31),
        transactionSheetDateFrom: new Date(2026, 7, 1),
        transactionSheetDateTo: new Date(2026, 7, 15),
      })
    })

    await waitFor(() => expect(result.current.activeFilterCount).toBe(2))
    expect(result.current.params).toEqual({
      year: 2026,
      month: 7,
      contract_date_from: '2026-07-01',
      contract_date_to: '2026-07-31',
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  // "Xoá bộ lọc → Xác nhận" must drop transaction_sheet_date_from/to too, not just the old fields.
  it('applyFilters clears transaction-sheet date params omitted by the form', async () => {
    const { result } = renderFilters(
      '/report?year=2026&month=7&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15'
    )
    await waitFor(() => expect(result.current.isUrlReady).toBe(true))

    act(() => {
      result.current.applyFilters({})
    })

    await waitFor(() => expect(result.current.activeFilterCount).toBe(0))
    expect(result.current.params).toEqual({ year: 2026, month: 7 })
  })
})
