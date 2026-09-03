import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CompensatoryDateInputSession } from '@/api/schema'
import type { TimeSheetEntryDetail } from '@/features/attendance/services/timesheet-service'

// TimePicker drives its value through an internal popover UI; swap it for a plain input so tests
// can set start/end time directly without simulating the popover interaction.
vi.mock('@/components/ui/time-picker/TimePicker', () => ({
  default: ({ label, value, onChange }: any) => (
    <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

import { TimesheetEntryEditDialogContent } from './TimesheetEntryEditDialog'

const baseEntry = {
  id: 1,
  date: '2026-08-01',
  start_time: '2026-08-01T08:00:00+07:00',
  end_time: '2026-08-01T17:30:00+07:00',
  has_leave_attendance_conflict: false,
} as unknown as TimeSheetEntryDetail

describe('TimesheetEntryEditDialogContent — leave_session / half-day options (86ey797hw)', () => {
  const setup = (entry: TimeSheetEntryDetail) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TimesheetEntryEditDialogContent entry={entry} onSubmit={onSubmit} />)
    return { onSubmit }
  }

  it('hides "Nghỉ ca sáng"/"Nghỉ ca chiều" when the entry has no leave/attendance conflict', () => {
    setup(baseEntry)

    expect(screen.getByLabelText('Đi làm cả ngày')).toBeTruthy()
    expect(screen.getByLabelText('Nghỉ cả ngày')).toBeTruthy()
    expect(screen.queryByLabelText('Nghỉ ca sáng')).toBeNull()
    expect(screen.queryByLabelText('Nghỉ ca chiều')).toBeNull()
  })

  it('shows all 4 states when the entry has a leave/attendance conflict', () => {
    setup({ ...baseEntry, has_leave_attendance_conflict: true })

    expect(screen.getByLabelText('Đi làm cả ngày')).toBeTruthy()
    expect(screen.getByLabelText('Nghỉ cả ngày')).toBeTruthy()
    expect(screen.getByLabelText('Nghỉ ca sáng')).toBeTruthy()
    expect(screen.getByLabelText('Nghỉ ca chiều')).toBeTruthy()
  })

  it('sends leave_session=morning for "Nghỉ ca sáng" on a conflicted entry', async () => {
    const { onSubmit } = setup({ ...baseEntry, has_leave_attendance_conflict: true })

    fireEvent.click(screen.getByLabelText('Nghỉ ca sáng'))
    fireEvent.change(screen.getByLabelText('Giờ vào'), { target: { value: '13:15' } })
    fireEvent.change(screen.getByLabelText('Giờ ra'), { target: { value: '17:30' } })

    await (window as any).__timesheetEditDialogSubmit()

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ leave_session: CompensatoryDateInputSession.morning })
    )
  })

  it('sends leave_session=afternoon for "Nghỉ ca chiều" on a conflicted entry', async () => {
    const { onSubmit } = setup({ ...baseEntry, has_leave_attendance_conflict: true })

    fireEvent.click(screen.getByLabelText('Nghỉ ca chiều'))
    fireEvent.change(screen.getByLabelText('Giờ vào'), { target: { value: '08:00' } })
    fireEvent.change(screen.getByLabelText('Giờ ra'), { target: { value: '12:00' } })

    await (window as any).__timesheetEditDialogSubmit()

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ leave_session: CompensatoryDateInputSession.afternoon })
    )
  })

  it('does not send leave_session for "Đi làm cả ngày"', async () => {
    const { onSubmit } = setup(baseEntry)

    fireEvent.change(screen.getByLabelText('Giờ vào'), { target: { value: '08:00' } })
    fireEvent.change(screen.getByLabelText('Giờ ra'), { target: { value: '17:30' } })

    await (window as any).__timesheetEditDialogSubmit()

    const payload = onSubmit.mock.calls[0][0]
    expect(payload.leave_session).toBeUndefined()
  })
})
