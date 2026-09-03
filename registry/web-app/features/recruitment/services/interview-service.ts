import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
// Interview Schedules
export type InterviewSchedule = components['schemas']['InterviewSchedule']
export type InterviewScheduleRequest = components['schemas']['InterviewScheduleRequest']
export type PatchedInterviewScheduleRequest =
  components['schemas']['PatchedInterviewScheduleRequest']
export type PaginatedInterviewScheduleList = components['schemas']['PaginatedInterviewScheduleList']
export type InterviewScheduleEmployeeNested =
  components['schemas']['InterviewScheduleEmployeeNested']
export type UpdateInterviewersRequest = components['schemas']['UpdateInterviewersRequest']

// Interview Candidates
export type InterviewCandidate = components['schemas']['InterviewCandidate']
export type InterviewCandidateRequest = components['schemas']['InterviewCandidateRequest']
export type PatchedInterviewCandidateRequest =
  components['schemas']['PatchedInterviewCandidateRequest']
export type PaginatedInterviewCandidateList =
  components['schemas']['PaginatedInterviewCandidateList']

// Interview invite types
export type InterviewInvitePreviewResponse =
  paths['/api/hrm/interview-schedules/{id}/interview_invite/preview/']['post']['responses']['200']['content']['application/json']['data']
export type InterviewInviteSendResponse =
  paths['/api/hrm/interview-schedules/{id}/interview_invite/send/']['post']['responses']['202']['content']['application/json']['data']

export type InterviewInvitePreviewRequest =
  paths['/api/hrm/interview-schedules/{id}/interview_invite/preview/']['post']['requestBody'] extends {
    content: { 'application/json': infer T }
  }
    ? T
    : never
export type InterviewInviteSendRequest =
  paths['/api/hrm/interview-schedules/{id}/interview_invite/send/']['post']['requestBody'] extends {
    content: { 'application/json': infer T }
  }
    ? T
    : never

// Params types
export type GetInterviewSchedulesParams =
  paths['/api/hrm/interview-schedules/']['get']['parameters']['query']
export type GetInterviewScheduleExportParams =
  paths['/api/hrm/interview-schedules/export/']['get']['parameters']['query']
export type GetInterviewCandidatesParams =
  paths['/api/hrm/interview-candidates/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class InterviewService extends BaseApiService {
  // ===== INTERVIEW SCHEDULES =====
  async getInterviewSchedules(params?: GetInterviewSchedulesParams) {
    return await this.getPaginated(ApiPaths.hrm_interview_schedules_list, params)
  }

  async createInterviewSchedule(scheduleData: InterviewScheduleRequest) {
    return await this.post(ApiPaths.hrm_interview_schedules_create, scheduleData)
  }

  async getInterviewSchedule(id: number) {
    return await this.get(ApiPaths.hrm_interview_schedules_retrieve, {
      path: { id: id },
    })
  }

  async updateInterviewSchedule(id: number, scheduleData: InterviewScheduleRequest) {
    return await this.put(ApiPaths.hrm_interview_schedules_update, scheduleData, { path: { id } })
  }

  async partialUpdateInterviewSchedule(id: number, scheduleData: PatchedInterviewScheduleRequest) {
    return await this.patch(ApiPaths.hrm_interview_schedules_partial_update, scheduleData, {
      path: { id },
    })
  }

  async deleteInterviewSchedule(id: number) {
    return await this.delete(ApiPaths.hrm_interview_schedules_destroy, { path: { id } })
  }

  async updateInterviewScheduleInterviewers(id: number, data: UpdateInterviewersRequest) {
    return await this.post(ApiPaths.hrm_interview_schedules_update_interviewers_create, data, {
      path: { id },
    })
  }

  async exportInterviewSchedules(params?: GetInterviewScheduleExportParams) {
    return await this.get(ApiPaths.hrm_interview_schedules_export_retrieve, {
      query: params,
    })
  }

  async previewInterviewInvite(id: number, data?: InterviewInvitePreviewRequest) {
    return await this.post(
      ApiPaths.hrm_interview_schedules_interview_invite_preview_create,
      data || {},
      { path: { id } }
    )
  }

  async sendInterviewInvite(id: number, data?: InterviewInviteSendRequest) {
    return await this.post(
      ApiPaths.hrm_interview_schedules_interview_invite_send_create,
      data || {},
      { path: { id } }
    )
  }

  async getInterviewScheduleHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_interview_schedules_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  // ===== INTERVIEW CANDIDATES =====
  async getInterviewCandidates(params?: GetInterviewCandidatesParams) {
    return await this.getPaginated(ApiPaths.hrm_interview_candidates_list, params)
  }

  async createInterviewCandidate(candidateData: InterviewCandidateRequest) {
    return await this.post(ApiPaths.hrm_interview_candidates_create, candidateData)
  }

  async getInterviewCandidate(id: number) {
    return await this.get(ApiPaths.hrm_interview_candidates_retrieve, {
      path: { id: id },
    })
  }

  async updateInterviewCandidate(id: number, candidateData: InterviewCandidateRequest) {
    return await this.put(ApiPaths.hrm_interview_candidates_update, candidateData, {
      path: { id },
    })
  }

  async partialUpdateInterviewCandidate(
    id: number,
    candidateData: PatchedInterviewCandidateRequest
  ) {
    return await this.patch(ApiPaths.hrm_interview_candidates_partial_update, candidateData, {
      path: { id },
    })
  }

  async deleteInterviewCandidate(id: number) {
    return await this.delete(ApiPaths.hrm_interview_candidates_destroy, { path: { id } })
  }

  async getInterviewCandidateHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_interview_candidates_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getInterviewCandidateHistory(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_interview_candidates_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _interviewService: InterviewService | null = null

export function getInterviewService(): InterviewService {
  if (!_interviewService) {
    _interviewService = new InterviewService()
  }
  return _interviewService
}

// ===== REACT QUERY HOOKS =====
// ===== INTERVIEW SCHEDULES HOOKS =====
export function useInterviewSchedules(
  params?: GetInterviewSchedulesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.INTERVIEW_SCHEDULES.LIST(params || {}),
    () => getInterviewService().getInterviewSchedules(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useInterviewSchedule(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.INTERVIEW_SCHEDULES.DETAIL(id),
    () => getInterviewService().getInterviewSchedule(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateInterviewSchedule() {
  return useApiMutation((data: InterviewScheduleRequest) =>
    getInterviewService().createInterviewSchedule(data)
  )
}

export function useUpdateInterviewSchedule() {
  return useApiMutation(({ id, data }: { id: number; data: InterviewScheduleRequest }) =>
    getInterviewService().updateInterviewSchedule(id, data)
  )
}

export function usePartialUpdateInterviewSchedule() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedInterviewScheduleRequest }) =>
    getInterviewService().partialUpdateInterviewSchedule(id, data)
  )
}

export function useDeleteInterviewSchedule() {
  return useApiMutation((id: number) => getInterviewService().deleteInterviewSchedule(id))
}

export function useUpdateInterviewScheduleInterviewers() {
  return useApiMutation(({ id, data }: { id: number; data: UpdateInterviewersRequest }) =>
    getInterviewService().updateInterviewScheduleInterviewers(id, data)
  )
}

export function useExportInterviewSchedules() {
  return useApiMutation((params?: GetInterviewScheduleExportParams) =>
    getInterviewService().exportInterviewSchedules(params)
  )
}

export function usePreviewInterviewInvite() {
  return useApiMutation(({ id, data }: { id: number; data?: InterviewInvitePreviewRequest }) =>
    getInterviewService().previewInterviewInvite(id, data)
  )
}

export function useSendInterviewInvite() {
  return useApiMutation(({ id, data }: { id: number; data?: InterviewInviteSendRequest }) =>
    getInterviewService().sendInterviewInvite(id, data)
  )
}

// ===== INTERVIEW CANDIDATES HOOKS =====
export function useInterviewCandidates(
  params?: GetInterviewCandidatesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.INTERVIEW_CANDIDATES.LIST(params || {}),
    () => getInterviewService().getInterviewCandidates(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useInterviewCandidate(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.INTERVIEW_CANDIDATES.DETAIL(id),
    () => getInterviewService().getInterviewCandidate(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateInterviewCandidate() {
  return useApiMutation((data: InterviewCandidateRequest) =>
    getInterviewService().createInterviewCandidate(data)
  )
}

export function useUpdateInterviewCandidate() {
  return useApiMutation(({ id, data }: { id: number; data: InterviewCandidateRequest }) =>
    getInterviewService().updateInterviewCandidate(id, data)
  )
}

export function usePartialUpdateInterviewCandidate() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedInterviewCandidateRequest }) =>
    getInterviewService().partialUpdateInterviewCandidate(id, data)
  )
}

export function useDeleteInterviewCandidate() {
  return useApiMutation((id: number) => getInterviewService().deleteInterviewCandidate(id))
}

export function useInterviewCandidateHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.INTERVIEW_CANDIDATES.HISTORIES(id, params || {}),
    () => getInterviewService().getInterviewCandidateHistories(id, params),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useInterviewCandidateHistory(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.HRM.INTERVIEW_CANDIDATES.HISTORY_DETAIL(id, logId),
    () => getInterviewService().getInterviewCandidateHistory(id, logId),
    { enabled: !!id && !!logId, staleTime: 1000 * 60 * 5 }
  )
}
