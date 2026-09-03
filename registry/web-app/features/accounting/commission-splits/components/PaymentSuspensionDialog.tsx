import { useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button, TextArea } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useCreatePaymentSuspension } from '../services/deal-payment-suspensions-service'
import toastService from '@/services/toast-service'

type Props = {
  dealId: number
  dealCode: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const PaymentSuspensionDialog = ({
  dealId,
  dealCode,
  isOpen,
  onClose,
  onSuccess,
}: Props) => {
  const [reason, setReason] = useState('')
  const { mutateAsync: createSuspension, isPending } = useCreatePaymentSuspension()

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setReason('')
        onClose()
      }
    },
    [onClose]
  )

  const handleSubmit = async () => {
    try {
      await createSuspension({ deal_id: dealId, reason })
      toastService.success('Đã tạm ngưng chi trả thành công')
      setReason('')
      if (onSuccess) onSuccess()
      onClose()
    } catch (error: any) {
      toastService.error(error?.message || 'Có lỗi xảy ra khi tạm ngưng chi trả')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'z-50 flex flex-col',
          'w-full max-w-md',
          'bg-content-light-1 border-border-1 border shadow-lg sm:rounded-lg'
        )}
      >
        <DialogHeader className={cn('border-border-1 border-b-[1px] px-6 pt-4 pb-[16px]')}>
          <DialogTitle className={cn('typo-h6 text-content-dark-1')}>Tạm ngưng chi trả</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 p-6">
          <div className="mb-2 text-sm text-neutral-600">
            Vui lòng nhập lý do tạm ngưng chi trả cho giao dịch <strong>{dealCode}</strong>.
          </div>
          <TextArea
            placeholder="Nhập lý do tạm ngưng..."
            value={reason}
            onChange={(val) => setReason(val)}
            disabled={isPending}
            rows={3}
          />
        </div>

        <DialogFooter
          className={cn('border-border-1 flex-row justify-end gap-3 border-t-[1px] px-6 py-4')}
        >
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button
            variant="primary"
            className="bg-action-primary-red-default"
            onClick={handleSubmit}
            loading={isPending}
          >
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
