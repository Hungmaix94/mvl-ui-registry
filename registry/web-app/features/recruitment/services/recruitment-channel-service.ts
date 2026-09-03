import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type RecruitmentChannel = components['schemas']['RecruitmentChannel']
export type RecruitmentChannelRequest = components['schemas']['RecruitmentChannelRequest']
export type PatchedRecruitmentChannelRequest =
  components['schemas']['PatchedRecruitmentChannelRequest']
export type PaginatedRecruitmentChannelList =
  components['schemas']['PaginatedRecruitmentChannelList']

export type GetRecruitmentChannelsParams =
  paths['/api/hrm/recruitment-channels/']['get']['parameters']['query']
export type RecruitmentChannelDropdown = components['schemas']['RecruitmentChannelDropdown']
export type PaginatedRecruitmentChannelDropdownList =
  components['schemas']['PaginatedRecruitmentChannelDropdownList']
export type GetRecruitmentChannelsDropdownParams =
  paths['/api/hrm/recruitment-channels/dropdown/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class RecruitmentChannelService extends BaseApiService {
  async getRecruitmentChannels(
    params?: GetRecruitmentChannelsParams
  ): Promise<PaginatedRecruitmentChannelList> {
    return await this.getPaginated(ApiPaths.hrm_recruitment_channels_list, params)
  }

  async createRecruitmentChannel(channelData: RecruitmentChannelRequest) {
    return await this.post(ApiPaths.hrm_recruitment_channels_create, channelData)
  }

  async getRecruitmentChannel(id: number) {
    return await this.get(ApiPaths.hrm_recruitment_channels_retrieve, {
      path: { id: id },
    })
  }

  async updateRecruitmentChannel(id: number, channelData: RecruitmentChannelRequest) {
    return await this.put(ApiPaths.hrm_recruitment_channels_update, channelData, { path: { id } })
  }

  async partialUpdateRecruitmentChannel(id: number, channelData: PatchedRecruitmentChannelRequest) {
    return await this.patch(ApiPaths.hrm_recruitment_channels_partial_update, channelData, {
      path: { id },
    })
  }

  async deleteRecruitmentChannel(id: number) {
    return await this.delete(ApiPaths.hrm_recruitment_channels_destroy, { path: { id } })
  }

  async getRecruitmentChannelHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_recruitment_channels_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getRecruitmentChannelsDropdown(params?: GetRecruitmentChannelsDropdownParams) {
    return await this.getPaginated(ApiPaths.hrm_recruitment_channels_dropdown_list, params)
  }
}

// ===== SERVICE SINGLETON =====
let _recruitmentChannelService: RecruitmentChannelService | null = null

export function getRecruitmentChannelService(): RecruitmentChannelService {
  if (!_recruitmentChannelService) {
    _recruitmentChannelService = new RecruitmentChannelService()
  }
  return _recruitmentChannelService
}

// ===== REACT QUERY HOOKS =====
export function useRecruitmentChannels(
  params?: GetRecruitmentChannelsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_CHANNELS.LIST(params || {}),
    () => getRecruitmentChannelService().getRecruitmentChannels(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled !== false,
    }
  )
}

export function useRecruitmentChannel(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_CHANNELS.DETAIL(id),
    () => getRecruitmentChannelService().getRecruitmentChannel(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateRecruitmentChannel() {
  return useApiMutation((data: RecruitmentChannelRequest) =>
    getRecruitmentChannelService().createRecruitmentChannel(data)
  )
}

export function useUpdateRecruitmentChannel() {
  return useApiMutation(({ id, data }: { id: number; data: RecruitmentChannelRequest }) =>
    getRecruitmentChannelService().updateRecruitmentChannel(id, data)
  )
}

export function usePartialUpdateRecruitmentChannel() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedRecruitmentChannelRequest }) =>
    getRecruitmentChannelService().partialUpdateRecruitmentChannel(id, data)
  )
}

export function useDeleteRecruitmentChannel() {
  return useApiMutation((id: number) => getRecruitmentChannelService().deleteRecruitmentChannel(id))
}

export function useRecruitmentChannelsDropdown(
  params?: GetRecruitmentChannelsDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_CHANNELS.DROPDOWN(params || {}),
    () => getRecruitmentChannelService().getRecruitmentChannelsDropdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled !== false,
    }
  )
}
