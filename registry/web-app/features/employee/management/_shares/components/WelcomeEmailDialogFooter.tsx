import { useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { Button } from '@/components/ui'

type WelcomeEmailDialogFooterProps = {
  onSend: () => Promise<void>
  onSendAndBackToOnboarding: () => Promise<void>
  onCancel: () => void
}

type FooterAction = 'send' | 'sendAndBack' | null

/**
 * Footer cho dialog "Gửi email hội nhập".
 * Tự quản trạng thái loading (component có state riêng nên cập nhật reactive,
 * khác với ReactNode footer bị "chụp" tĩnh lúc mở dialog).
 */
export default function WelcomeEmailDialogFooter({
  onSend,
  onSendAndBackToOnboarding,
  onCancel,
}: WelcomeEmailDialogFooterProps) {
  const [action, setAction] = useState<FooterAction>(null)
  const isBusy = action !== null

  const runAction = async (next: Exclude<FooterAction, null>, fn: () => Promise<void>) => {
    if (isBusy) return
    setAction(next)
    try {
      await fn()
    } catch {
      // Lỗi đã được xử lý/hiển thị ở lớp trên (handleApiError)
    } finally {
      setAction(null)
    }
  }

  return (
    <div className="border-border-1 flex-shrink-0 border-t-[1px] px-6 pt-4 pb-[20px]">
      <Flex gap="2" justify="end" align="center" wrap="wrap">
        <Button
          variant="secondary"
          size="small"
          onClick={onCancel}
          disabled={isBusy}
          className="w-[130px]"
        >
          Huỷ
        </Button>
        <Button
          variant="secondary"
          size="small"
          onClick={() => runAction('sendAndBack', onSendAndBackToOnboarding)}
          disabled={isBusy}
          loading={action === 'sendAndBack'}
        >
          Gửi mail &amp; Quay lại màn danh sách Onboarding
        </Button>
        <Button
          variant="primary"
          size="small"
          onClick={() => runAction('send', onSend)}
          disabled={isBusy}
          loading={action === 'send'}
          className="w-[130px]"
        >
          Gửi mail
        </Button>
      </Flex>
    </div>
  )
}
