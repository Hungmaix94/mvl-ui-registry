import { forwardRef, useImperativeHandle, useState } from 'react'
import { TextArea } from '@/components/ui'

export type PromotionDistributionVoidDialogContentRef = {
  getData: () => { reason: string } | null
}

const PromotionDistributionVoidDialogContent =
  forwardRef<PromotionDistributionVoidDialogContentRef>((_props, ref) => {
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
          placeholder="Nhập lý do vô hiệu hoá phiếu"
          value={reason}
          onChange={setReason}
          className="w-full"
          rows={4}
          error={error}
          required
        />
      </div>
    )
  })

PromotionDistributionVoidDialogContent.displayName = 'PromotionDistributionVoidDialogContent'

export default PromotionDistributionVoidDialogContent
