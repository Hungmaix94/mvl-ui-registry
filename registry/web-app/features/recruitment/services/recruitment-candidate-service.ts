import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams, ImportStartRequest } from '@/types/hrm-types'
import { type EmployeeCodeType } from '@/constants/api-schema-aliases'

// ===== TYPE DEFINITIONS =====
export type RecruitmentCandidate = components['schemas']['RecruitmentCandidate']
export type RecruitmentCandidateRequest = components['schemas']['RecruitmentCandidateRequest']
export type PatchedRecruitmentCandidateRequest =
  components['schemas']['PatchedRecruitmentCandidateRequest']
export type PaginatedRecruitmentCandidateList =
  components['schemas']['PaginatedRecruitmentCandidateList']

export type RecruitmentCandidateContactLog = components['schemas']['RecruitmentCandidateContactLog']
export type RecruitmentCandidateContactLogRequest =
  components['schemas']['RecruitmentCandidateContactLogRequest']
export type PatchedRecruitmentCandidateContactLogRequest =
  components['schemas']['PatchedRecruitmentCandidateContactLogRequest']
export type PaginatedRecruitmentCandidateContactLogList =
  components['schemas']['PaginatedRecruitmentCandidateContactLogList']

export type UpdateReferrerRequest = components['schemas']['PatchedUpdateReferrerRequest']

export type PolicyProposal = components['schemas']['PolicyProposal']
export type CheckDuplicateInputRequest = components['schemas']['CheckDuplicateInputRequest']
export type CheckDuplicateResponse = components['schemas']['CheckDuplicateResponse']
export type CreateFromEmployeeRequest = components['schemas']['CreateFromEmployeeRequest']
export type RecruitmentCandidateAvatarRequest =
  components['schemas']['RecruitmentCandidateAvatarRequest']

export type GetRecruitmentCandidatesParams =
  paths['/api/hrm/recruitment-candidates/']['get']['parameters']['query']
export type GetRecruitmentCandidatesExportParams =
  paths['/api/hrm/recruitment-candidates/export/']['get']['parameters']['query']
export type GetRecruitmentCandidateImportTemplateParams =
  paths['/api/hrm/recruitment-candidates/import_template/']['get']['parameters']['query']
export type GetRecruitmentCandidateContactLogsParams =
  paths['/api/hrm/recruitment-candidate-contact-logs/']['get']['parameters']['query']

export type RecruitmentCandidateDropdown = Pick<
  RecruitmentCandidate,
  | 'id'
  | 'code'
  | 'name'
  | 'citizen_id'
  | 'email'
  | 'phone'
  | 'date_of_birth'
  | 'gender'
  | 'place_of_birth'
  | 'citizen_id_issued_date'
  | 'citizen_id_issued_place'
  | 'emergency_contact_phone'
  | 'ethnicity'
  | 'religion'
  | 'marital_status'
  | 'tax_code'
  | 'residential_address'
  | 'permanent_address'
  | 'branch'
  | 'block'
  | 'department'
  | 'citizen_id_files'
> & {
  nationality_id?: number | null
  citizen_id_files_ids?: number[]
}

// ===== SERVICE CLASS =====
export class RecruitmentCandidateService extends BaseApiService {
  // ===== CANDIDATES =====
  async getRecruitmentCandidates(params?: GetRecruitmentCandidatesParams) {
    return await this.getPaginated(ApiPaths.hrm_recruitment_candidates_list, params)
  }

  async getRecruitmentCandidateImportTemplate(
    params?: GetRecruitmentCandidateImportTemplateParams
  ) {
    return await this.get(ApiPaths.hrm_recruitment_candidates_import_template_retrieve, {
      query: params,
    })
  }

  async startRecruitmentCandidateImport(data: ImportStartRequest) {
    return await this.post(ApiPaths.hrm_recruitment_candidates_import_create, data)
  }

  async createRecruitmentCandidate(candidateData: RecruitmentCandidateRequest) {
    return await this.post(ApiPaths.hrm_recruitment_candidates_create, candidateData)
  }

  async exportRecruitmentCandidates(params?: GetRecruitmentCandidatesExportParams) {
    return await this.get(ApiPaths.hrm_recruitment_candidates_export_retrieve, {
      query: params,
    })
  }

  async getRecruitmentCandidate(id: number) {
    return await this.get(ApiPaths.hrm_recruitment_candidates_retrieve, {
      path: { id: id },
    })
  }

  async updateRecruitmentCandidate(id: number, candidateData: RecruitmentCandidateRequest) {
    return await this.put(ApiPaths.hrm_recruitment_candidates_update, candidateData, {
      path: { id },
    })
  }

  async partialUpdateRecruitmentCandidate(
    id: number,
    candidateData: PatchedRecruitmentCandidateRequest
  ) {
    return await this.patch(ApiPaths.hrm_recruitment_candidates_partial_update, candidateData, {
      path: { id },
    })
  }

  async deleteRecruitmentCandidate(id: number) {
    return await this.delete(ApiPaths.hrm_recruitment_candidates_destroy, { path: { id } })
  }

  async updateRecruitmentCandidateReferrer(id: number, referrerData: UpdateReferrerRequest) {
    return await this.patch(
      ApiPaths.hrm_recruitment_candidates_update_referrer_partial_update,
      referrerData,
      { path: { id } }
    )
  }

  async convertCandidateToEmployee(
    id: number,
    requestData: { code_type?: EmployeeCodeType | null }
  ) {
    return await this.post(ApiPaths.hrm_recruitment_candidates_to_employee_create, requestData, {
      path: { id },
    })
  }

  async getRecruitmentCandidateHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_recruitment_candidates_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getRecruitmentCandidatePolicyProposal(id: number) {
    return await this.get(ApiPaths.hrm_recruitment_candidates_policy_proposal_retrieve, {
      path: { id },
    })
  }

  async checkRecruitmentCandidateDuplicate(data: CheckDuplicateInputRequest) {
    return await this.post(ApiPaths.hrm_recruitment_candidates_check_duplicate_create, data)
  }

  async createRecruitmentCandidateFromEmployee(data: CreateFromEmployeeRequest) {
    return await this.post(ApiPaths.hrm_recruitment_candidates_create_from_employee_create, data)
  }

  async updateRecruitmentCandidateAvatar(id: number, data: RecruitmentCandidateAvatarRequest) {
    return await this.post(ApiPaths.hrm_recruitment_candidates_update_avatar_create, data, {
      path: { id },
    })
  }

  // ===== CONTACT LOGS =====
  async getRecruitmentCandidateContactLogs(params?: GetRecruitmentCandidateContactLogsParams) {
    return await this.getPaginated(ApiPaths.hrm_recruitment_candidate_contact_logs_list, params)
  }

  async createRecruitmentCandidateContactLog(
    contactLogData: RecruitmentCandidateContactLogRequest
  ) {
    return await this.post(ApiPaths.hrm_recruitment_candidate_contact_logs_create, contactLogData)
  }

  async getRecruitmentCandidateContactLog(id: number) {
    return await this.get(ApiPaths.hrm_recruitment_candidate_contact_logs_retrieve, {
      path: { id: id },
    })
  }

  async updateRecruitmentCandidateContactLog(
    id: number,
    contactLogData: RecruitmentCandidateContactLogRequest
  ) {
    return await this.put(ApiPaths.hrm_recruitment_candidate_contact_logs_update, contactLogData, {
      path: { id },
    })
  }

  async partialUpdateRecruitmentCandidateContactLog(
    id: number,
    contactLogData: PatchedRecruitmentCandidateContactLogRequest
  ) {
    return await this.patch(
      ApiPaths.hrm_recruitment_candidate_contact_logs_partial_update,
      contactLogData,
      { path: { id } }
    )
  }

  async deleteRecruitmentCandidateContactLog(id: number) {
    return await this.delete(ApiPaths.hrm_recruitment_candidate_contact_logs_destroy, {
      path: { id },
    })
  }

  async getRecruitmentCandidateContactLogHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_recruitment_candidate_contact_logs_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getRecruitmentCandidateContactLogHistory(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_recruitment_candidate_contact_logs_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _recruitmentCandidateService: RecruitmentCandidateService | null = null

export function getRecruitmentCandidateService(): RecruitmentCandidateService {
  if (!_recruitmentCandidateService) {
    _recruitmentCandidateService = new RecruitmentCandidateService()
  }
  return _recruitmentCandidateService
}

// ===== REACT QUERY HOOKS =====
// ===== CANDIDATES HOOKS =====
export function useRecruitmentCandidates(params?: GetRecruitmentCandidatesParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_CANDIDATES.LIST(params || {}),
    () => getRecruitmentCandidateService().getRecruitmentCandidates(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useRecruitmentCandidate(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_CANDIDATES.DETAIL(id),
    () => getRecruitmentCandidateService().getRecruitmentCandidate(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateRecruitmentCandidate() {
  return useApiMutation((data: RecruitmentCandidateRequest) =>
    getRecruitmentCandidateService().createRecruitmentCandidate(data)
  )
}

export function useUpdateRecruitmentCandidate() {
  return useApiMutation(({ id, data }: { id: number; data: RecruitmentCandidateRequest }) =>
    getRecruitmentCandidateService().updateRecruitmentCandidate(id, data)
  )
}

export function usePartialUpdateRecruitmentCandidate() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedRecruitmentCandidateRequest }) =>
    getRecruitmentCandidateService().partialUpdateRecruitmentCandidate(id, data)
  )
}

export function useDeleteRecruitmentCandidate() {
  return useApiMutation((id: number) =>
    getRecruitmentCandidateService().deleteRecruitmentCandidate(id)
  )
}

export function useUpdateRecruitmentCandidateReferrer() {
  return useApiMutation(({ id, data }: { id: number; data: UpdateReferrerRequest }) =>
    getRecruitmentCandidateService().updateRecruitmentCandidateReferrer(id, data)
  )
}

export function useRecruitmentCandidateImportTemplate(
  params?: GetRecruitmentCandidateImportTemplateParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_CANDIDATES.IMPORT_TEMPLATE(params || {}),
    () => getRecruitmentCandidateService().getRecruitmentCandidateImportTemplate(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStartRecruitmentCandidateImport() {
  return useApiMutation((data: ImportStartRequest) =>
    getRecruitmentCandidateService().startRecruitmentCandidateImport(data)
  )
}

export function useExportRecruitmentCandidates() {
  return useApiMutation((params?: GetRecruitmentCandidatesExportParams) =>
    getRecruitmentCandidateService().exportRecruitmentCandidates(params)
  )
}

export function useConvertCandidateToEmployee() {
  return useApiMutation(
    ({ id, requestData }: { id: number; requestData: { code_type?: EmployeeCodeType | null } }) =>
      getRecruitmentCandidateService().convertCandidateToEmployee(id, requestData)
  )
}

export function useRecruitmentCandidatePolicyProposal(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_CANDIDATES.POLICY_PROPOSAL(id),
    () => getRecruitmentCandidateService().getRecruitmentCandidatePolicyProposal(id),
    {
      staleTime: 1000 * 60 * 5,
      enabled: (options?.enabled ?? true) && !!id,
    }
  )
}

export function useCheckRecruitmentCandidateDuplicate() {
  return useApiMutation<CheckDuplicateResponse, Error, CheckDuplicateInputRequest>(
    (data: CheckDuplicateInputRequest) =>
      getRecruitmentCandidateService().checkRecruitmentCandidateDuplicate(data)
  )
}

/** Same as check duplicate but does not toast on error and does not invalidate all queries on success (for blur validation). */
export function useCheckRecruitmentCandidateDuplicateQuiet() {
  return useApiMutation<CheckDuplicateResponse, Error, CheckDuplicateInputRequest>(
    (data: CheckDuplicateInputRequest) =>
      getRecruitmentCandidateService().checkRecruitmentCandidateDuplicate(data),
    { showErrorToast: false, skipInvalidateOnSuccess: true }
  )
}

export function useCreateRecruitmentCandidateFromEmployee() {
  return useApiMutation((data: CreateFromEmployeeRequest) =>
    getRecruitmentCandidateService().createRecruitmentCandidateFromEmployee(data)
  )
}

export function useUpdateRecruitmentCandidateAvatar() {
  return useApiMutation(({ id, data }: { id: number; data: RecruitmentCandidateAvatarRequest }) =>
    getRecruitmentCandidateService().updateRecruitmentCandidateAvatar(id, data)
  )
}

// ===== CONTACT LOGS HOOKS =====
export function useRecruitmentCandidateContactLogs(
  params?: GetRecruitmentCandidateContactLogsParams
) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_CANDIDATE_CONTACT_LOGS.LIST(params || {}),
    () => getRecruitmentCandidateService().getRecruitmentCandidateContactLogs(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: !!params?.recruitment_candidate,
    }
  )
}

export function useRecruitmentCandidateContactLog(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_CANDIDATE_CONTACT_LOGS.DETAIL(id),
    () => getRecruitmentCandidateService().getRecruitmentCandidateContactLog(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateRecruitmentCandidateContactLog() {
  return useApiMutation((data: RecruitmentCandidateContactLogRequest) =>
    getRecruitmentCandidateService().createRecruitmentCandidateContactLog(data)
  )
}

export function useUpdateRecruitmentCandidateContactLog() {
  return useApiMutation(
    ({ id, data }: { id: number; data: RecruitmentCandidateContactLogRequest }) =>
      getRecruitmentCandidateService().updateRecruitmentCandidateContactLog(id, data)
  )
}

export function usePartialUpdateRecruitmentCandidateContactLog() {
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedRecruitmentCandidateContactLogRequest }) =>
      getRecruitmentCandidateService().partialUpdateRecruitmentCandidateContactLog(id, data)
  )
}

export function useDeleteRecruitmentCandidateContactLog() {
  return useApiMutation((id: number) =>
    getRecruitmentCandidateService().deleteRecruitmentCandidateContactLog(id)
  )
}

export function useRecruitmentCandidateContactLogHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_CANDIDATE_CONTACT_LOGS.HISTORIES(id, params || {}),
    () => getRecruitmentCandidateService().getRecruitmentCandidateContactLogHistories(id, params),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useRecruitmentCandidateContactLogHistory(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.HRM.RECRUITMENT_CANDIDATE_CONTACT_LOGS.HISTORY_DETAIL(id, logId),
    () => getRecruitmentCandidateService().getRecruitmentCandidateContactLogHistory(id, logId),
    { enabled: !!id && !!logId, staleTime: 1000 * 60 * 5 }
  )
}
