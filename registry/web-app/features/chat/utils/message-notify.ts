import type { ChatMembership, Message } from '../types/channel'

// US-222 (CR 86eygp5xz) — chỉ mirror đúng 2 kiểu mention mà chat backend thực
// sự resolve ra người nhận (`_resolve_recipients` trong `apps/chat/tasks.py`):
// {type: "user", user_id} và {type: "all"}. Các kiểu khác (vd "admin", "here")
// mà MessageInput có thể gắn vào metadata KHÔNG được server coi là mention —
// không tính vào đây để khớp đúng rule tạo notification phía server.
export function isMessageMentioningUser(
  message: Pick<Message, 'metadata'>,
  userId: number
): boolean {
  const mentions = message.metadata?.mentions
  if (!mentions || mentions.length === 0) return false
  return mentions.some(
    (m) => m.type === 'all' || (m.type === 'user' && Number(m.user_id) === Number(userId))
  )
}

// Chuông báo cục bộ (WS `message.created`) chỉ kêu khi tin nhắn "đáng chú ý"
// với current user, khớp đúng điều kiện tạo notification ở chat backend
// (`_should_skip` trong `apps/chat/tasks.py`): `is_muted=true` override TẤT CẢ,
// kể cả mention (rule có sẵn từ Phase 2, không phải riêng US-222) — sau đó mới
// đến mention luôn kêu, còn tin thường chỉ kêu khi đã opt-in `notify_new_messages`.
export function shouldPlayMessageSound(
  message: Pick<Message, 'metadata'>,
  currentUserId: number,
  currentUserMembership: Pick<ChatMembership, 'is_muted' | 'notify_new_messages'> | undefined
): boolean {
  if (currentUserMembership?.is_muted) return false
  if (isMessageMentioningUser(message, currentUserId)) return true
  return currentUserMembership?.notify_new_messages ?? false
}
