import { useState } from 'react'
import { Flex, Text } from '@radix-ui/themes'

import { Button, TextArea } from '@/components/ui'

export interface FeeSupportWithdrawReasonDialogProps {
  /** Thu hồi phiếu + bỏ tick. Ném lỗi để giữ dialog (parent đóng khi thành công). */
  onConfirm: (reason: string) => Promise<void>
  /** Giữ nguyên — không bỏ tick. */
  onCancel: () => void
}

/**
 * Popup cảnh báo khi bỏ tick "đề xuất hỗ trợ phí" mà phiếu liên kết còn ở
 * nháp/chờ duyệt: bắt nhập lý do rồi thu hồi (withdraw) phiếu và bỏ tick.
 */
function FeeSupportWithdrawReasonDialog({
  onConfirm,
  onCancel,
}: FeeSupportWithdrawReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const trimmed = reason.trim()

  const handleConfirm = async () => {
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await onConfirm(trimmed)
      // Thành công: parent gọi displayClose() để đóng dialog.
    } catch {
      // Lỗi (vd BE từ chối thu hồi): giữ dialog để user thử lại.
      setSubmitting(false)
    }
  }

  return (
    <Flex direction="column" gap="4">
      <Text className="typo-body-base-regular text-content-dark-2">
        Phiếu hỗ trợ bán hàng liên kết sẽ bị hủy nếu bỏ tick. Vui lòng nhập lý do thu hồi:
      </Text>
      <TextArea
        label="Lý do thu hồi"
        required
        rows={3}
        value={reason}
        onChange={setReason}
        placeholder="Nhập lý do thu hồi phiếu hỗ trợ..."
        disabled={submitting}
      />
      <Flex gap="4" justify="end" align="center" className="flex-wrap">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
          className="min-w-[140px]"
        >
          Giữ nguyên
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={!trimmed || submitting}
          loading={submitting}
          className="min-w-[190px]"
        >
          Hủy phiếu và bỏ tick
        </Button>
      </Flex>
    </Flex>
  )
}

export default FeeSupportWithdrawReasonDialog
