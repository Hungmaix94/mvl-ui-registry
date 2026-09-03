import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type RecruitmentSource = components['schemas']['RecruitmentSource']
export type RecruitmentSourceRequest = components['schemas']['RecruitmentSourceRequest']
export type PatchedRecruitmentSourceRequest =
  components['schemas']['PatchedRecruitmentSourceRequest']
export type PaginatedRecruitmentSourceList = components['schemas']['PaginatedRecruitmentSourceList']

export type GetRecruitmentSourcesParams =
  paths['/api/hrm/recruitment-sources/']['get']['parameters']['query']
export type RecruitmentSourceDropdown = components['schemas']['RecruitmentSourceDropdown']
export type PaginatedRecruitmentSourceDropdownList =
  components['schemas']['PaginatedRecruitmentSourceDropdownList']
export type GetRecruitmentSourcesDropdownParams =
  paths['/api/hrm/recruitment-sources/dropdown/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class RecruitmentSourceService extends BaseApiService {
  async getRecruitmentSources(
    params?: GetRecruitmentSourcesParams
  ): Promise<PaginatedRecruitmentSourceList> {
    return await this.getPaginated(ApiPaths.hrm_recruitment_sources_list, params)
  }

  async createRecruitmentSource(sourceData: RecruitmentSourceRequest) {
    return await this.post(ApiPaths.hrm_recruitment_sources_create, sourceData)
  }

  async getRecruitmentSource(id: number) {
    return await this.get(ApiPaths.hrm_recruitment_sources_retrieve, {
      path: { id: id },
    })
  }

  async updateRecruitmentSource(id: number, sourceData: RecruitmentSourceRequest) {
    return await this.put(ApiPaths.hrm_recruitment_sources_update, sourceData, { path: { id } })
  }

  async partialUpdateRecruitmentSource(id: number, sourceData: PatchedRecruitmentSourceRequest) {
    return await this.patch(ApiPaths.hrm_recruitment_sources_partial_update, sourceData, {
      path: { id },
    })
  }

  async deleteRecruitmentSource(id: number) {
    return await this.delete(ApiPaths.hrm_recruitment_sources_destroy, { path: { id } })
  }

  async getRecruitmentSourceHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_recruitment_sources_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getRecruitmentSourcesDropdown(params?: GetRecruitmentSourcesDropdownParams) {
    return await this.getPaginated(ApiPaths.hrm_recruitment_sources_dropdown_list, params)
  }
}

// ===== SERVICE SINGLETON =====
let _recruitmentSourceService: RecruitmentSourceService | null = null

export function getRecruitmentSourceService(): RecruitmentSourceService {
  if (!_recruitmentSourceService) {
    _recruitmentSourceService = new RecruitmentSourceService()
  }
  return _recruitmentSourceService
}

// ===== REACT QUERY HOOKS =====
export function useRecruitmentSources(
  params?: GetRecruitmentSourcesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_SOURCES.LIST(params || {}),
    () => getRecruitmentSourceService().getRecruitmentSources(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled !== false,
    }
  )
}

export function useRecruitmentSource(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_SOURCES.DETAIL(id),
    () => getRecruitmentSourceService().getRecruitmentSource(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateRecruitmentSource() {
  return useApiMutation((data: RecruitmentSourceRequest) =>
    getRecruitmentSourceService().createRecruitmentSource(data)
  )
}

export function useUpdateRecruitmentSource() {
  return useApiMutation(({ id, data }: { id: number; data: RecruitmentSourceRequest }) =>
    getRecruitmentSourceService().updateRecruitmentSource(id, data)
  )
}

export function usePartialUpdateRecruitmentSource() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedRecruitmentSourceRequest }) =>
    getRecruitmentSourceService().partialUpdateRecruitmentSource(id, data)
  )
}

export function useDeleteRecruitmentSource() {
  return useApiMutation((id: number) => getRecruitmentSourceService().deleteRecruitmentSource(id))
}

export function useRecruitmentSourcesDropdown(
  params?: GetRecruitmentSourcesDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_SOURCES.DROPDOWN(params || {}),
    () => getRecruitmentSourceService().getRecruitmentSourcesDropdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled !== false,
    }
  )
}
