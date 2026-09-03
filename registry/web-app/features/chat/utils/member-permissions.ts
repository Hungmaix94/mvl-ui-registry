import type { ChatMembership, MemberRole } from '../types/channel'

export interface MemberPermissions {
  canRemove: boolean
  canPromote: boolean
  canDemote: boolean
  canMute: boolean
  canUnmute: boolean
}

export interface MemberPermissionInput {
  currentUserRole: MemberRole
  // Người có ability workspace:chat (chat-admin) — quản trị tương đương admin
  // dù không phải thành viên kênh. Nhất quán với nút "+Thêm" ở panel.
  isChatAdmin?: boolean
  channelType: 'system' | 'group'
  currentUserId: number
  member: Pick<ChatMembership, 'user_id' | 'role' | 'is_muted'>
}

/**
 * Ma trận quyền cho một dòng thành viên trong panel kênh nhóm.
 *
 * Quy tắc:
 * - owner: xoá mọi người; promote member → admin; demote admin → member; mute/unmute member.
 * - admin: chỉ xoá/mute/unmute thành viên (role 'member'); KHÔNG promote/demote.
 * - chat-admin (ability workspace:chat) ứng xử NHƯ admin — trừ khi bản thân là owner
 *   thì giữ quyền owner. Bảo đảm nhất quán với nút "+Thêm".
 * - Không ai tự thao tác lên chính mình; chỉ áp dụng cho kênh 'group'.
 */
export function getMemberPermissions({
  currentUserRole,
  isChatAdmin,
  channelType,
  currentUserId,
  member,
}: MemberPermissionInput): MemberPermissions {
  const isSelf = member.user_id === currentUserId
  const isGroup = channelType === 'group'
  // chat-admin được nâng lên 'admin' nếu chưa phải owner/admin trong kênh.
  const effectiveRole: MemberRole =
    currentUserRole === 'owner' ? 'owner' : isChatAdmin ? 'admin' : currentUserRole
  const hasAdminOrOwner = effectiveRole === 'admin' || effectiveRole === 'owner'

  const canRemove =
    !isSelf &&
    isGroup &&
    (effectiveRole === 'owner' || (effectiveRole === 'admin' && member.role === 'member'))

  const canPromote = !isSelf && isGroup && effectiveRole === 'owner' && member.role === 'member'
  const canDemote = !isSelf && isGroup && effectiveRole === 'owner' && member.role === 'admin'
  const canMute = !isSelf && hasAdminOrOwner && member.role === 'member' && !member.is_muted
  const canUnmute = !isSelf && hasAdminOrOwner && member.role === 'member' && member.is_muted

  return { canRemove, canPromote, canDemote, canMute, canUnmute }
}
