import { forwardRef, useImperativeHandle, useState } from 'react'
import { TextArea } from '@/components/ui'

export type DirectorCommissionVoidDialogContentRef = {
  getData: () => { reason: string } | null
}

const DirectorCommissionVoidDialogContent = forwardRef<DirectorCommissionVoidDialogContentRef>(
  (_props, ref) => {
    const [reason, setReason] = useState('')
    const [error, setError] = useState<string | undefined>()

    useImperativeHandle(ref, () => ({
      getData: () => {
        if (!reason.trim()) {
          setError('Vui lòng nhập lý do vô hiệu hoá')
          return null
        }
        setError(undefined)
        return { reason: reason.trim() }
      },
    }))

    return (
      <div className="flex w-full flex-col items-start justify-center gap-5 overflow-clip">
        <TextArea
          label="Lý do vô hiệu hoá"
          placeholder="Nhập lý do vô hiệu hoá kỳ hoa hồng"
          value={reason}
          onChange={setReason}
          className="w-full"
          rows={4}
          error={error}
          required
        />
      </div>
    )
  }
)

DirectorCommissionVoidDialogContent.displayName = 'DirectorCommissionVoidDialogContent'

export default DirectorCommissionVoidDialogContent
