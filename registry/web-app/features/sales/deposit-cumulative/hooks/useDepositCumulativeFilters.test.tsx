import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useDepositCumulativeFilters } from './useDepositCumulativeFilters'

vi.mock('@/features/accounting/accounting-periods/services/accounting-period-service', () => ({
  useAllAccountingPeriods: () => ({ data: [{ id: 12, year: 2026, month: 7 }] }),
  useCurrentAccountingPeriod: () => ({ data: { id: 12, year: 2026, month: 7 }, isLoading: false }),
}))

function renderFilters(initialUrl: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  )
  return renderHook(() => useDepositCumulativeFilters(), { wrapper })
}

describe('useDepositCumulativeFilters', () => {
  it('seeds the current accounting period so the report queries right away', async () => {
    const { result } = renderFilters('/report')

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.params).toEqual({ year: 2026, month: 7 })
  })
})

// The org filters now live in a filter dialog (PageTitle `handleFilter` +
// `AppDialog variant="filter"`) instead of an apply-on-change filter bar.
describe('useDepositCumulativeFilters — filter dialog contract', () => {
  it('counts one active filter per org level', async () => {
    const { result } = renderFilters('/report?year=2026&month=7&branch=3&block=5')

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.activeFilterCount).toBe(2)
  })

  it('reports no active filter when only the period is set', async () => {
    const { result } = renderFilters('/report?year=2026&month=7')

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.activeFilterCount).toBe(0)
  })

  it('hydrates the dialog with the org ids from the URL as strings', async () => {
    const { result } = renderFilters('/report?year=2026&month=7&branch=3')

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.filterFormValues).toEqual({
      branch: '3',
      block: undefined,
      department: undefined,
      transactionSheetDateRange: null,
    })
  })

  it('applyFilters writes the whole set at once and keeps the period', async () => {
    const { result } = renderFilters('/report?year=2026&month=7')
    await waitFor(() => expect(result.current.isUrlReady).toBe(true))

    act(() => {
      result.current.applyFilters({ branch: '3', department: '9' })
    })

    await waitFor(() => expect(result.current.activeFilterCount).toBe(2))
    expect(result.current.params).toEqual({ year: 2026, month: 7, branch: 3, department: 9 })
  })

  // "Clear → Xác nhận" must actually drop the params, not silently re-send them.
  it('applyFilters clears params omitted by the form', async () => {
    const { result } = renderFilters('/report?year=2026&month=7&branch=3&block=5&department=9')
    await waitFor(() => expect(result.current.isUrlReady).toBe(true))

    act(() => {
      result.current.applyFilters({})
    })

    await waitFor(() => expect(result.current.activeFilterCount).toBe(0))
    expect(result.current.params).toEqual({ year: 2026, month: 7 })
  })
})

describe('useDepositCumulativeFilters — Ngày làm phiếu TTGD (độc lập với tổ chức)', () => {
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

  // Regression: field mới không được đổi hành vi của bộ lọc tổ chức đã có sẵn.
  it('leaves org-chart params untouched when only transaction-sheet date is set', async () => {
    const { result } = renderFilters('/report?year=2026&month=7&branch=3')

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.params).toEqual({ year: 2026, month: 7, branch: 3 })
    expect(result.current.params).not.toHaveProperty('transaction_sheet_date_from')
  })

  it('sends org-chart + transaction-sheet date params together when both are set', async () => {
    const { result } = renderFilters(
      '/report?year=2026&month=7&branch=3' +
        '&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15'
    )

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.params).toEqual({
      year: 2026,
      month: 7,
      branch: 3,
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

  it('counts org level and transaction-sheet date range separately when both are set', async () => {
    const { result } = renderFilters(
      '/report?year=2026&month=7&branch=3' +
        '&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15'
    )

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    expect(result.current.activeFilterCount).toBe(2)
  })

  it('hydrates the dialog with a DateRange parsed from the URL', async () => {
    const { result } = renderFilters(
      '/report?year=2026&month=7&transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-15'
    )

    await waitFor(() => expect(result.current.isUrlReady).toBe(true))
    const range = result.current.filterFormValues.transactionSheetDateRange
    expect(range?.from).toEqual(new Date(2026, 7, 1))
    expect(range?.to).toEqual(new Date(2026, 7, 15))
  })

  it('applyFilters writes both org and transaction-sheet date params together', async () => {
    const { result } = renderFilters('/report?year=2026&month=7')
    await waitFor(() => expect(result.current.isUrlReady).toBe(true))

    act(() => {
      result.current.applyFilters({
        branch: '3',
        transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
      })
    })

    await waitFor(() => expect(result.current.activeFilterCount).toBe(2))
    expect(result.current.params).toEqual({
      year: 2026,
      month: 7,
      branch: 3,
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

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
