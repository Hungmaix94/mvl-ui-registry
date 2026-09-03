import React, { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormController } from '@/components/ui/form'
import { TextField } from '@/components/ui/text-field'
import { TextArea } from '@/components/ui/text-area'
import { WritePolicySelect } from './WritePolicySelect'
import { Flex } from '@radix-ui/themes'
import { Button } from '@/components/ui/button'
import { useUpdateChatChannel } from '@/features/chat/services/chat-service'
import type { GroupChannel } from '@/features/chat/types'
import { getChangedChannelFields, isSystemChannel } from '@/features/chat/utils/channel-state'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

export const editGroupChannelSchema = z.object({
  name: z.string().min(1, 'Tên nhóm là bắt buộc').max(255, 'Tên nhóm quá dài'),
  description: z.string().optional(),
  write_policy: z.string().min(1, 'Quyền nhắn tin là bắt buộc'),
})

export type EditGroupChannelFormData = z.infer<typeof editGroupChannelSchema>

interface EditGroupChannelFormProps {
  channel: GroupChannel
  onSuccess?: () => void
}

export const EditGroupChannelForm: React.FC<EditGroupChannelFormProps> = ({
  channel,
  onSuccess,
}) => {
  const updateChannelMutation = useUpdateChatChannel()
  // System channels (auto-created per org unit) cannot be renamed by the chat
  // service — lock the name field so the user can still edit description/policy.
  const isSystem = isSystemChannel(channel)

  const { register, control, handleSubmit } = useForm<EditGroupChannelFormData>({
    resolver: zodResolver(editGroupChannelSchema),
    defaultValues: {
      name: channel.name || '',
      description: channel.description || '',
      write_policy: channel.write_policy || '',
    },
  })

  const onSubmit = useCallback(
    async (data: EditGroupChannelFormData) => {
      // Only send fields that actually changed — sending an unchanged `name`
      // would trip the chat service's "cannot rename system channel" rejection.
      const serverData = getChangedChannelFields(channel, data)

      if (Object.keys(serverData).length === 0) {
        onSuccess?.()
        return
      }

      try {
        await updateChannelMutation.mutateAsync({
          id: channel.id,
          data: serverData,
        })
        onSuccess?.()
      } catch (error: any) {
        console.error(error)
        toastService.error(extractErrorMessage(error))
      }
    },
    [channel, updateChannelMutation, onSuccess]
  )

  return (
    <Form loading={updateChannelMutation.isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        <Flex direction="column" gap="4">
          <FormController
            register={register}
            name="name"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Tên nhóm',
              required: true,
              placeholder: 'Nhập tên nhóm chat',
              disabled: updateChannelMutation.isPending || isSystem,
              caption: isSystem ? 'Kênh hệ thống — không thể đổi tên nhóm' : undefined,
            }}
          />

          <FormController
            register={register}
            name="description"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Mô tả nhóm',
              placeholder: 'Nhập mô tả nhóm chat (không bắt buộc)',
              disabled: updateChannelMutation.isPending,
            }}
          />

          <FormController
            register={register}
            name="write_policy"
            control={control}
            Field={WritePolicySelect}
            fieldProps={{
              label: 'Quyền nhắn tin',
              required: true,
              placeholder: 'Chọn quyền nhắn tin',
              disabled: updateChannelMutation.isPending,
            }}
          />
        </Flex>

        <Flex justify="end" gap="3" mt="6" className="pb-4">
          <Button
            type="button"
            variant="secondary-border"
            onClick={onSuccess}
            disabled={updateChannelMutation.isPending}
            className="w-[120px]"
          >
            Hủy
          </Button>
          <Button type="submit" disabled={updateChannelMutation.isPending} className="w-[120px]">
            Lưu
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}
