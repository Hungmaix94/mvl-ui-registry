import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type Decision = components['schemas']['Decision']
export type DecisionRequest = components['schemas']['DecisionRequest']
export type PatchedDecisionRequest = components['schemas']['PatchedDecisionRequest']
export type PaginatedDecisionList = components['schemas']['PaginatedDecisionList']

export type GetDecisionsParams = paths['/api/hrm/decisions/']['get']['parameters']['query']
export type GetDecisionsExportParams =
  paths['/api/hrm/decisions/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class DecisionService extends BaseApiService {
  async getDecisions(params?: GetDecisionsParams) {
    return await this.getPaginated(ApiPaths.hrm_decisions_list, params)
  }

  async createDecision(decisionData: DecisionRequest) {
    return await this.post(ApiPaths.hrm_decisions_create, decisionData)
  }

  async getDecision(id: number) {
    return await this.get(ApiPaths.hrm_decisions_retrieve, { path: { id } })
  }

  async updateDecision(id: number, decisionData: DecisionRequest) {
    return await this.put(ApiPaths.hrm_decisions_update, decisionData, { path: { id } })
  }

  async partialUpdateDecision(id: number, decisionData: PatchedDecisionRequest) {
    return await this.patch(ApiPaths.hrm_decisions_partial_update, decisionData, { path: { id } })
  }

  async deleteDecision(id: number) {
    return await this.delete(ApiPaths.hrm_decisions_destroy, { path: { id } })
  }

  async getDecisionHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_decisions_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getDecisionHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_decisions_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async exportDecisions(params?: GetDecisionsExportParams) {
    return await this.get(ApiPaths.hrm_decisions_export_retrieve, { query: params })
  }
}

// ===== SERVICE SINGLETON =====
let _decisionService: DecisionService | null = null

export function getDecisionService(): DecisionService {
  if (!_decisionService) {
    _decisionService = new DecisionService()
  }
  return _decisionService
}

// ===== REACT QUERY HOOKS =====
export function useDecisions(params?: GetDecisionsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.DECISIONS.LIST(params || {}),
    () => getDecisionService().getDecisions(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useDecision(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.DECISIONS.DETAIL(id),
    () => getDecisionService().getDecision(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateDecision() {
  return useApiMutation((data: DecisionRequest) => getDecisionService().createDecision(data))
}

export function useUpdateDecision() {
  return useApiMutation(({ id, data }: { id: number; data: DecisionRequest }) =>
    getDecisionService().updateDecision(id, data)
  )
}

export function usePartialUpdateDecision() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedDecisionRequest }) =>
    getDecisionService().partialUpdateDecision(id, data)
  )
}

export function useDeleteDecision() {
  return useApiMutation((id: number) => getDecisionService().deleteDecision(id))
}

export function useExportDecisions() {
  return useApiMutation((params?: GetDecisionsExportParams) =>
    getDecisionService().exportDecisions(params)
  )
}
