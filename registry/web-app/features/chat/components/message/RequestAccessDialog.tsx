import { useState } from 'react'
import AppDialog from '@/components/dialog/AppDialog'
import { TextArea } from '@/components/ui'
import { useRequestAccess } from '@/services/elibrary-service'
import toastService from '@/services/toast-service'

interface RequestAccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId: number | null
  itemName: string
  ownerName: string
  onSuccess?: () => void
}

export default function RequestAccessDialog({
  open,
  onOpenChange,
  itemId,
  itemName,
  ownerName,
  onSuccess,
}: RequestAccessDialogProps) {
  const [message, setMessage] = useState('')
  const { mutateAsync: requestAccess, isPending } = useRequestAccess()

  const handleConfirm = async () => {
    if (!itemId) return

    try {
      await requestAccess({ id: itemId, message: message.trim() || undefined })
      toastService.success('Đã gửi yêu cầu, đợi chủ sở hữu phản hồi')
      onOpenChange(false)
      setMessage('')
      onSuccess?.()
    } catch (e: any) {
      const errMsg = e?.message || e?.error?.message || 'Lỗi khi gửi yêu cầu truy cập'
      toastService.error(errMsg)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setMessage('')
  }

  return (
    <AppDialog
      variant="custom"
      open={open}
      onOpenChange={onOpenChange}
      title="Yêu cầu truy cập tài liệu"
      confirmText="Gửi yêu cầu"
      cancelText="Huỷ"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      loading={isPending}
      isHideCancelButton={false}
      dialogContentClassName="sm:max-w-[480px]"
      content={
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-1.5 rounded-lg bg-neutral-20 p-3 text-sm text-content-dark-2">
            <div>
              <span className="font-semibold text-content-dark-1">Tài liệu:</span> {itemName}
            </div>
            <div>
              <span className="font-semibold text-content-dark-1">Chủ sở hữu:</span> {ownerName}
            </div>
          </div>
          <p className="text-xs text-content-dark-3 italic">
            Bạn không có quyền truy cập tài liệu này. Vui lòng gửi yêu cầu tới chủ sở hữu để được chia sẻ quyền xem/tải.
          </p>
          <TextArea
            label="Lời nhắn (tùy chọn)"
            placeholder="Nhập lời nhắn gửi đến chủ sở hữu..."
            value={message}
            onChange={setMessage}
            className="w-full"
            rows={3}
          />
        </div>
      }
    />
  )
}
