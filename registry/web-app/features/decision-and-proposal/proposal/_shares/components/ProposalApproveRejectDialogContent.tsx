import { useState, useImperativeHandle, forwardRef } from 'react'
import { TextArea } from '@/components/ui'

export type ProposalApproveRejectDialogContentRef = {
  getData: () => {
    note: string | null
  } | null
}

type ProposalApproveRejectDialogContentProps = {
  type: 'approve' | 'reject'
}

const ProposalApproveRejectDialogContent = forwardRef<
  ProposalApproveRejectDialogContentRef,
  ProposalApproveRejectDialogContentProps
>(({ type }, ref) => {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()

  const isReject = type === 'reject'
  const isRequired = isReject

  useImperativeHandle(ref, () => ({
    getData: () => {
      if (isRequired && !note.trim()) {
        setError('Vui lòng nhập ghi chú')
        return null
      }

      setError(undefined)
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
        error={error}
        required={isRequired}
      />
    </div>
  )
})

ProposalApproveRejectDialogContent.displayName = 'ProposalApproveRejectDialogContent'

export default ProposalApproveRejectDialogContent
