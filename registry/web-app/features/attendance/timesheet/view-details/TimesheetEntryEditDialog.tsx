import { useState } from 'react'
import { TextArea } from '@/components/ui/text-area/TextArea'
import TimePicker from '@/components/ui/time-picker/TimePicker'
import { RadioGroup } from '@/components/ui/radio-group'
import { format, parseISO } from 'date-fns'
import {
  type TimeSheetEntryDetail,
  type TimeSheetEntryUpdateRequest,
} from '@/features/attendance/services/timesheet-service'
import { CompensatoryDateInputSession } from '@/api/schema'

type AttendanceState = 'full_work' | 'full_absent' | 'morning_absent' | 'afternoon_absent'

const BASE_STATE_OPTIONS: { value: AttendanceState; label: string }[] = [
  { value: 'full_work', label: 'Đi làm cả ngày' },
  { value: 'full_absent', label: 'Nghỉ cả ngày' },
]

// "Nghỉ ca sáng"/"Nghỉ ca chiều" only resolve a real leave-vs-attendance conflict (leave_session,
// validated against the WorkSchedule window) — without a conflict they carry no leave proposal to
// resolve and behave exactly like "Đi làm cả ngày" with a partial window, so they're hidden (86ey797hw).
const CONFLICT_STATE_OPTIONS: { value: AttendanceState; label: string }[] = [
  { value: 'morning_absent', label: 'Nghỉ ca sáng' },
  { value: 'afternoon_absent', label: 'Nghỉ ca chiều' },
]

type TimesheetEntryEditDialogContentProps = {
  entry: TimeSheetEntryDetail
  onSubmit: (data: TimeSheetEntryUpdateRequest) => Promise<void>
}

export const TimesheetEntryEditDialogContent = ({
  entry,
  onSubmit,
}: TimesheetEntryEditDialogContentProps) => {
  const initialStartTime = entry.start_time ? format(parseISO(entry.start_time), 'HH:mm') : ''
  const initialEndTime = entry.end_time ? format(parseISO(entry.end_time), 'HH:mm') : ''
  const initialState: AttendanceState =
    !entry.start_time && !entry.end_time ? 'full_absent' : 'full_work'
  const stateOptions = entry.has_leave_attendance_conflict
    ? [...BASE_STATE_OPTIONS, ...CONFLICT_STATE_OPTIONS]
    : BASE_STATE_OPTIONS

  const [attendanceState, setAttendanceState] = useState<AttendanceState>(initialState)
  const [startTime, setStartTime] = useState<string>(initialStartTime)
  const [endTime, setEndTime] = useState<string>(initialEndTime)
  const [note, setNote] = useState<string>('')
  const [startTimeError, setStartTimeError] = useState<string>('')
  const [endTimeError, setEndTimeError] = useState<string>('')

  const showTimePickers = attendanceState !== 'full_absent'

  const handleSubmit = async () => {
    let hasError = false

    if (showTimePickers) {
      if (!startTime.trim()) {
        setStartTimeError('Giờ vào là bắt buộc')
        hasError = true
      } else {
        setStartTimeError('')
      }
      if (!endTime.trim()) {
        setEndTimeError('Giờ ra là bắt buộc')
        hasError = true
      } else {
        setEndTimeError('')
      }
    }

    if (hasError) throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc')

    if (attendanceState === 'full_absent') {
      await onSubmit({
        start_time: null,
        end_time: null,
        note: note.trim() || null,
      })
      return
    }

    const date = entry.date
    const [startHour, startMinute] = startTime.split(':')
    const [endHour, endMinute] = endTime.split(':')
    const startDateTime = `${date}T${startHour.padStart(2, '0')}:${startMinute.padStart(2, '0')}:00`
    const endDateTime = `${date}T${endHour.padStart(2, '0')}:${endMinute.padStart(2, '0')}:00`

    // leave_session resolves a leave-vs-attendance conflict; morning_absent/afternoon_absent are
    // only offered (see stateOptions above) when the entry has one, so this is never reached
    // otherwise.
    let leaveSession: CompensatoryDateInputSession | null = null
    if (attendanceState === 'morning_absent') leaveSession = CompensatoryDateInputSession.morning
    else if (attendanceState === 'afternoon_absent')
      leaveSession = CompensatoryDateInputSession.afternoon

    await onSubmit({
      start_time: startDateTime,
      end_time: endDateTime,
      note: note.trim() || null,
      ...(leaveSession !== null ? { leave_session: leaveSession } : {}),
    })
  }

  if (typeof window !== 'undefined') {
    ;(window as any).__timesheetEditDialogSubmit = handleSubmit
  }

  return (
    <div className="flex flex-col gap-4">
      <RadioGroup
        id="attendance-state"
        label="Trạng thái"
        required
        disabled={false}
        options={stateOptions}
        value={attendanceState}
        onChange={(val) => {
          setAttendanceState(val as AttendanceState)
          setStartTimeError('')
          setEndTimeError('')
        }}
        className="flex-col gap-2"
      />
      {showTimePickers && (
        <>
          <TimePicker
            label="Giờ vào"
            required
            value={startTime}
            onChange={(value) => {
              setStartTime(value)
              if (startTimeError && value.trim()) setStartTimeError('')
            }}
            placeholder="HH:mm"
            contentClassName="w-full"
            error={startTimeError}
          />
          <TimePicker
            label="Giờ ra"
            required
            value={endTime}
            onChange={(value) => {
              setEndTime(value)
              if (endTimeError && value.trim()) setEndTimeError('')
            }}
            placeholder="HH:mm"
            contentClassName="w-full"
            error={endTimeError}
          />
        </>
      )}
      <TextArea
        label="Ghi chú"
        placeholder="Nhập ghi chú về lý do thay đổi..."
        value={note}
        onChange={(value) => setNote(value)}
        rows={4}
      />
    </div>
  )
}
