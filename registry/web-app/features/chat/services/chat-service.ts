import { BaseApiService } from '@/api/base-service'
import { ApiPaths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import toastService from '@/services/toast-service'
import { getChatApiBaseUrl } from '@/config/environment'
import { getStoredToken } from '@/utils/auth'
import type { EmployeeDropdown } from '@/features/employee/services/employee-service'

import type { GroupChannel, GroupChannelCreatePayload, GroupChannelUpdatePayload } from '../types'

// Types for pagination if needed
export type PaginatedGroupChannelList = {
  channels: GroupChannel[]
}

export type GetChatChannelsParams = Record<string, unknown>

export class ChatService extends BaseApiService {
  /**
   * Get all group channels
   */
  async getGroupChannels(params?: GetChatChannelsParams): Promise<PaginatedGroupChannelList> {
    const res = (await this.getPaginated(
      ApiPaths.chat_chat_channels_list as any,
      params
    )) as PaginatedGroupChannelList
    if (res && Array.isArray(res.channels)) {
      res.channels = res.channels.map((channel) => ({
        ...channel,
        owner_user_id: channel.owner_user_id ?? (channel as any).owner_id,
      }))
    }
    return res
  }

  /**
   * Create a new group channel
   */
  async createGroupChannel(data: GroupChannelCreatePayload): Promise<GroupChannel> {
    const channel = (await this.post(
      ApiPaths.chat_chat_channels_create as any,
      data as any
    )) as GroupChannel
    if (channel) {
      channel.owner_user_id = channel.owner_user_id ?? (channel as any).owner_id
    }
    return channel
  }

  /**
   * Update a group channel (write_policy, name, description)
   */
  async updateGroupChannel(id: string, data: GroupChannelUpdatePayload): Promise<GroupChannel> {
    const channel = (await this.patch(
      ApiPaths.chat_chat_channels_partial_update as any,
      data as any,
      {
        path: { id },
      }
    )) as GroupChannel
    if (channel) {
      channel.owner_user_id = channel.owner_user_id ?? (channel as any).owner_id
    }
    return channel
  }

  /**
   * Soft delete a group channel
   */
  async deleteGroupChannel(id: string): Promise<void> {
    return await this.delete(ApiPaths.chat_chat_channels_destroy as any, { path: { id } })
  }

  /**
   * Disable a group channel
   */
  async disableGroupChannel(id: string): Promise<void> {
    return (await this.post(ApiPaths.chat_chat_channels_disable_create as any, {} as any, {
      path: { id },
    })) as void
  }

  /**
   * Enable a group channel
   */
  async enableGroupChannel(id: string): Promise<void> {
    return (await this.post(ApiPaths.chat_chat_channels_enable_create as any, {} as any, {
      path: { id },
    })) as void
  }

  /**
   * Add group channel admin
   */
  async addGroupChannelAdmin(id: string, userId: number): Promise<void> {
    return (await this.post(
      ApiPaths.chat_chat_channels_admin_create as any,
      {
        user_id: userId,
      } as any,
      {
        path: { id },
      }
    )) as void
  }

  /**
   * Remove group channel admin
   */
  async removeGroupChannelAdmin(id: string, userId: number): Promise<void> {
    return (await this.delete(ApiPaths.chat_chat_channels_admin_destroy as any, {
      path: { id, user_id: String(userId) },
    })) as void
  }

  private profileBatchQueue: number[] = []
  private profileBatchPromises: {
    ids: number[]
    resolve: (value: any[]) => void
    reject: (err: any) => void
  }[] = []
  private profileBatchTimeout: NodeJS.Timeout | null = null

  /**
   * Bulk fetch user profiles (with auto-batching)
   */
  async getUserProfiles(ids: number[]): Promise<any[]> {
    if (ids.length === 0) return []

    return new Promise<any[]>((resolve, reject) => {
      // Queue unique IDs
      ids.forEach((id) => {
        if (!this.profileBatchQueue.includes(id)) {
          this.profileBatchQueue.push(id)
        }
      })
      this.profileBatchPromises.push({ ids, resolve, reject })

      if (this.profileBatchTimeout) {
        clearTimeout(this.profileBatchTimeout)
      }

      this.profileBatchTimeout = setTimeout(async () => {
        const queuedIds = [...this.profileBatchQueue]
        const pendingPromises = [...this.profileBatchPromises]

        // Reset queue
        this.profileBatchQueue = []
        this.profileBatchPromises = []
        this.profileBatchTimeout = null

        try {
          const chatBaseUrl = getChatApiBaseUrl()
          let results: any[] = []
          const chunkSize = 50

          for (let i = 0; i < queuedIds.length; i += chunkSize) {
            const chunk = queuedIds.slice(i, i + chunkSize)
            const response = await fetch(`${chatBaseUrl}/api/users/?ids=${chunk.join(',')}`, {
              headers: {
                Authorization: `Bearer ${getStoredToken()}`,
              },
            })

            if (!response.ok) {
              console.error(`Chat API error for chunk: ${response.statusText}`)
              continue // skip failed chunks but continue others
            }

            const data = await response.json()
            const chunkResults = (
              data && Array.isArray(data.users) ? data.users : Array.isArray(data) ? data : []
            ) as any[]
            results = [...results, ...chunkResults]
          }

          // Map results by user_id
          const resultMap = new Map<number, any>()
          const avatarFileIdsToLoad: number[] = []

          results.forEach((profile) => {
            if (profile) {
              const uId = profile.user_id || profile.id
              if (uId) {
                profile.user_id = uId
                profile.display_name =
                  profile.display_name || profile.fullname || profile.username || `User #${uId}`
                resultMap.set(uId, profile)
                if (profile.avatar_file_id && !profile.avatar_url) {
                  avatarFileIdsToLoad.push(profile.avatar_file_id)
                }
              }
            }
          })

          // Batch load avatar files metadata to get view_url if missing
          if (avatarFileIdsToLoad.length > 0) {
            try {
              const filesMetadata = await this.getFileMetadata(avatarFileIdsToLoad)
              const fileMap = new Map<number, any>()
              filesMetadata.forEach((f) => {
                if (f && f.id) fileMap.set(f.id, f)
              })

              results.forEach((profile) => {
                if (profile && profile.avatar_file_id) {
                  const fMeta = fileMap.get(profile.avatar_file_id)
                  if (fMeta) {
                    profile.avatar_url = fMeta.view_url || fMeta.download_url
                  }
                }
              })
            } catch (avatarError) {
              console.error('Failed to load avatar files metadata:', avatarError)
            }
          }

          // Resolve individual promises
          pendingPromises.forEach(({ ids: originalIds, resolve: res }) => {
            const resolvedProfiles = originalIds.map((id) => resultMap.get(id)).filter(Boolean)
            res(resolvedProfiles)
          })
        } catch (err) {
          pendingPromises.forEach(({ reject: rej }) => rej(err))
        }
      }, 50)
    })
  }

  private fileBatchQueue: number[] = []
  private fileBatchPromises: {
    ids: number[]
    resolve: (value: any[]) => void
    reject: (err: any) => void
  }[] = []
  private fileBatchTimeout: NodeJS.Timeout | null = null

  /**
   * Bulk fetch files metadata (with auto-batching)
   */
  async getFileMetadata(ids: number[]): Promise<any[]> {
    if (ids.length === 0) return []

    return new Promise<any[]>((resolve, reject) => {
      // Queue unique IDs
      ids.forEach((id) => {
        if (!this.fileBatchQueue.includes(id)) {
          this.fileBatchQueue.push(id)
        }
      })
      this.fileBatchPromises.push({ ids, resolve, reject })

      if (this.fileBatchTimeout) {
        clearTimeout(this.fileBatchTimeout)
      }

      this.fileBatchTimeout = setTimeout(async () => {
        const queuedIds = [...this.fileBatchQueue]
        const pendingPromises = [...this.fileBatchPromises]

        // Reset queue
        this.fileBatchQueue = []
        this.fileBatchPromises = []
        this.fileBatchTimeout = null

        try {
          const chatBaseUrl = getChatApiBaseUrl()
          const response = await fetch(`${chatBaseUrl}/api/files/?ids=${queuedIds.join(',')}`, {
            headers: {
              Authorization: `Bearer ${getStoredToken()}`,
            },
          })

          if (!response.ok) {
            throw new Error(`Chat API files error: ${response.statusText}`)
          }

          const data = await response.json()
          const results = Array.isArray(data) ? data : data.files || []

          // Map results by id
          const resultMap = new Map<number, any>()
          results.forEach((file: any) => {
            if (file && file.id) {
              resultMap.set(file.id, file)
            }
          })

          // Resolve individual promises
          pendingPromises.forEach(({ ids: originalIds, resolve: res }) => {
            const resolvedFiles = originalIds.map((id) => resultMap.get(id)).filter(Boolean)
            res(resolvedFiles)
          })
        } catch (err) {
          pendingPromises.forEach(({ reject: rej }) => rej(err))
        }
      }, 50)
    })
  }

  /**
   * Get signed URL download for a file
   */
  async getFileDownloadUrl(id: number): Promise<{ signed_url: string; mime_type: string }> {
    const chatBaseUrl = getChatApiBaseUrl()
    const response = await fetch(`${chatBaseUrl}/api/files/${id}/url/`, {
      headers: {
        Authorization: `Bearer ${getStoredToken()}`,
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to get file download URL: ${response.statusText}`)
    }
    return await response.json()
  }

  /**
   * Get channel members as employee dropdown list
   */
  async getChannelEmployeesDropdown(
    id: string,
    params?: { role?: string; page?: number; page_size?: number; search?: string }
  ): Promise<EmployeeDropdown[]> {
    const res = (await this.get(ApiPaths.chat_chat_channels_employees_dropdown_list as any, {
      query: params as any,
      path: { id },
    })) as any
    if (res && typeof res === 'object') {
      if (Array.isArray(res)) return res
      if (Array.isArray(res.results)) return res.results
      if (res.data) {
        if (Array.isArray(res.data)) return res.data
        if (Array.isArray(res.data.results)) return res.data.results
      }
    }
    return []
  }
}

export const chatService = new ChatService()

// ===== REACT QUERY HOOKS =====

export const useGetChatChannels = (params?: GetChatChannelsParams) => {
  return useApiQuery(QUERY_KEYS.CHAT.GROUP_CHANNELS.LIST(params || {}), () =>
    chatService.getGroupChannels(params)
  )
}

export const useGetUserProfiles = (ids: number[], options?: { enabled?: boolean }) => {
  return useApiQuery(
    ['chat', 'user-profiles', ids] as any,
    () => chatService.getUserProfiles(ids),
    {
      enabled: ids.length > 0 && options?.enabled !== false,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export const useCreateChatChannel = () => {
  return useApiMutation((data: GroupChannelCreatePayload) => chatService.createGroupChannel(data), {
    onSuccess: () => {
      toastService.success('Tạo nhóm chat thành công')
    },
  })
}

export const useUpdateChatChannel = () => {
  return useApiMutation(
    ({ id, data }: { id: string; data: GroupChannelUpdatePayload }) =>
      chatService.updateGroupChannel(id, data),
    {
      onSuccess: () => {
        toastService.success('Cập nhật nhóm chat thành công')
      },
    }
  )
}

export const useDeleteChatChannel = () => {
  return useApiMutation((id: string) => chatService.deleteGroupChannel(id), {
    onSuccess: () => {
      toastService.success('Xóa nhóm chat thành công')
    },
  })
}

export const useDisableChatChannel = () => {
  return useApiMutation((id: string) => chatService.disableGroupChannel(id), {
    onSuccess: () => {
      toastService.success('Tạm dừng nhóm chat thành công')
    },
  })
}

export const useEnableChatChannel = () => {
  return useApiMutation((id: string) => chatService.enableGroupChannel(id), {
    onSuccess: () => {
      toastService.success('Kích hoạt lại nhóm chat thành công')
    },
  })
}

export const useAddGroupChannelAdmin = () => {
  return useApiMutation(
    ({ id, userId }: { id: string; userId: number }) =>
      chatService.addGroupChannelAdmin(id, userId),
    {
      onSuccess: () => {
        toastService.success('Thêm quản trị viên thành công')
      },
    }
  )
}

export const useRemoveGroupChannelAdmin = () => {
  return useApiMutation(
    ({ id, userId }: { id: string; userId: number }) =>
      chatService.removeGroupChannelAdmin(id, userId),
    {
      onSuccess: () => {
        toastService.success('Gỡ quản trị viên thành công')
      },
    }
  )
}

export const useGetChannelEmployeesDropdown = (
  id: string,
  params?: { role?: string; page?: number; page_size?: number; search?: string },
  options?: { enabled?: boolean }
) => {
  return useApiQuery(
    ['chat', 'channel-employees-dropdown', id, params] as any,
    () => chatService.getChannelEmployeesDropdown(id, params),
    {
      enabled: !!id && options?.enabled !== false,
      staleTime: 1000 * 60 * 5,
    }
  )
}
