import { useState, useEffect } from 'react'
import { Message, MemberRole } from '../../types/channel'
import { X } from 'lucide-react'

import { REACTION_TYPES } from '../../constants'

import { useChatStore } from '../../store/chat-store'

interface MessageContextMenuProps {
  message: Message
  currentUserId: number
  currentUserRole: MemberRole
  targetMemberRole?: MemberRole // role of the message sender in the channel
  onRevokeClick: () => void
  children: React.ReactNode
}

import { chatWsService } from '../../services/chat-ws-service'
import toastService from '@/services/toast-service'

export const MessageContextMenu = ({
  message,
  currentUserId,
  currentUserRole: _currentUserRole,
  targetMemberRole: _targetMemberRole,
  onRevokeClick,
  children,
}: MessageContextMenuProps) => {
  const [menuOpen, setMenuOpen] = useState(false)

  const isSelf = message.user_id === currentUserId
  const canSelfRevoke = isSelf && !message.revoked_at
  const canRevoke = canSelfRevoke

  // Close context menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return

    const handleOutsideClick = () => {
      setMenuOpen(false)
    }

    // Delay adding the event listener to avoid immediate trigger from the right click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick)
    }, 10)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [menuOpen])

  const handleReactionClick = async (type: string) => {
    try {
      await chatWsService.send('add_reaction', {
        message_id: message.id,
        type,
      })
      setMenuOpen(false)
    } catch (e) {
      toastService.error('Không thể tương tác tin nhắn')
    }
  }

  const pinnedMessages = useChatStore((state) => state.pinnedMessages[message.channel_id] || [])
  const isPinned = pinnedMessages.some((m) => m.id === message.id)
  const pinMessage = useChatStore((state) => state.pinMessage)
  const unpinMessage = useChatStore((state) => state.unpinMessage)

  // Show menu box for actions (pin/unpin are always available for non-revoked messages)
  const showMenuBox = true

  return (
    <div
      className="relative inline-block"
      onContextMenu={(e) => {
        e.preventDefault()
        setMenuOpen(true)
      }}
    >
      {children}

      {menuOpen && (
        <div className="pointer-events-auto absolute z-50 mt-2 flex w-48 flex-col gap-1.5">
          {/* Reaction Bar */}
          {!message.revoked_at && (
            <div className="border-border-1 absolute bottom-full left-0 mb-2 flex w-max max-w-[280px] items-center gap-1 rounded-full border bg-white/95 px-2.5 py-1.5 shadow-lg backdrop-blur-md transition-all duration-200">
              {REACTION_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleReactionClick(t.key)}
                  className="flex items-center justify-center p-1 transition-transform hover:scale-130"
                  title={t.label}
                >
                  <img
                    src={t.url}
                    alt={t.label}
                    className="pointer-events-none h-5 w-5 shrink-0 object-contain"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Context Menu */}
          {showMenuBox && (
            <div className="border-border-1 w-full overflow-hidden rounded-xl border bg-white/95 shadow-xl backdrop-blur-md transition-all duration-200">
              {/* Header with close button when reaction bar is hidden */}
              {message.revoked_at && (
                <div className="border-border-1/50 bg-neutral-10 flex items-center justify-between border-b px-3 py-1.5">
                  <span className="text-content-dark-3 text-[11px] font-semibold tracking-wider uppercase">
                    Thao tác
                  </span>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="text-content-dark-3 hover:bg-neutral-30 hover:text-content-dark-1 flex h-5 w-5 items-center justify-center rounded-full transition-all"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {!message.revoked_at && (
                <button
                  type="button"
                  className="text-content-dark-1 hover:bg-neutral-30 flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors"
                  onClick={() => {
                    setMenuOpen(false)
                    if (isPinned) {
                      unpinMessage(message.channel_id, message.id)
                    } else {
                      if (pinnedMessages.length >= 3) {
                        toastService.warning(
                          'Chỉ được ghim tối đa 3 tin nhắn trong mỗi cuộc hội thoại'
                        )
                        return
                      }
                      pinMessage(message.channel_id, message)
                      toastService.success('Đã ghim tin nhắn')
                    }
                  }}
                >
                  <span>{isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}</span>
                </button>
              )}
              {canRevoke && (
                <button
                  className="hover:bg-neutral-30 flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-red-50 transition-colors"
                  onClick={() => {
                    setMenuOpen(false)
                    onRevokeClick()
                  }}
                >
                  <span>Thu hồi tin nhắn</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function getRevokeLabel(message: Message, _currentUserId: number): string {
  if (!message.revoked_at) return ''
  if (message.revoked_by_user_id === null || message.revoked_by_user_id === message.user_id) {
    return 'Đã thu hồi' // self-revoke
  }
  return 'Đã bị admin thu hồi' // admin-revoke — KHÔNG hiện tên admin
}
