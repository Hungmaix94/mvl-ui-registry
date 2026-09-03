import { useState, useImperativeHandle, forwardRef } from 'react'
import { TextArea } from '@/components/ui'
import type { AttendanceRecord } from '@/features/attendance/services/attendance-record-service'

export type ApproveAttendanceDialogContentRef = {
  getData: () => {
    note?: string | null
  } | null
}

type ApproveAttendanceDialogContentProps = {
  attendanceRecord: AttendanceRecord
}

const ApproveAttendanceDialogContent = forwardRef<
  ApproveAttendanceDialogContentRef,
  ApproveAttendanceDialogContentProps
>(({ attendanceRecord: _attendanceRecord }, ref) => {
  const [note, setNote] = useState('')

  useImperativeHandle(ref, () => ({
    getData: () => {
      return {
        note: note.trim() || null,
      }
    },
  }))

  return (
    <div className="flex w-full flex-col items-start justify-center gap-5 overflow-clip">
      <TextArea
        label="Ghi chú"
        placeholder="Nhập ghi chú"
        value={note}
        onChange={setNote}
        className="w-full"
        rows={4}
      />
    </div>
  )
})

ApproveAttendanceDialogContent.displayName = 'ApproveAttendanceDialogContent'

export default ApproveAttendanceDialogContent
