import { useState } from 'react'
import AppDialog from '@/components/dialog/AppDialog'
import { useDebounceValue } from 'usehooks-ts'
import { useQuery } from '@tanstack/react-query'
import Avatar from '@/components/ui/avatar/Avatar'
import { getChatApiBaseUrl } from '@/config/environment'
import { getStoredToken } from '@/utils/auth'
import { X, Check } from 'lucide-react'

interface AddMemberDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (userIds: number[]) => Promise<void> | void
  existingUserIds: number[]
  loading?: boolean
}

interface ChatUser {
  user_id: number
  display_name: string
  avatar_file_id?: number
  avatar_url?: string
}

/**
 * Chuẩn hoá kết quả search user từ chat API về `user_id`.
 *
 * API `/api/users/?search=` trả field định danh là `id` (xem
 * `_serialize_user_profile` bên chat service), KHÔNG phải `user_id`. Nếu đọc thẳng
 * `user_id` thì mọi phần tử đều `undefined` → sau khi chọn 1 người, `Set{undefined}`
 * khiến MỌI hàng bị coi là "đã chọn" (hiện dấu tick) và click bất kỳ sẽ xoá sạch
 * lựa chọn; đồng thời không lọc được thành viên đã có. (Bug ClickUp 86eybb5zn.)
 */
export function normalizeChatUsers(raw: unknown): ChatUser[] {
  const list = (raw as { users?: unknown })?.users
  if (!Array.isArray(list)) return []
  return list.map((u: any) => ({
    user_id: u?.user_id ?? u?.id,
    display_name: u?.display_name,
    avatar_file_id: u?.avatar_file_id,
    avatar_url: u?.avatar_url,
  }))
}

export const AddMemberDialog = ({
  open,
  onClose,
  onConfirm,
  existingUserIds,
  loading,
}: AddMemberDialogProps) => {
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebounceValue(search, 300)
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([])

  const { data, isFetching } = useQuery({
    queryKey: ['chat-users', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim()) return { users: [] }
      const chatBaseUrl = getChatApiBaseUrl()
      const response = await fetch(
        `${chatBaseUrl}/api/users/?search=${encodeURIComponent(debouncedSearch.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${getStoredToken()}`,
          },
        }
      )
      const data = await response.json()
      return { users: normalizeChatUsers(data) }
    },
    enabled: open && debouncedSearch.length > 0,
  })

  const selectedIds = new Set(selectedUsers.map((u) => u.user_id))
  const users = (data?.users || []).filter((u: ChatUser) => !existingUserIds.includes(u.user_id))

  const toggleUser = (user: ChatUser) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.user_id === user.user_id)
        ? prev.filter((u) => u.user_id !== user.user_id)
        : [...prev, user]
    )
  }

  const removeSelected = (userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.user_id !== userId))
  }

  const handleConfirm = async () => {
    if (selectedUsers.length === 0 || loading) return
    await onConfirm(selectedUsers.map((u) => u.user_id))
  }

  const handleClose = () => {
    setSearch('')
    setSelectedUsers([])
    onClose()
  }

  return (
    <AppDialog
      variant="custom"
      isHideCancelButton={false}
      size="sm"
      open={open}
      onOpenChange={handleClose}
      onCancel={handleClose}
      onConfirm={handleConfirm}
      disableConfirm={selectedUsers.length === 0 || !!loading}
      loading={loading}
      title="Thêm thành viên"
      content={
        <div className="flex h-[400px] flex-col">
          <div className="border-border-1 border-b p-4">
            <div className="relative">
              <svg
                className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-neutral-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm thành viên..."
                className="focus:ring-primary border-border-1 w-full rounded-md border py-2 pr-4 pl-10 outline-none focus:ring-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Selected members waiting to be added */}
          {selectedUsers.length > 0 && (
            <div className="border-border-1 flex flex-wrap gap-2 border-b p-3">
              {selectedUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="bg-primary/10 flex items-center gap-2 rounded-full py-1 pr-1 pl-2"
                >
                  <span
                    className="typo-body-sm-regular text-content-dark-1 max-w-[140px] truncate"
                    title={user.display_name}
                  >
                    {user.display_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSelected(user.user_id)}
                    className="text-content-dark-3 hover:bg-neutral-20 hover:text-content-dark-1 rounded-full p-0.5"
                    title="Bỏ khỏi danh sách"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2">
            {isFetching && (
              <div className="p-4 text-center text-sm text-neutral-500">Đang tìm kiếm...</div>
            )}
            {!isFetching && search && users.length === 0 && (
              <div className="p-4 text-center text-sm text-neutral-500">
                Không tìm thấy kết quả phù hợp
              </div>
            )}
            {!isFetching &&
              users.map((user: ChatUser) => {
                const isSelected = selectedIds.has(user.user_id)
                return (
                  <div
                    key={user.user_id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-neutral-50 ${
                      isSelected ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => toggleUser(user)}
                  >
                    <Avatar
                      size={40}
                      className="h-10 w-10"
                      src={user.avatar_url || ''}
                      name={user.display_name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="typo-body-base-medium text-content-dark-1 truncate">
                        {user.display_name}
                      </p>
                    </div>
                    {isSelected && <Check className="text-action-primary-red-default h-5 w-5" />}
                  </div>
                )
              })}
          </div>
        </div>
      }
      confirmText={selectedUsers.length > 0 ? `Thêm (${selectedUsers.length})` : 'Thêm'}
      cancelText="Hủy"
    />
  )
}
