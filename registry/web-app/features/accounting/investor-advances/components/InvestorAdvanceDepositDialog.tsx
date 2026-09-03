import { useState } from 'react'
import AppDialog from '@/components/dialog/AppDialog'
import { CurrencyInput, TextField } from '@/components/ui'
import { useDepositInvestorAdvance } from '../services/investor-advance-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: number
  investorName: string
  projectName: string
  onSuccess: () => void
}

export default function InvestorAdvanceDepositDialog({
  open,
  onOpenChange,
  accountId,
  investorName,
  projectName,
  onSuccess,
}: Props) {
  const [amount, setAmount] = useState<number | undefined>(undefined)
  const [note, setNote] = useState('')

  const depositMutation = useDepositInvestorAdvance()

  const handleConfirm = async () => {
    if (!amount || amount <= 0) {
      toastService.error('Vui lòng nhập số tiền nạp hợp lệ')
      return
    }

    try {
      await depositMutation.mutateAsync({
        id: accountId,
        data: {
          amount: amount.toString(),
          note: note || undefined,
        },
      })
      toastService.success('Đã nạp quỹ thành công')
      onSuccess()
      onOpenChange(false)
      setAmount(undefined)
      setNote('')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nạp quỹ tạm ứng CĐT"
      variant="custom"
      isHideCancelButton={false}
      onCancel={() => onOpenChange(false)}
      onConfirm={handleConfirm}
      confirmText="Xác nhận nạp"
      loading={depositMutation.isPending}
      content={
        <div className="flex min-w-[480px] flex-col gap-4 py-4">
          <div className="bg-background-2 flex flex-col gap-1 rounded-lg p-3 text-sm">
            <div>
              <span className="text-content-dark-3">Chủ đầu tư:</span>{' '}
              <span className="text-content-dark-1 font-semibold">{investorName}</span>
            </div>
            <div>
              <span className="text-content-dark-3">Dự án:</span>{' '}
              <span className="text-content-dark-1 font-semibold">{projectName}</span>
            </div>
          </div>

          <CurrencyInput
            label="Số tiền nạp (VNĐ)"
            placeholder="Nhập số tiền"
            value={amount}
            onChange={(val) => setAmount(val)}
            suffix="VNĐ"
            required
          />

          <TextField
            label="Ghi chú"
            placeholder="Nhập ghi chú"
            value={note}
            onChange={(val) => setNote(val)}
          />
        </div>
      }
    />
  )
}
