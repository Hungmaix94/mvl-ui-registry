import { useState, useImperativeHandle, forwardRef } from 'react'
import { TextArea } from '@/components/ui'

export type CancelPaymentVoucherDialogContentRef = {
  getData: () => { cancel_reason: string } | null
}

const CancelPaymentVoucherDialogContent = forwardRef<CancelPaymentVoucherDialogContentRef>(
  (_props, ref) => {
    const [reason, setReason] = useState('')
    const [error, setError] = useState<string | undefined>()

    useImperativeHandle(ref, () => ({
      getData: () => {
        if (!reason.trim()) {
          setError('Vui lòng nhập lý do hủy')
          return null
        }
        setError(undefined)
        return { cancel_reason: reason.trim() }
      },
    }))

    return (
      <div className="flex w-full flex-col items-start justify-center gap-5 overflow-clip">
        <TextArea
          label="Lý do hủy"
          placeholder="Nhập lý do hủy phiếu chi"
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

CancelPaymentVoucherDialogContent.displayName = 'CancelPaymentVoucherDialogContent'

export default CancelPaymentVoucherDialogContent
