import { Button } from '@/components/ui'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { IconPaperplaneright } from '@/assets/icons'
import { useDialog } from '@/hooks/useDialog.ts'
import { parseDateTimeFromApi } from '@/utils/date-utils'

type Props = {
  dealCode?: string | null
  email: string
  sentAt?: string | null
  disabled?: boolean
  isSending?: boolean
  onSend: () => Promise<void> | void
}

// CR STT33 / ClickUp 86eyexcr3 — send/resend the per-unit commission statement for ONE deal row
// of the CTV monthly detail. Unlike Sale (CR STT31, one summary-level button that auto-groups
// deals by recipient server-side), CTV asks for an explicit per-row action — BA confirmed each
// deal gets its own send button (ClickUp 86eyexcr3 comment 90180242176716).
const CtvDealSendMailButton = ({ dealCode, email, sentAt, disabled, isSending, onSend }: Props) => {
  const { displayConfirm } = useDialog()

  const hasEmail = !!email
  const alreadySent = !!sentAt
  const label = alreadySent ? 'Gửi lại' : 'Gửi'

  const handleClick = () => {
    displayConfirm({
      title: alreadySent ? 'Gửi lại email đối chiếu' : 'Gửi email đối chiếu',
      content: (
        <div className="text-content-dark-2">
          {alreadySent ? 'Gửi lại' : 'Gửi'} email đối chiếu hoa hồng
          {dealCode ? ` deal ${dealCode}` : ''} tới{' '}
          <b className="typo-body-lg-regular text-content-dark-2">{email}</b>?
        </div>
      ),
      confirmText: label,
      cancelText: 'Huỷ',
      onConfirm: onSend,
    })
  }

  const button = (
    <Button
      variant="secondary-border"
      size="small"
      type="button"
      leftIcon={<IconPaperplaneright size={14} />}
      disabled={disabled || !hasEmail}
      loading={isSending}
      onClick={handleClick}
    >
      {label}
    </Button>
  )

  if (!alreadySent) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Đã gửi lúc {parseDateTimeFromApi(sentAt)}
      </TooltipContent>
    </Tooltip>
  )
}

export default CtvDealSendMailButton
