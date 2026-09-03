import { useState, useMemo, useEffect, useRef } from 'react'
import { useChatStore } from '../../store/chat-store'
import { ChatMembership, MemberRole, MuteDuration } from '../../types/channel'
import { MemberListItem } from './MemberListItem'
import { AddMemberDialog } from './AddMemberDialog'
import { MuteMemberDialog } from './MuteMemberDialog'
import { PromoteDemoteConfirmDialog } from './PromoteDemoteConfirmDialog'
import { RemoveMemberConfirmDialog } from './RemoveMemberConfirmDialog'
import { Button } from '@/components/ui/button'
import Switch from '@/components/ui/switch/Switch'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { chatWsService } from '../../services/chat-ws-service'
import { chatService } from '../../services/chat-service'
import { loadChannelMembers } from '../../utils/load-channel-members'
import { removeVietnameseDiacritics } from '@/utils/string-utils'
import { useNavigate } from 'react-router-dom'
import { useAbility } from '@/lib/ability'
import { useVirtualizer } from '@tanstack/react-virtual'

import { Search, X } from 'lucide-react'

interface ChannelMemberPanelProps {
  channelId: string
  currentUserRole: MemberRole
  channelType: 'system' | 'group'
  currentUserId: number
  onClose?: () => void
}

export const ChannelMemberPanel = ({
  channelId,
  currentUserRole,
  channelType,
  currentUserId,
  onClose,
}: ChannelMemberPanelProps) => {
  const members = useChatStore((state) => state.members[channelId] || [])
  const userProfiles = useChatStore((state) => state.userProfiles)
  const cacheUserProfile = useChatStore((state) => state.cacheUserProfile)
  const updateMemberMuteStatus = useChatStore((state) => state.updateMemberMuteStatus)
  const updateMemberNotifyPreference = useChatStore((state) => state.updateMemberNotifyPreference)
  const activeChannel = useChatStore((state) => state.channels[channelId])
  const navigate = useNavigate()

  const currentUserMembership = members.find((m) => Number(m.user_id) === currentUserId)
  const [isTogglingNotify, setIsTogglingNotify] = useState(false)

  const ability = useAbility()
  const isChatAdmin = ability.can('workspace', 'chat')
  const isChannelManager = currentUserRole === 'admin' || currentUserRole === 'owner' || isChatAdmin

  const parentRef = useRef<HTMLDivElement>(null)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isAddingMembers, setIsAddingMembers] = useState(false)
  const [muteDialog, setMuteDialog] = useState<{
    open: boolean
    user?: { user_id: number; display_name: string }
  }>({ open: false })
  const [promoteDemoteDialog, setPromoteDemoteDialog] = useState<{
    open: boolean
    user?: { user_id: number; display_name: string }
    type: 'promote' | 'demote'
  }>({ open: false, type: 'promote' })
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean
    user?: { user_id: number; display_name: string }
  }>({ open: false })

  const [memberSearch, setMemberSearch] = useState('')

  useEffect(() => {
    // Fetch members list (REST API, fallback WS) and store into chat store
    loadChannelMembers(channelId)
  }, [channelId])

  // Load missing profiles for channel members dynamically
  useEffect(() => {
    const missingIds = members.map((m) => Number(m.user_id)).filter((id) => id && !userProfiles[id])

    if (missingIds.length > 0) {
      chatService
        .getUserProfiles(missingIds)
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
        .catch(console.error)
    }
  }, [members, userProfiles, cacheUserProfile])

  const sortedMembers = useMemo(() => {
    const roleWeight = { owner: 0, admin: 1, member: 2 }

    const membersWithProfiles = members.map((m) => {
      const profile = userProfiles[Number(m.user_id)]
      return {
        ...m,
        display_name: profile?.display_name || `Thành viên #${m.user_id}`,
        avatar_url: profile?.avatar_url,
      }
    })

    return membersWithProfiles.sort((a, b) => {
      if (roleWeight[a.role] !== roleWeight[b.role]) {
        return roleWeight[a.role] - roleWeight[b.role]
      }
      return a.display_name.localeCompare(b.display_name)
    })
  }, [members, userProfiles])

  // Filter members by search keyword (trim + case-insensitive + accent-insensitive)
  const filteredMembers = useMemo(() => {
    const query = removeVietnameseDiacritics(memberSearch.trim().toLowerCase())
    if (!query) return sortedMembers
    return sortedMembers.filter((m) =>
      removeVietnameseDiacritics(m.display_name.toLowerCase()).includes(query)
    )
  }, [sortedMembers, memberSearch])

  const rowVirtualizer = useVirtualizer({
    count: filteredMembers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  // Chuẩn hoá thông báo lỗi từ WS: server reject bằng { code, message, details }
  // (xem chat-ws-service). 'forbidden' → thông báo quyền; còn lại surface message thật.
  const surfaceWsError = (e: any, forbiddenMsg: string, fallbackMsg: string) => {
    if (e?.code === 'forbidden') {
      toastService.error(forbiddenMsg)
    } else {
      toastService.error(e?.message || extractErrorMessage(e, fallbackMsg))
    }
  }

  const handleAddMembers = async (userIds: number[]) => {
    if (userIds.length === 0) return
    setIsAddingMembers(true)
    try {
      const res = await chatWsService.send('add_members', {
        channel_id: channelId,
        user_ids: userIds,
      })
      setIsAddOpen(false)
      const addedCount = res?.added?.length ?? userIds.length
      const skippedCount = res?.skipped?.length ?? 0
      if (addedCount > 0) {
        toastService.success(
          skippedCount > 0
            ? `Đã thêm ${addedCount} thành viên (${skippedCount} người đã ở trong nhóm)`
            : `Đã thêm ${addedCount} thành viên`
        )
      } else {
        toastService.info('Các thành viên đã chọn đều đã ở trong nhóm')
      }
    } catch (e: any) {
      // Only report a permission problem when the server actually says so;
      // otherwise surface the real reason (timeout, connection, conflict…).
      surfaceWsError(
        e,
        'Bạn không có quyền thêm thành viên',
        'Không thể thêm thành viên. Vui lòng thử lại.'
      )
    } finally {
      setIsAddingMembers(false)
    }
  }

  // US-222 (CR 86eygp5xz) — self-service opt-in nhận thông báo tin nhắn thường
  // theo channel (mặc định tắt). Event `channel.notify_preference_changed` chỉ
  // đồng bộ tới các device khác của cùng user, không tự phản hồi thao tác này
  // → cập nhật lạc quan ngay sau khi server xác nhận, giống pattern mute/unmute.
  const handleToggleNotify = async (nextValue: boolean) => {
    setIsTogglingNotify(true)
    try {
      await chatWsService.send(nextValue ? 'enable_channel_notify' : 'disable_channel_notify', {
        channel_id: channelId,
      })
      updateMemberNotifyPreference(channelId, currentUserId, nextValue)
    } catch (e) {
      surfaceWsError(
        e,
        'Bạn không có quyền thay đổi cài đặt này',
        'Không thể cập nhật cài đặt thông báo'
      )
    } finally {
      setIsTogglingNotify(false)
    }
  }

  const handleMuteConfirm = async (duration: MuteDuration) => {
    if (!muteDialog.user) return
    const targetUserId = muteDialog.user.user_id
    try {
      await chatWsService.send('admin_mute_member', {
        channel_id: channelId,
        user_id: targetUserId,
        duration,
      })
      // Event `member.muted` chỉ push cho người bị mute, KHÔNG broadcast → UI của
      // người thao tác không tự đổi. Cập nhật lạc quan store cho member đích để
      // MemberListItem render ngay "Bỏ mute" + badge 🔇 mà không cần reload.
      updateMemberMuteStatus(channelId, targetUserId, true)
      setMuteDialog({ open: false })
      toastService.success(`Đã mute ${muteDialog.user.display_name} trong channel`)
    } catch (e) {
      surfaceWsError(e, 'Bạn không có quyền mute thành viên', 'Lỗi khi mute thành viên')
    }
  }

  const handleUnmute = async (userId: number) => {
    try {
      await chatWsService.send('admin_unmute_member', { channel_id: channelId, user_id: userId })
      // Optimistic update (event unmute cũng chỉ push cho người bị mute).
      updateMemberMuteStatus(channelId, userId, false)
      toastService.success('Đã bỏ mute thành viên')
    } catch (e) {
      surfaceWsError(e, 'Bạn không có quyền bỏ mute thành viên', 'Lỗi khi bỏ mute thành viên')
    }
  }

  // TODO(86eybe1xn / cleanup B4): thống nhất cơ chế quản trị admin. Panel này
  // promote/demote qua WS (promote_member/demote_admin), trong khi trang
  // ManageAdminsDialogContent lại add/remove admin qua REST
  // (useAddGroupChannelAdmin/useRemoveGroupChannelAdmin). Hai luồng ghi cùng một
  // trạng thái nhưng khác transport → dễ lệch cache/optimistic. Chưa gộp ở đây vì
  // rủi ro cao (đụng chat-service + backend contract); cần task riêng để chọn 1
  // nguồn sự thật. Tương tự nguồn danh sách user cũng phân mảnh: AddMemberDialog
  // fetch thẳng /api/users, CreateGroupChannelForm dùng employee-service,
  // ManageAdmins dùng getChannelEmployeesDropdown.
  const handlePromoteDemote = async () => {
    if (!promoteDemoteDialog.user) return
    try {
      const action = promoteDemoteDialog.type === 'promote' ? 'promote_member' : 'demote_admin'
      await chatWsService.send(action, {
        channel_id: channelId,
        user_id: promoteDemoteDialog.user.user_id,
      })
      setPromoteDemoteDialog({ open: false, type: 'promote' })
      toastService.success('Cập nhật quyền thành công')
    } catch (e) {
      surfaceWsError(e, 'Bạn không có quyền cập nhật quyền thành viên', 'Lỗi khi cập nhật quyền')
    }
  }

  const handleRemove = async () => {
    if (!removeDialog.user) return
    try {
      await chatWsService.send('remove_member', {
        channel_id: channelId,
        user_id: removeDialog.user.user_id,
      })
      setRemoveDialog({ open: false })
      toastService.success('Đã xóa thành viên khỏi channel')
    } catch (e) {
      surfaceWsError(e, 'Bạn không có quyền xóa thành viên', 'Lỗi khi xóa thành viên')
    }
  }

  const showAddButton = isChannelManager && channelType === 'group'

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-border-1 flex h-16 items-center justify-between border-b px-4">
        <div className="flex min-w-0 items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="text-content-dark-3 hover:bg-neutral-20 hover:text-content-dark-1 rounded-lg p-1 transition-colors"
              title="Đóng thông tin nhóm"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <h3 className="typo-h6 text-content-dark-1 truncate">Thông tin nhóm</h3>
        </div>
        {showAddButton && (
          <Button variant="secondary" size="small" onClick={() => setIsAddOpen(true)}>
            + Thêm
          </Button>
        )}
      </div>

      {/* US-222 (CR 86eygp5xz) — self-service opt-in nhận thông báo tin nhắn thường */}
      <div className="border-border-1 flex items-center justify-between border-b p-3">
        <div className="min-w-0 pr-3">
          <p className="typo-body-sm-medium text-content-dark-1">Nhận thông báo tin nhắn thường</p>
          <p className="typo-body-xs-regular text-content-dark-3 mt-0.5">
            Khi bật, bạn nhận thông báo cho mọi tin nhắn mới trong channel này, kể cả khi không được
            nhắc tên
          </p>
        </div>
        <Switch
          checked={currentUserMembership?.notify_new_messages ?? false}
          onChange={handleToggleNotify}
          disabled={isTogglingNotify || !currentUserMembership}
          tooltip="Nhận thông báo tin nhắn thường"
        />
      </div>

      {/* Member search box */}
      <div className="border-border-1 border-b p-3">
        <div className="border-border-1 focus-within:border-action-primary-red-default relative flex items-center rounded-lg border bg-white">
          <Search className="text-content-dark-3 absolute left-3 h-4 w-4" />
          <input
            type="text"
            placeholder="Tìm kiếm thành viên..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="typo-body-sm-regular text-content-dark-1 w-full bg-transparent py-2 pr-3 pl-9 outline-none"
          />
        </div>
        <p className="typo-body-xs-regular text-content-dark-3 mt-1.5">
          {filteredMembers.length} thành viên
        </p>
      </div>

      <div ref={parentRef} className="flex-1 overflow-y-auto p-2">
        {filteredMembers.length === 0 ? (
          <p className="typo-body-sm-regular text-content-dark-3 py-6 text-center">
            Không tìm thấy thành viên nào
          </p>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const m = filteredMembers[virtualRow.index]
              return (
                <div
                  key={m.user_id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <MemberListItem
                    member={
                      m as unknown as ChatMembership & { display_name: string; avatar_url?: string }
                    }
                    currentUserRole={currentUserRole}
                    currentUserId={currentUserId}
                    channelType={channelType}
                    isChatAdmin={isChatAdmin}
                    onRemove={() =>
                      setRemoveDialog({
                        open: true,
                        user: m as unknown as { user_id: number; display_name: string },
                      })
                    }
                    onPromote={() =>
                      setPromoteDemoteDialog({
                        open: true,
                        user: m as unknown as { user_id: number; display_name: string },
                        type: 'promote',
                      })
                    }
                    onDemote={() =>
                      setPromoteDemoteDialog({
                        open: true,
                        user: m as unknown as { user_id: number; display_name: string },
                        type: 'demote',
                      })
                    }
                    onMute={() =>
                      setMuteDialog({
                        open: true,
                        user: m as unknown as { user_id: number; display_name: string },
                      })
                    }
                    onUnmute={handleUnmute}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {isAddOpen && (
        <AddMemberDialog
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          existingUserIds={members.map((m) => m.user_id)}
          onConfirm={handleAddMembers}
          loading={isAddingMembers}
        />
      )}

      {muteDialog.open && muteDialog.user && (
        <MuteMemberDialog
          open={muteDialog.open}
          onClose={() => setMuteDialog({ open: false })}
          targetUser={muteDialog.user}
          onConfirm={handleMuteConfirm}
        />
      )}

      {promoteDemoteDialog.open && promoteDemoteDialog.user && (
        <PromoteDemoteConfirmDialog
          open={promoteDemoteDialog.open}
          onClose={() => setPromoteDemoteDialog({ open: false, type: 'promote' })}
          targetUser={promoteDemoteDialog.user}
          actionType={promoteDemoteDialog.type}
          onConfirm={handlePromoteDemote}
        />
      )}

      {removeDialog.open && removeDialog.user && (
        <RemoveMemberConfirmDialog
          open={removeDialog.open}
          onClose={() => setRemoveDialog({ open: false })}
          targetUser={removeDialog.user}
          onConfirm={handleRemove}
        />
      )}

      {isChannelManager && channelType === 'group' && activeChannel && (
        <div className="border-border-1 bg-neutral-5 mt-auto border-t p-4">
          <Button
            variant="secondary-border"
            className="text-action-primary-red-default border-action-primary-red-default hover:bg-action-primary-red-default/10 w-full"
            onClick={() => {
              navigate(`/chat/group-channels?search=${encodeURIComponent(activeChannel.name)}`)
            }}
          >
            Quản lý nhóm
          </Button>
        </div>
      )}
    </div>
  )
}
