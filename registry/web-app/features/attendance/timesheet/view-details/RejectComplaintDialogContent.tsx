import { useState, useImperativeHandle, forwardRef } from 'react'
import { TextArea } from '@/components/ui'

export type RejectComplaintDialogContentRef = {
  getData: () => {
    note: string
  } | null
}

type RejectComplaintDialogContentProps = {
  complaint?: { id: number }
}

const RejectComplaintDialogContent = forwardRef<
  RejectComplaintDialogContentRef,
  RejectComplaintDialogContentProps
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

RejectComplaintDialogContent.displayName = 'RejectComplaintDialogContent'

export default RejectComplaintDialogContent
