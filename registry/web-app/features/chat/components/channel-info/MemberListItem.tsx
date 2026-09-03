import { useState } from 'react'
import { ChatMembership, MemberRole } from '../../types/channel'
import { getMemberPermissions } from '../../utils/member-permissions'
import Avatar from '@/components/ui/avatar/Avatar'
import { Popover, PopoverContentPrimitive, PopoverTrigger } from '@/components/ui/popover'

export interface MemberListItemProps {
  member: ChatMembership & { display_name: string; avatar_url?: string }
  currentUserRole: MemberRole
  channelType: 'system' | 'group'
  currentUserId: number
  // Người có ability workspace:chat (chat-admin) — được quyền quản trị tương đương
  // admin dù không phải thành viên kênh. Nhất quán với nút "+Thêm" ở panel.
  isChatAdmin?: boolean
  onRemove: (userId: number) => void
  onPromote: (userId: number) => void
  onDemote: (userId: number) => void
  onMute: (userId: number) => void
  onUnmute: (userId: number) => void
}

export const MemberListItem = ({
  member,
  currentUserRole,
  channelType,
  currentUserId,
  isChatAdmin,
  onRemove,
  onPromote,
  onDemote,
  onMute,
  onUnmute,
}: MemberListItemProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const { canRemove, canPromote, canDemote, canMute, canUnmute } = getMemberPermissions({
    currentUserRole,
    isChatAdmin,
    channelType,
    currentUserId,
    member,
  })

  const hasAnyAction = canRemove || canPromote || canDemote || canMute || canUnmute

  return (
    <div
      className="group flex items-center justify-between rounded-md p-2 hover:bg-neutral-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3">
        <Avatar
          size={40}
          className="h-10 w-10"
          src={member.avatar_url || ''}
          name={member.display_name}
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="typo-body-base-medium text-content-dark-1">{member.display_name}</span>
            {member.is_muted && (
              <span title="Đang bị mute" className="text-neutral-500">
                🔇
              </span>
            )}
            {member.role === 'owner' && (
              <span className="rounded bg-purple-500 px-2 py-0.5 text-xs text-white hover:bg-purple-600">
                Owner
              </span>
            )}
            {member.role === 'admin' && (
              <span className="rounded bg-blue-500 px-2 py-0.5 text-xs text-white hover:bg-blue-600">
                Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {hasAnyAction && (isHovered || menuOpen) && (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-200">⋮</button>
          </PopoverTrigger>
          <PopoverContentPrimitive
            align="end"
            className="border-border-1 z-50 w-48 rounded-md border bg-white py-1 shadow-md"
          >
            {canPromote && (
              <button
                className="typo-body-sm w-full px-4 py-2 text-left hover:bg-neutral-50"
                onClick={() => {
                  setMenuOpen(false)
                  onPromote(member.user_id)
                }}
              >
                Phong làm Admin
              </button>
            )}
            {canDemote && (
              <button
                className="typo-body-sm w-full px-4 py-2 text-left hover:bg-neutral-50"
                onClick={() => {
                  setMenuOpen(false)
                  onDemote(member.user_id)
                }}
              >
                Tước quyền Admin
              </button>
            )}
            {canMute && (
              <button
                className="typo-body-sm w-full px-4 py-2 text-left hover:bg-neutral-50"
                onClick={() => {
                  setMenuOpen(false)
                  onMute(member.user_id)
                }}
              >
                Mute trong channel
              </button>
            )}
            {canUnmute && (
              <button
                className="typo-body-sm w-full px-4 py-2 text-left hover:bg-neutral-50"
                onClick={() => {
                  setMenuOpen(false)
                  onUnmute(member.user_id)
                }}
              >
                Bỏ mute
              </button>
            )}
            {canRemove && (
              <button
                className="typo-body-sm w-full px-4 py-2 text-left text-red-500 hover:bg-neutral-50"
                onClick={() => {
                  setMenuOpen(false)
                  onRemove(member.user_id)
                }}
              >
                Xóa khỏi channel
              </button>
            )}
          </PopoverContentPrimitive>
        </Popover>
      )}
    </div>
  )
}
