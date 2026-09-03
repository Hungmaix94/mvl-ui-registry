import React, { useState, useMemo, useCallback } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { Button } from '@/components/ui/button'
import Select from '@/components/ui/select/Select'
import Avatar from '@/components/ui/avatar/Avatar'
import { IconTrash } from '@/assets/icons'
import { GroupChannel, ChannelEmployee } from '@/features/chat/types'
import { LoadOptionsParams } from '@/components/ui/select/Select'
import {
  useAddGroupChannelAdmin,
  useRemoveGroupChannelAdmin,
  chatService,
} from '@/features/chat/services/chat-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

interface ManageAdminsDialogContentProps {
  channel: GroupChannel
  onClose: () => void
}

export const ManageAdminsDialogContent: React.FC<ManageAdminsDialogContentProps> = ({
  channel,
  onClose,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const addAdminMutation = useAddGroupChannelAdmin()
  const removeAdminMutation = useRemoveGroupChannelAdmin()

  const loadOptions = useCallback(
    async (params: LoadOptionsParams) => {
      try {
        // Call the new API to get channel members as employee dropdown
        const response = await chatService.getChannelEmployeesDropdown(channel.id, {
          search: params.query,
          page_size: 100,
        })

        // Filter out owner and current admins. Use user_id (ERP user id), NOT
        // emp.id (Employee PK) — the add/remove-admin API keys on user_id.
        const filtered = response.filter((emp: any) => {
          const userId = Number(emp.user_id)
          const isOwner = userId === channel.owner_user_id
          const isAdmin = channel.admin_user_ids?.includes(userId)
          return !isOwner && !isAdmin
        })

        // Map to SelectOptions (value = ERP user_id, used by add-admin).
        const items = filtered.map((emp: any) => ({
          value: Number(emp.user_id),
          label: `${emp.code} - ${emp.fullname || ''}`,
          optionLabel: `${emp.code} - ${emp.fullname || ''}`,
        }))

        return {
          items,
          hasNextPage: false,
        }
      } catch (e) {
        console.error('Failed to load channel members for admin promotion', e)
        return {
          items: [],
          hasNextPage: false,
        }
      }
    },
    [channel]
  )

  const handleAddAdmin = useCallback(async () => {
    if (!selectedUserId) return
    const userIdNum = Number(selectedUserId)

    if (userIdNum === channel.owner_user_id || channel.admin_user_ids?.includes(userIdNum)) {
      toastService.warning('Người dùng này đã là quản trị viên hoặc chủ sở hữu')
      return
    }

    try {
      await addAdminMutation.mutateAsync({ id: channel.id, userId: userIdNum })
      setSelectedUserId('')
    } catch (e) {
      console.error(e)
      toastService.error(extractErrorMessage(e))
    }
  }, [selectedUserId, channel, addAdminMutation])

  const handleRemoveAdmin = useCallback(
    async (userId: number) => {
      try {
        await removeAdminMutation.mutateAsync({ id: channel.id, userId })
      } catch (e) {
        console.error(e)
        toastService.error(extractErrorMessage(e))
      }
    },
    [channel.id, removeAdminMutation]
  )

  // Owner + admins come embedded on the channel from the backend (nested
  // employees). Owner is rendered first and flagged as the implicit admin.
  const adminList = useMemo(() => {
    const list: Array<ChannelEmployee & { isOwner: boolean }> = []
    if (channel.owner) list.push({ ...channel.owner, isOwner: true })
    ;(channel.admins ?? []).forEach((admin) => list.push({ ...admin, isOwner: false }))
    return list
  }, [channel.owner, channel.admins])

  return (
    <Flex direction="column" gap="4" className="w-full px-10 py-6">
      {/* Selection row to add new admin */}
      <Flex direction="column" gap="2">
        <Text size="2" weight="medium">
          Thêm quản trị viên mới
        </Text>
        <Flex gap="3" align="end">
          <div className="flex-1">
            <Select
              value={selectedUserId}
              onChange={(val) => setSelectedUserId(val as string)}
              placeholder="Tìm kiếm thành viên trong nhóm để bổ nhiệm..."
              enableSearch={true}
              loadOptions={loadOptions}
              disabled={addAdminMutation.isPending}
            />
          </div>
          <Button
            onClick={handleAddAdmin}
            disabled={!selectedUserId || addAdminMutation.isPending}
            className="h-10 px-4"
          >
            Thêm
          </Button>
        </Flex>
      </Flex>

      {/* Admin list */}
      <Flex direction="column" gap="2" className="mt-4">
        <Text size="2" weight="medium">
          Danh sách quản trị viên ({adminList.length})
        </Text>

        {adminList.length === 0 ? (
          <Text size="2" color="gray" className="py-4 text-center">
            Chưa có quản trị viên nào.
          </Text>
        ) : (
          <Flex direction="column" gap="2" className="max-h-[300px] overflow-y-auto pr-1">
            {adminList.map((admin) => (
              <Flex
                key={admin.user_id}
                align="center"
                justify="between"
                className="rounded-md border border-neutral-100 p-3 hover:bg-neutral-50"
              >
                <Flex align="center" gap="3">
                  <Avatar
                    size={32}
                    name={admin.fullname}
                    src={admin.avatar?.view_url ?? undefined}
                  />
                  <Flex direction="column">
                    <Flex align="center" gap="2">
                      <Text size="2" weight="medium" className="text-content-dark-1">
                        {admin.fullname}
                      </Text>
                      {admin.isOwner ? (
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                          Chủ sở hữu
                        </span>
                      ) : (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Admin
                        </span>
                      )}
                    </Flex>
                  </Flex>
                </Flex>

                {/* Owner cannot be removed from admin role */}
                {!admin.isOwner && (
                  <button
                    onClick={() => handleRemoveAdmin(admin.user_id)}
                    disabled={removeAdminMutation.isPending}
                    className="rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                    title="Gỡ quyền quản trị"
                  >
                    <IconTrash size={16} />
                  </button>
                )}
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>

      <Flex justify="end" mt="4">
        <Button variant="secondary-border" onClick={onClose} className="w-[100px]">
          Đóng
        </Button>
      </Flex>
    </Flex>
  )
}
