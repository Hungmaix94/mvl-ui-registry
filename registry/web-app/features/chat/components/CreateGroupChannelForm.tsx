import React, { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormController } from '@/components/ui/form'
import { TextField } from '@/components/ui/text-field'
import { TextArea } from '@/components/ui/text-area'
import Select from '@/components/ui/select/Select'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'
import { Flex } from '@radix-ui/themes'
import { getEmployeeService } from '@/features/employee/services/employee-service'
import { getChatApiBaseUrl } from '@/config/environment'
import { getStoredToken } from '@/utils/auth'
import { useCreateChatChannel } from '@/features/chat/services/chat-service'
import type { GroupChannelCreatePayload } from '@/features/chat/types'
import { Button } from '@/components/ui/button'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { appRouter } from '@/routes'
import { useChatStore } from '../store/chat-store'

export const createGroupChannelSchema = z.object({
  name: z.string().min(1, 'Tên kênh là bắt buộc').max(255, 'Tên kênh quá dài'),
  description: z.string().optional(),
  owner_user_id: z.union([z.string(), z.number()]).refine((val) => !!val, 'Chủ sở hữu là bắt buộc'),
  initial_member_ids: z
    .array(z.union([z.string(), z.number()]))
    .min(1, 'Chọn ít nhất 1 thành viên'),
})

export type CreateGroupChannelFormData = z.infer<typeof createGroupChannelSchema>

export interface CreateGroupChannelFormProps {
  onSuccess?: () => void
}

export const CreateGroupChannelForm: React.FC<CreateGroupChannelFormProps> = ({ onSuccess }) => {
  const createChannelMutation = useCreateChatChannel()

  const loadEmployeeUserOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      if (!params) {
        return { items: [], hasNextPage: false, nextPage: null }
      }
      try {
        const apiParams: any = {
          page: params.page,
          page_size: params.pageSize || 20,
        }
        if (params.query) {
          apiParams.search = params.query
        }

        const paginatedData = await getEmployeeService().getEmployees(apiParams)
        if (!paginatedData || !paginatedData.results) {
          return { items: [], hasNextPage: false, nextPage: null }
        }

        const hasNext = !!paginatedData.next
        let nextPage: number | null = null
        if (hasNext && paginatedData.next) {
          const match = paginatedData.next.match(/[?&]page=(\d+)/)
          nextPage = match ? Number(match[1]) : params.page + 1
        }

        // Filter out employees without a user account and map to SelectOption format
        const items = paginatedData.results
          .filter((emp: any) => emp.user && typeof emp.user.id === 'number')
          .map((emp: any) => ({
            label: `${emp.code} - ${emp.fullname?.trim() || ''}`,
            value: String(emp.user.id),
          }))

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading employee user options:', error)
        return { items: [], hasNextPage: false, nextPage: null }
      }
    },
    []
  )

  const loadInitialEmployeeUserOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) return []
      try {
        const chatBaseUrl = getChatApiBaseUrl()
        const response = await fetch(`${chatBaseUrl}/api/users/?ids=${values.join(',')}`, {
          headers: {
            Authorization: `Bearer ${getStoredToken()}`,
          },
        })
        if (!response.ok) {
          throw new Error('Failed to load initial users')
        }
        const data = await response.json()
        const users = Array.isArray(data) ? data : data.users || []

        return users.map((user: any) => ({
          label: user.display_name || String(user.id),
          value: String(user.id || user.user_id),
        }))
      } catch (error) {
        console.error('Error loading initial employee user options:', error)
        return values.map((val) => ({
          label: String(val),
          value: String(val),
        }))
      }
    },
    []
  )

  const form = useForm<CreateGroupChannelFormData>({
    resolver: zodResolver(createGroupChannelSchema),
    defaultValues: {
      name: '',
      description: '',
      initial_member_ids: [],
    },
  })

  const { register, control, handleSubmit } = form

  const onSubmit = useCallback(
    async (data: CreateGroupChannelFormData) => {
      try {
        const ownerId = Number(data.owner_user_id)
        const initialMemberIds = data.initial_member_ids.map(Number)

        // Ensure owner is a member
        if (!initialMemberIds.includes(ownerId)) {
          initialMemberIds.push(ownerId)
        }

        const serverData: GroupChannelCreatePayload = {
          name: data.name,
          description: data.description || '',
          owner_user_id: ownerId,
          initial_member_ids: initialMemberIds,
        }

        const createdChannel = await createChannelMutation.mutateAsync(serverData)

        // NOTE: do NOT promote the owner to admin here — the owner already holds
        // admin rights implicitly (chat rejects promoting an OWNER with 400
        // "Can only promote members to admin"). The backend now returns the
        // owner as part of the channel's admin view.

        // Update local chat store immediately to avoid WebSocket sync lag
        if (createdChannel && createdChannel.id) {
          const createdChannelId = String(createdChannel.id)
          useChatStore.getState().addChannel({
            id: createdChannelId,
            name: createdChannel.name,
            description: createdChannel.description || '',
            type: 'group',
            state: (createdChannel.state || 'active') as any,
            write_policy: (createdChannel.write_policy || 'all_members') as any,
            owner_id: ownerId,
            created_at: createdChannel.created_at || new Date().toISOString(),
            last_message_at: null,
            org_unit_type: null,
            org_unit_id: null,
            is_active: createdChannel.state !== 'disabled',
            disabled_at: null,
          })

          // Initialize members with the owner as 'owner' role to grant add_member rights immediately
          useChatStore.getState().setMembers(createdChannelId, [
            {
              user_id: ownerId,
              channel_id: createdChannelId,
              role: 'owner',
              is_muted: false,
              notify_new_messages: false,
              last_read_message_id: null,
              joined_at: new Date().toISOString(),
            },
          ])

          useChatStore.getState().setActiveChannelId(createdChannelId)
          appRouter.navigate(`/chat/${createdChannelId}`)
        }

        onSuccess?.()
      } catch (error: any) {
        console.error(error)
        toastService.error(extractErrorMessage(error))
      }
    },
    [createChannelMutation, onSuccess]
  )

  return (
    <Form loading={createChannelMutation.isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        <Flex direction="column" gap="4">
          <FormController
            register={register}
            name="name"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Tên kênh',
              required: true,
              placeholder: 'Nhập tên kênh',
              disabled: createChannelMutation.isPending,
            }}
          />

          <FormController
            register={register}
            name="description"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Mô tả',
              placeholder: 'Nhập mô tả kênh',
              disabled: createChannelMutation.isPending,
            }}
          />

          <FormController
            register={register}
            name="owner_user_id"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Quản trị viên',
              required: true,
              placeholder: 'Chọn quản trị viên',
              enableSearch: true,
              loadOptions: loadEmployeeUserOptions,
              loadInitialOptions: loadInitialEmployeeUserOptions,
              disabled: createChannelMutation.isPending,
            }}
          />

          <FormController
            register={register}
            name="initial_member_ids"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Thành viên ban đầu',
              required: true,
              placeholder: 'Chọn thành viên',
              enableSearch: true,
              multiple: true,
              loadOptions: loadEmployeeUserOptions,
              loadInitialOptions: loadInitialEmployeeUserOptions,
              disabled: createChannelMutation.isPending,
            }}
          />
        </Flex>

        <Flex justify="end" gap="3" mt="6" className="pb-4">
          <Button
            type="button"
            variant="secondary-border"
            onClick={onSuccess}
            disabled={createChannelMutation.isPending}
            className="w-[120px]"
          >
            Hủy
          </Button>
          <Button type="submit" disabled={createChannelMutation.isPending} className="w-[120px]">
            Tạo mới
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}
