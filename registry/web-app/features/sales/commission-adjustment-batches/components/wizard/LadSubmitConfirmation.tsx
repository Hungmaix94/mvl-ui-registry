import { Flex } from '@radix-ui/themes'
import { Button, Text } from '@/components/ui'

export interface LadSubmitConfirmationProps {
  code?: string
  onOpenBatch: () => void
  onExitToList: () => void
}

/**
 * Màn xác nhận sau khi creator gửi duyệt (submit → pending).
 */
export function LadSubmitConfirmation({
  code,
  onOpenBatch,
  onExitToList,
}: LadSubmitConfirmationProps) {
  return (
    <Flex direction="column" align="center" gap="4" className="py-16 text-center">
      <span className="text-5xl">📤</span>
      <Text className="typo-heading-h4 text-content-dark-1 font-semibold">
        Đã gửi duyệt
        {code ? ` — ${code}` : ''}
      </Text>
      <Text className="typo-body-base-regular text-content-dark-3 max-w-md">
        Người duyệt đã nhận thông báo. Bạn có thể theo dõi tiến độ trên màn chi tiết lô.
      </Text>
      <Flex gap="3">
        <Button variant="secondary-border" onClick={onExitToList}>
          Về danh sách lô
        </Button>
        <Button variant="primary" onClick={onOpenBatch}>
          Mở lô
        </Button>
      </Flex>
    </Flex>
  )
}

export default LadSubmitConfirmation
