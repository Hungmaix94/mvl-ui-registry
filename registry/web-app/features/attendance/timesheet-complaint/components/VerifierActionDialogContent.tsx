import { forwardRef, useImperativeHandle, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { TextArea } from '@/components/ui'

type VerifierActionDialogContentProps = {
  isReject: boolean
}

export type VerifierActionDialogContentRef = {
  getData: () => { note: string } | null
}

const VerifierActionDialogContent = forwardRef<
  VerifierActionDialogContentRef,
  VerifierActionDialogContentProps
>(({ isReject }, ref) => {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()

  useImperativeHandle(ref, () => ({
    getData: () => {
      // For reject, note is required
      if (isReject && !note.trim()) {
        setError('Ghi chú là bắt buộc khi từ chối')
        return null
      }

      setError(undefined)
      return {
        note: note.trim(),
      }
    },
  }))

  return (
    <Flex direction="column" gap="4">
      <TextArea
        label="Ghi chú"
        placeholder="Nhập ghi chú"
        value={note}
        onChange={setNote}
        className="w-full"
        rows={4}
        error={error}
        required={isReject}
      />
    </Flex>
  )
})

VerifierActionDialogContent.displayName = 'VerifierActionDialogContent'

export default VerifierActionDialogContent
