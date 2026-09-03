import React, { useRef, useEffect } from 'react'
import { X, Building, Shield } from 'lucide-react'
import { useChatStore } from '../../store/chat-store'
import Avatar from '@/components/ui/avatar/Avatar'
import { useEmployee } from '@/features/employee/services/employee-service'
import { Button } from '@/components/ui/button'

interface UserProfilePanelProps {
  userId: number
  channelId: string
  currentUserRole: string
  onClose: () => void
}

export const UserProfilePanel: React.FC<UserProfilePanelProps> = ({
  userId,
  channelId,
  currentUserRole,
  onClose,
}) => {
  const userProfiles = useChatStore((state) => state.userProfiles)
  const profile = userProfiles[userId]
  const senderName = profile?.display_name || `Người dùng #${userId}`

  // Fetch full employee details (department & position) from HRM service
  const { data: employee, isLoading: isEmployeeLoading } = useEmployee(userId)

  // Check if current user is channel manager to show actions
  const members = useChatStore((state) => state.members[channelId] || [])
  const currentUserId = useChatStore((state) => state.currentUserId) || 0

  // Can remove if it is a group, not self, and current user has rights
  const activeChannel = useChatStore((state) => state.channels[channelId])
  const channelType = activeChannel?.type || 'group'
  const isSelf = userId === currentUserId
  const isGroup = channelType === 'group'

  const targetMember = members.find((m) => m.user_id === userId)
  const targetRole = targetMember?.role || 'member'

  const canRemoveOthers =
    !isSelf &&
    isGroup &&
    (currentUserRole === 'owner' || (currentUserRole === 'admin' && targetRole === 'member'))

  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return (
    <div ref={panelRef} className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-border-1 flex h-16 items-center justify-between border-b px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onClose}
            className="text-content-dark-3 hover:bg-neutral-20 hover:text-content-dark-1 rounded-lg p-1 transition-colors"
            title="Đóng thông tin thành viên"
          >
            <X className="h-5 w-5" />
          </button>
          <h3 className="typo-h6 text-content-dark-1 truncate">Thông tin thành viên</h3>
        </div>
      </div>

      {/* Profile Card Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar
            size={96}
            className="border-border-1 h-24 w-24 shrink-0 rounded-full border"
            src={profile?.avatar_url || ''}
            name={senderName}
          />
          <div className="w-full min-w-0 text-center">
            <h4 className="text-content-dark-1 truncate text-lg font-bold">{senderName}</h4>
            <p className="text-content-dark-3 mt-1 text-xs font-medium">ID người dùng: #{userId}</p>
          </div>
        </div>

        {/* Detailed Info (Department, Position) */}
        <div className="border-border-1 mt-6 flex flex-col gap-4 border-t pt-6">
          {/* Department */}
          <div className="flex flex-col gap-1">
            <span className="text-content-dark-3 text-[10px] font-bold tracking-wider uppercase">
              Phòng ban
            </span>
            <div className="text-content-dark-1 flex items-center gap-2 text-sm font-semibold">
              <Building className="h-4 w-4 shrink-0 text-neutral-400" />
              {isEmployeeLoading ? (
                <span className="bg-neutral-20 h-4 w-28 animate-pulse rounded" />
              ) : (
                <span>{employee?.department?.name || 'Chưa cập nhật'}</span>
              )}
            </div>
          </div>

          {/* Position */}
          <div className="flex flex-col gap-1">
            <span className="text-content-dark-3 text-[10px] font-bold tracking-wider uppercase">
              Chức vụ
            </span>
            <div className="text-content-dark-1 flex items-center gap-2 text-sm font-semibold">
              <Shield className="h-4 w-4 shrink-0 text-neutral-400" />
              {isEmployeeLoading ? (
                <span className="bg-neutral-20 h-4 w-24 animate-pulse rounded" />
              ) : (
                <span>{employee?.position?.name || 'Chưa cập nhật'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      {canRemoveOthers && targetMember && (
        <div className="border-border-1 bg-neutral-5 mt-auto border-t p-4">
          <Button
            variant="secondary-border"
            className="text-action-primary-red-default border-action-primary-red-default hover:bg-action-primary-red-default/10 w-full"
            onClick={async () => {
              try {
                const { chatWsService } = await import('../../services/chat-ws-service')
                const toastService = (await import('@/services/toast-service')).default

                await chatWsService.send('remove_member', {
                  channel_id: channelId,
                  user_id: userId,
                })
                onClose()
                toastService.success(`Đã xóa ${senderName} khỏi nhóm`)
              } catch (e) {
                const toastService = (await import('@/services/toast-service')).default
                toastService.error('Không thể xóa thành viên')
              }
            }}
          >
            Xóa khỏi nhóm
          </Button>
        </div>
      )}
    </div>
  )
}
