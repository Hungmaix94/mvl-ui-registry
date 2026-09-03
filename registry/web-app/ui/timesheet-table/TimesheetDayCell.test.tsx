import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TimesheetDayCell from './TimesheetDayCell'
import type { TimesheetEntry } from '@/services'
import { DailyTimesheetEntryMorning_absent_reason } from '@/api/schema'

// useAppConstant pulls in the '@/store' barrel (auth-store + co.), which has a pre-existing
// circular import back to route constants unrelated to this component — stub it out since
// these tests only exercise the leave-reason label branches, not status/day-type text lookup.
vi.mock('../../hooks/useAppConstant', () => ({
  default: () => ({ keysMap: new Map() }),
}))

function makeEntry(overrides: Partial<TimesheetEntry>): TimesheetEntry {
  return {
    id: 1,
    date: '2026-07-13', // Monday
    colored_status: null,
    start_time: null,
    end_time: null,
    working_days: '1.00',
    has_complaint: false,
    day_type: 'official',
    is_holiday: false,
    payroll_status: '',
    count_for_payroll: true,
    morning_absent_reason_label: '',
    afternoon_absent_reason_label: '',
    morning_absent_reason: null,
    afternoon_absent_reason: null,
    has_leave_attendance_conflict: false,
    ...overrides,
  } as TimesheetEntry
}

describe('TimesheetDayCell', () => {
  it('shows "Nghỉ CĐ" for a full-day approved statutory leave (weekday, no attendance)', () => {
    const entry = makeEntry({
      morning_absent_reason: DailyTimesheetEntryMorning_absent_reason.statutory_paid_leave,
      afternoon_absent_reason: DailyTimesheetEntryMorning_absent_reason.statutory_paid_leave,
    })
    render(<TimesheetDayCell entry={entry} />)
    expect(screen.getByText('Nghỉ CĐ')).toBeInTheDocument()
  })

  it('shows "Nghỉ CĐ" for a half-day approved statutory leave on Saturday', () => {
    const entry = makeEntry({
      date: '2026-07-11', // Saturday, half-day schedule
      morning_absent_reason: DailyTimesheetEntryMorning_absent_reason.statutory_paid_leave,
      afternoon_absent_reason: null,
    })
    render(<TimesheetDayCell entry={entry} />)
    expect(screen.getByText('Nghỉ CĐ')).toBeInTheDocument()
  })

  it('still shows "Nghỉ phép" for a full-day approved paid leave (regression)', () => {
    const entry = makeEntry({
      morning_absent_reason: DailyTimesheetEntryMorning_absent_reason.paid_leave,
      afternoon_absent_reason: DailyTimesheetEntryMorning_absent_reason.paid_leave,
    })
    render(<TimesheetDayCell entry={entry} />)
    expect(screen.getByText('Nghỉ phép')).toBeInTheDocument()
  })

  it('does not show "Nghỉ CĐ" when there is no statutory leave reason', () => {
    const entry = makeEntry({})
    render(<TimesheetDayCell entry={entry} />)
    expect(screen.queryByText('Nghỉ CĐ')).not.toBeInTheDocument()
  })
})
