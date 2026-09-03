import { MemberRole, MuteDuration } from './channel'

// ===== ACTIONS (Client → Server) =====

// Contract thực tế của server là bulk: action `add_members` nhận mảng `user_ids`.
// (Trước đây type khai báo `add_member` số ít với `user_id` — không khớp code gửi đi.)
export interface AddMembersPayload {
  channel_id: string
  user_ids: number[]
}

// Callback trả về sau khi `add_members`: phân biệt người thêm được và người bị bỏ qua
// (đã ở trong nhóm). Dùng để hiển thị toast "đã thêm N (M người đã ở trong nhóm)".
export interface AddMembersResult {
  added?: number[]
  skipped?: number[]
}

export interface RemoveMemberPayload {
  channel_id: string
  user_id: number
}

export interface PromoteMemberPayload {
  channel_id: string
  user_id: number
}

export interface DemoteAdminPayload {
  channel_id: string
  user_id: number
}

export interface AdminMuteMemberPayload {
  channel_id: string
  user_id: number
  duration: MuteDuration // "5_minutes" | "1_hour" | "1_day" | "permanent"
}

export interface AdminUnmuteMemberPayload {
  channel_id: string
  user_id: number
}

// US-222 (CR 86eygp5xz) — self-service opt-in nhận thông báo tin nhắn thường theo channel
export interface EnableChannelNotifyPayload {
  channel_id: string
}

export interface DisableChannelNotifyPayload {
  channel_id: string
}

// ===== EVENTS (Server → Client) =====

export interface MemberAddedEvent {
  channel_id: string
  user_id: number
  role: MemberRole
}

export interface MemberRemovedEvent {
  channel_id: string
  user_id: number
}

export interface MemberRoleChangedEvent {
  channel_id: string
  user_id: number
  old_role: MemberRole
  new_role: MemberRole
}

// CHỈ push tới user bị mute — KHÔNG broadcast toàn channel
export interface MemberMutedEvent {
  channel_id: string
  muted_until: string | null // null = permanent
}

export interface MemberUnmutedEvent {
  channel_id: string
}

// CHỈ push tới các device KHÁC của cùng user (multi-device sync) — KHÔNG broadcast toàn channel
export interface ChannelNotifyPreferenceChangedEvent {
  channel_id: string
  notify_new_messages: boolean
}

export interface MessageRevokedEvent {
  message_id: string
  channel_id: string
  revoked_at: string
  revoked_by_user_id: number | null
}
