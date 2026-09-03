import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams, ImportStartRequest } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type RecruitmentRequest = components['schemas']['RecruitmentRequest']
export type RecruitmentRequestRequest = components['schemas']['RecruitmentRequestRequest']
export type PatchedRecruitmentRequestRequest =
  components['schemas']['PatchedRecruitmentRequestRequest']
export type PaginatedRecruitmentRequestList =
  components['schemas']['PaginatedRecruitmentRequestList']

export type GetRecruitmentRequestsParams =
  paths['/api/hrm/recruitment-requests/']['get']['parameters']['query']
export type RecruitmentRequestDropdown = components['schemas']['RecruitmentRequestDropdown']
export type PaginatedRecruitmentRequestDropdownList =
  components['schemas']['PaginatedRecruitmentRequestDropdownList']
export type GetRecruitmentRequestsDropdownParams =
  paths['/api/hrm/recruitment-requests/dropdown/']['get']['parameters']['query']
export type GetRecruitmentRequestExportDocumentParams =
  paths['/api/hrm/recruitment-requests/{id}/export-document/']['get']['parameters']['query']
export type GetRecruitmentRequestImportTemplateParams =
  paths['/api/hrm/recruitment-requests/import_template/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class RecruitmentRequestService extends BaseApiService {
  async getRecruitmentRequests(params?: GetRecruitmentRequestsParams) {
    return await this.getPaginated(ApiPaths.hrm_recruitment_requests_list, params)
  }

  async createRecruitmentRequest(requestData: RecruitmentRequestRequest) {
    return await this.post(ApiPaths.hrm_recruitment_requests_create, requestData)
  }

  async getRecruitmentRequest(id: number) {
    return await this.get(ApiPaths.hrm_recruitment_requests_retrieve, {
      path: { id: id },
    })
  }

  async updateRecruitmentRequest(id: number, requestData: RecruitmentRequestRequest) {
    return await this.put(ApiPaths.hrm_recruitment_requests_update, requestData, { path: { id } })
  }

  async partialUpdateRecruitmentRequest(id: number, requestData: PatchedRecruitmentRequestRequest) {
    return await this.patch(ApiPaths.hrm_recruitment_requests_partial_update, requestData, {
      path: { id },
    })
  }

  async deleteRecruitmentRequest(id: number) {
    return await this.delete(ApiPaths.hrm_recruitment_requests_destroy, { path: { id } })
  }

  async exportRecruitmentRequestDocument(
    id: number,
    params?: GetRecruitmentRequestExportDocumentParams
  ) {
    return await this.get(ApiPaths.hrm_recruitment_requests_export_document_retrieve, {
      path: { id: id },
      query: params,
    })
  }

  async getRecruitmentRequestHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_recruitment_requests_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getRecruitmentRequestsDropdown(params?: GetRecruitmentRequestsDropdownParams) {
    return await this.getPaginated(ApiPaths.hrm_recruitment_requests_dropdown_list, params)
  }

  async getRecruitmentRequestImportTemplate(params?: GetRecruitmentRequestImportTemplateParams) {
    return await this.get(ApiPaths.hrm_recruitment_requests_import_template_retrieve, {
      query: params,
    })
  }

  async startRecruitmentRequestImport(data: ImportStartRequest) {
    return await this.post(ApiPaths.hrm_recruitment_requests_import_create, data)
  }
}

// ===== SERVICE SINGLETON =====
let _recruitmentRequestService: RecruitmentRequestService | null = null

export function getRecruitmentRequestService(): RecruitmentRequestService {
  if (!_recruitmentRequestService) {
    _recruitmentRequestService = new RecruitmentRequestService()
  }
  return _recruitmentRequestService
}

// ===== REACT QUERY HOOKS =====
export function useRecruitmentRequests(
  params?: GetRecruitmentRequestsParams & { search?: string }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_REQUESTS.LIST(params || {}),
    () => getRecruitmentRequestService().getRecruitmentRequests(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useRecruitmentRequest(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_REQUESTS.DETAIL(id),
    () => getRecruitmentRequestService().getRecruitmentRequest(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateRecruitmentRequest() {
  return useApiMutation((data: RecruitmentRequestRequest) =>
    getRecruitmentRequestService().createRecruitmentRequest(data)
  )
}

export function useUpdateRecruitmentRequest() {
  return useApiMutation(({ id, data }: { id: number; data: RecruitmentRequestRequest }) =>
    getRecruitmentRequestService().updateRecruitmentRequest(id, data)
  )
}

export function usePartialUpdateRecruitmentRequest() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedRecruitmentRequestRequest }) =>
    getRecruitmentRequestService().partialUpdateRecruitmentRequest(id, data)
  )
}

export function useDeleteRecruitmentRequest() {
  return useApiMutation((id: number) => getRecruitmentRequestService().deleteRecruitmentRequest(id))
}

export function useExportRecruitmentRequestDocument() {
  return useApiMutation(
    ({ id, params }: { id: number; params?: GetRecruitmentRequestExportDocumentParams }) =>
      getRecruitmentRequestService().exportRecruitmentRequestDocument(id, params)
  )
}

export function useRecruitmentRequestsDropdown(
  params?: GetRecruitmentRequestsDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_REQUESTS.DROPDOWN(params || {}),
    () => getRecruitmentRequestService().getRecruitmentRequestsDropdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled !== false,
    }
  )
}

export function useRecruitmentRequestImportTemplate(
  params?: GetRecruitmentRequestImportTemplateParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_REQUESTS.IMPORT_TEMPLATE(),
    () => getRecruitmentRequestService().getRecruitmentRequestImportTemplate(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStartRecruitmentRequestImport() {
  return useApiMutation(
    (data: ImportStartRequest) =>
      getRecruitmentRequestService().startRecruitmentRequestImport(data),
    { skipInvalidateOnSuccess: true }
  )
}
