import { Fragment, useCallback, useMemo, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils'
import { useAbility } from '@/lib/ability'
import type { Notification } from '@/services/notification-service'
import {
  getContractDetailPath,
  getNotificationMessageTokens,
} from '@/components/navigation/notification/notification-message-utils.ts'

type NotificationMessageProps = {
  notification: Notification
  /** Gọi trước khi điều hướng từ một link trong message (vd: đánh dấu đã đọc). */
  onBeforeNavigate?: (notification: Notification) => void
}

/**
 * Render nội dung message của notification, thay placeholder `{{n}}` bằng tên nhân sự
 * dạng link điều hướng tới màn chi tiết hợp đồng tương ứng.
 *
 * Notification thường (không có placeholder hợp đồng) → render plain text như cũ.
 */
const NotificationMessage = ({ notification, onBeforeNavigate }: NotificationMessageProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const tokens = useMemo(() => getNotificationMessageTokens(notification), [notification])
  const canViewContract = ability.can('retrieve', 'contract')

  const handleContractClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>, contractId: number) => {
      // Chặn click lan ra Text cha (điều hướng/đánh dấu đọc toàn notification).
      event.stopPropagation()
      onBeforeNavigate?.(notification)
      navigate(getContractDetailPath(contractId), {
        state: { from: window.location.pathname + window.location.search },
      })
    },
    [navigate, notification, onBeforeNavigate]
  )

  if (tokens.length === 0) {
    return <>{notification.verb}</>
  }

  return (
    <>
      {tokens.map((token, index) => {
        if (token.type === 'contract-link' && canViewContract) {
          return (
            <button
              key={`${index}_${token.contractId}`}
              type="button"
              onClick={(event) => handleContractClick(event, token.contractId)}
              className={cn(
                'text-action-primary-red-default font-semibold',
                'cursor-pointer hover:underline focus-visible:underline'
              )}
            >
              {token.value}
            </button>
          )
        }

        return <Fragment key={`${index}_text`}>{token.value}</Fragment>
      })}
    </>
  )
}

export default NotificationMessage
