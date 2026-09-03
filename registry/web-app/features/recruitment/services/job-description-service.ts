import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useExport } from '@/hooks/useExport'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type JobDescription = components['schemas']['JobDescription']
export type JobDescriptionRequest = components['schemas']['JobDescriptionRequest']
export type PatchedJobDescriptionRequest = components['schemas']['PatchedJobDescriptionRequest']
export type PaginatedJobDescriptionList = components['schemas']['PaginatedJobDescriptionList']

export type GetJobDescriptionsParams =
  paths['/api/hrm/job-descriptions/']['get']['parameters']['query']
export type GetJobDescriptionsExportParams =
  paths['/api/hrm/job-descriptions/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class JobDescriptionService extends BaseApiService {
  async getJobDescriptions(params?: GetJobDescriptionsParams) {
    return await this.getPaginated(ApiPaths.hrm_job_descriptions_list, params)
  }

  async createJobDescription(jobDescriptionData: JobDescriptionRequest) {
    return await this.post(ApiPaths.hrm_job_descriptions_create, jobDescriptionData)
  }

  /**
   * Get job description by ID
   * NOTE: need to explicitly define the returned type
   */
  async getJobDescription(id: number) {
    return await this.get(ApiPaths.hrm_job_descriptions_retrieve, {
      path: { id: id },
    })
  }

  async updateJobDescription(id: number, jobDescriptionData: JobDescriptionRequest) {
    return await this.put(ApiPaths.hrm_job_descriptions_update, jobDescriptionData, {
      path: { id },
    })
  }

  async partialUpdateJobDescription(id: number, jobDescriptionData: PatchedJobDescriptionRequest) {
    return await this.patch(ApiPaths.hrm_job_descriptions_partial_update, jobDescriptionData, {
      path: { id },
    })
  }

  async deleteJobDescription(id: number) {
    return await this.delete(ApiPaths.hrm_job_descriptions_destroy, { path: { id } })
  }

  async exportJobDescriptions(params?: GetJobDescriptionsExportParams) {
    return await this.get(ApiPaths.hrm_job_descriptions_export_retrieve, {
      query: params,
    })
  }

  async getJobDescriptionHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_job_descriptions_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _jobDescriptionService: JobDescriptionService | null = null

export function getJobDescriptionService(): JobDescriptionService {
  if (!_jobDescriptionService) {
    _jobDescriptionService = new JobDescriptionService()
  }
  return _jobDescriptionService
}

// ===== REACT QUERY HOOKS =====
export function useJobDescriptions(
  params?: GetJobDescriptionsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.JOB_DESCRIPTIONS.LIST(params || {}),
    () => getJobDescriptionService().getJobDescriptions(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useJobDescription(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.JOB_DESCRIPTIONS.DETAIL(id),
    () => getJobDescriptionService().getJobDescription(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateJobDescription() {
  return useApiMutation((data: JobDescriptionRequest) =>
    getJobDescriptionService().createJobDescription(data)
  )
}

export function useUpdateJobDescription() {
  return useApiMutation(({ id, data }: { id: number; data: JobDescriptionRequest }) =>
    getJobDescriptionService().updateJobDescription(id, data)
  )
}

export function usePartialUpdateJobDescription() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedJobDescriptionRequest }) =>
    getJobDescriptionService().partialUpdateJobDescription(id, data)
  )
}

export function useDeleteJobDescription() {
  return useApiMutation((id: number) => getJobDescriptionService().deleteJobDescription(id))
}

export function useExportJobDescriptions() {
  return useExport({
    exportFunction: (params?: GetJobDescriptionsExportParams) =>
      getJobDescriptionService().exportJobDescriptions(params),
    defaultFilename: 'job-descriptions',
  })
}

// Alias for consistency
export const useJobDescriptionExport = useExportJobDescriptions
