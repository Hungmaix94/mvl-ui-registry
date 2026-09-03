import { chatService } from '../services/chat-service'
import { chatWsService } from '../services/chat-ws-service'
import { useChatStore } from '../store/chat-store'
import type { ChatMembership, MemberRole } from '../types/channel'

const mapMember = (channelId: string, m: any): ChatMembership => ({
  user_id: Number(m.user_id || m.id || m.user?.id || m.user?.user_id),
  channel_id: channelId,
  role: m.role as MemberRole,
  is_muted: m.is_muted ?? false,
  notify_new_messages: m.notify_new_messages ?? false,
  last_read_message_id: m.last_read_message_id ?? null,
  joined_at: m.joined_at,
})

/**
 * Tải danh sách thành viên của channel vào chat store.
 *
 * Dùng WebSocket action `list_members` của chat service — đây là endpoint duy
 * nhất trả về đầy đủ `role` + `joined_at` cho từng thành viên. (REST
 * `/api/users/?channel_id=` chỉ trả profile, không kèm role, nên không dùng
 * cho danh sách thành viên có phân quyền.)
 */
export async function loadChannelMembers(channelId: string): Promise<void> {
  const setMembers = useChatStore.getState().setMembers
  const cacheUserProfile = useChatStore.getState().cacheUserProfile

  try {
    const res = await chatWsService.send('list_members', { channel_id: channelId })
    const list = res?.members || res?.results
    if (!Array.isArray(list)) return

    setMembers(
      channelId,
      list.map((m: any) => mapMember(channelId, m))
    )

    // Fetch and cache profiles for these member IDs
    const userIds = list
      .map((m: any) => Number(m.user_id || m.id || m.user?.id || m.user?.user_id))
      .filter(Boolean)
    if (userIds.length > 0) {
      chatService
        .getUserProfiles(userIds)
        .then((profiles) => {
          if (profiles) {
            profiles.forEach((p) => {
              cacheUserProfile(p.user_id, {
                user_id: p.user_id,
                display_name: p.display_name,
                avatar_url: p.avatar_url,
              })
            })
          }
        })
        .catch((err) => console.error('Failed to load user profiles in loadChannelMembers', err))
    }
  } catch (e) {
    console.error('Failed to fetch channel members via WS list_members', e)
  }
}
