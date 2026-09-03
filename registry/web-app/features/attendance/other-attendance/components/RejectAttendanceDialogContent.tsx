import { useState, useImperativeHandle, forwardRef } from 'react'
import { TextArea } from '@/components/ui'

export type RejectAttendanceDialogContentRef = {
  getData: () => {
    note: string
  } | null
}

type RejectAttendanceDialogContentProps = {
  attendanceRecord?: { id: number }
}

const RejectAttendanceDialogContent = forwardRef<
  RejectAttendanceDialogContentRef,
  RejectAttendanceDialogContentProps
>((_props, ref) => {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()

  useImperativeHandle(ref, () => ({
    getData: () => {
      if (!note.trim()) {
        setError('Vui lòng nhập ghi chú')
        return null
      }

      setError(undefined)
      return {
        note: note.trim(),
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
        error={error}
        required
      />
    </div>
  )
})

RejectAttendanceDialogContent.displayName = 'RejectAttendanceDialogContent'

export default RejectAttendanceDialogContent
