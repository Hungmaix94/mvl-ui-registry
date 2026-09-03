import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TkkdReportFiltersController } from '@/features/sales/tkkd-reports/hooks/useTkkdReportFilters'

const h = vi.hoisted(() => ({
  periodSelectProps: [] as Array<Record<string, any>>,
  datePickerProps: [] as Array<Record<string, any>>,
}))

vi.mock('@/features/accounting/accounting-periods/components/AccountingPeriodSelect', () => ({
  default: (props: Record<string, any>) => {
    h.periodSelectProps.push(props)
    return <div data-testid="accounting-period-select" />
  },
}))

// Stub the calendar popover but keep WeekSelect itself real — its Monday snapping and the
// absence of a `caption` are exactly what this suite guards.
vi.mock('@/components/ui/calendar/date-single-picker/date-picker', () => ({
  DatePicker: (props: Record<string, any>) => {
    h.datePickerProps.push(props)
    return <div data-testid="week-picker" />
  },
}))

import TkkdReportPeriodSelector from './TkkdReportPeriodSelector'

const PERIODS = [
  { id: 12, year: 2026, month: 7 },
  { id: 13, year: 2026, month: 8 },
]

/**
 * The component reads five fields off the hook's return value; the rest of the controller is
 * irrelevant here, so build just those and cast rather than stand up the whole hook.
 */
function makeFilters(overrides: Record<string, unknown> = {}) {
  return {
    periodType: 'month',
    week: null,
    periods: PERIODS,
    activePeriodId: 12,
    patch: vi.fn(),
    ...overrides,
  } as unknown as TkkdReportFiltersController & { patch: ReturnType<typeof vi.fn> }
}

const latestDatePicker = () => h.datePickerProps[h.datePickerProps.length - 1]

beforeEach(() => {
  h.periodSelectProps.length = 0
  h.datePickerProps.length = 0
})

describe('TkkdReportPeriodSelector — chế độ Tháng', () => {
  it('shows the accounting-period select seeded with the active period', () => {
    const filters = makeFilters()
    render(<TkkdReportPeriodSelector filters={filters} />)

    expect(screen.getByTestId('accounting-period-select')).toBeInTheDocument()
    expect(screen.queryByTestId('week-picker')).not.toBeInTheDocument()
    expect(h.periodSelectProps[0]).toMatchObject({ periods: PERIODS, selectedPeriodId: 12 })
  })

  it('patches year+month together when another period is picked', () => {
    const filters = makeFilters()
    render(<TkkdReportPeriodSelector filters={filters} />)

    h.periodSelectProps[0].onSelect(13)

    expect(filters.patch).toHaveBeenCalledWith({ year: 2026, month: 8 })
  })

  it('ignores a period id that is not in the list instead of patching undefined', () => {
    const filters = makeFilters()
    render(<TkkdReportPeriodSelector filters={filters} />)

    h.periodSelectProps[0].onSelect(999)

    expect(filters.patch).not.toHaveBeenCalled()
  })

  it('switches to week mode via the Tuần button', async () => {
    const filters = makeFilters()
    render(<TkkdReportPeriodSelector filters={filters} />)

    await userEvent.click(screen.getByRole('button', { name: 'Tuần' }))

    expect(filters.patch).toHaveBeenCalledWith({ period_type: 'week' })
  })
})

describe('TkkdReportPeriodSelector — chế độ Tuần', () => {
  it('renders the Mon–Sun range itself instead of as a picker caption', () => {
    // Regression guard: a `caption` puts the range on a SECOND line inside the picker, which
    // grows the toolbar row in week mode only and shoves the picker above the Tháng/Tuần pair.
    const filters = makeFilters({ periodType: 'week', week: '2026-07-27' })
    render(<TkkdReportPeriodSelector filters={filters} />)

    expect(latestDatePicker().caption).toBeUndefined()
    expect(screen.getByText('27/07/2026 - 02/08/2026')).toBeInTheDocument()
  })

  it('omits the range label until a week is chosen', () => {
    const filters = makeFilters({ periodType: 'week', week: null })
    render(<TkkdReportPeriodSelector filters={filters} />)

    expect(screen.getByTestId('week-picker')).toBeInTheDocument()
    expect(screen.queryByText(/\d{2}\/\d{2}\/\d{4} - \d{2}\/\d{2}\/\d{4}/)).not.toBeInTheDocument()
  })

  it('snaps any picked day back to its Monday before patching', () => {
    const filters = makeFilters({ periodType: 'week', week: '2026-07-27' })
    render(<TkkdReportPeriodSelector filters={filters} />)

    // Wednesday of that same week.
    latestDatePicker().onChange('2026-07-29')

    expect(filters.patch).toHaveBeenCalledWith({ week: '2026-07-27' })
  })

  it('clears the week param when the picker emits nothing', () => {
    const filters = makeFilters({ periodType: 'week', week: '2026-07-27' })
    render(<TkkdReportPeriodSelector filters={filters} />)

    latestDatePicker().onChange(null)

    expect(filters.patch).toHaveBeenCalledWith({ week: null })
  })

  it('switches back to month mode by dropping period_type rather than setting "month"', async () => {
    // `month` is the default, so the URL stays clean when the user goes back.
    const filters = makeFilters({ periodType: 'week', week: '2026-07-27' })
    render(<TkkdReportPeriodSelector filters={filters} />)

    await userEvent.click(screen.getByRole('button', { name: 'Tháng' }))

    expect(filters.patch).toHaveBeenCalledWith({ period_type: null })
  })
})
