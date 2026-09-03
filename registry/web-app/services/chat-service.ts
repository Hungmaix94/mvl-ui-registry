import { BaseApiService } from '@/api/base-service'
import { ApiPaths } from '@/api/schema'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

// Chat schema is currently stub — backend has not defined request/response body types yet.
// All methods use `as never` casts until the schema is fully populated.

class ChatService extends BaseApiService {
  async getChatChannels() {
    return await this.get(ApiPaths.chat_chat_channels_list, {})
  }

  async createChatChannel() {
    return await this.post(ApiPaths.chat_chat_channels_create, undefined as never)
  }

  async updateChatChannel(id: string) {
    return await this.patch(
      ApiPaths.chat_chat_channels_partial_update,
      undefined as never,
      { path: { id } } as never
    )
  }

  async deleteChatChannel(id: string) {
    return await this.delete(ApiPaths.chat_chat_channels_destroy, { path: { id } } as never)
  }

  async addChatChannelAdmin(id: string) {
    return await this.post(
      ApiPaths.chat_chat_channels_admin_create,
      undefined as never,
      { path: { id } } as never
    )
  }

  async removeChatChannelAdmin(id: string, userId: string) {
    return await this.delete(ApiPaths.chat_chat_channels_admin_destroy, {
      path: { id, user_id: userId },
    } as never)
  }

  async disableChatChannel(id: string) {
    return await this.post(ApiPaths.chat_chat_channels_disable_create, undefined, {
      path: { id },
    })
  }

  async enableChatChannel(id: string) {
    return await this.post(ApiPaths.chat_chat_channels_enable_create, undefined, {
      path: { id },
    })
  }
}

let _service: ChatService | null = null

export function getChatService(): ChatService {
  if (!_service) _service = new ChatService()
  return _service
}

// ----------------------------------------------------------------------
// Hooks
// ----------------------------------------------------------------------

export function useChatChannels(options?: { enabled?: boolean }) {
  return useApiQuery(['chat', 'channels', 'list'], () => getChatService().getChatChannels(), {
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateChatChannel() {
  return useApiMutation(() => getChatService().createChatChannel())
}

export function useUpdateChatChannel() {
  return useApiMutation((id: string) => getChatService().updateChatChannel(id))
}

export function useDeleteChatChannel() {
  return useApiMutation((id: string) => getChatService().deleteChatChannel(id))
}

export function useAddChatChannelAdmin() {
  return useApiMutation((id: string) => getChatService().addChatChannelAdmin(id))
}

export function useRemoveChatChannelAdmin() {
  return useApiMutation(({ id, userId }: { id: string; userId: string }) =>
    getChatService().removeChatChannelAdmin(id, userId)
  )
}

export function useDisableChatChannel() {
  return useApiMutation((id: string) => getChatService().disableChatChannel(id))
}

export function useEnableChatChannel() {
  return useApiMutation((id: string) => getChatService().enableChatChannel(id))
}
