import { BaseApiService } from '@/api/base-service'
import { ApiPaths, type paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

import type {
  ManagerDecisionRequest,
  PatchedContractEvaluationRequest,
} from './contract-evaluation-hr-service'

// ===== TYPE DEFINITIONS =====
export type GetContractEvaluationsManagerParams =
  paths['/api/hrm/contract-evaluations/manager/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class ContractEvaluationManagerService extends BaseApiService {
  async getContractEvaluationsManager(params?: GetContractEvaluationsManagerParams) {
    return await this.getPaginated(ApiPaths.hrm_contract_evaluations_manager_list, params)
  }

  async getContractEvaluationManager(id: number) {
    return await this.get(ApiPaths.hrm_contract_evaluations_manager_retrieve, {
      path: { id },
    })
  }

  async partialUpdateContractEvaluationManager(id: number, data: PatchedContractEvaluationRequest) {
    return await this.patch(ApiPaths.hrm_contract_evaluations_manager_partial_update, data, {
      path: { id },
    })
  }

  async decideContractEvaluationManager(id: number, data: ManagerDecisionRequest) {
    return await this.post(ApiPaths.hrm_contract_evaluations_manager_decision_create, data, {
      path: { id },
    })
  }

  async getContractEvaluationManagerHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_contract_evaluations_manager_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getContractEvaluationManagerHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_contract_evaluations_manager_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _contractEvaluationManagerService: ContractEvaluationManagerService | null = null

export function getContractEvaluationManagerService(): ContractEvaluationManagerService {
  if (!_contractEvaluationManagerService) {
    _contractEvaluationManagerService = new ContractEvaluationManagerService()
  }
  return _contractEvaluationManagerService
}

// ===== REACT QUERY HOOKS =====
export function useContractEvaluationsManager(
  params?: GetContractEvaluationsManagerParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATIONS_MANAGER.LIST(params || {}),
    () => getContractEvaluationManagerService().getContractEvaluationsManager(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useContractEvaluationManager(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATIONS_MANAGER.DETAIL(id),
    () => getContractEvaluationManagerService().getContractEvaluationManager(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function usePartialUpdateContractEvaluationManager() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedContractEvaluationRequest }) =>
    getContractEvaluationManagerService().partialUpdateContractEvaluationManager(id, data)
  )
}

export function useDecideContractEvaluationManager() {
  return useApiMutation(({ id, data }: { id: number; data: ManagerDecisionRequest }) =>
    getContractEvaluationManagerService().decideContractEvaluationManager(id, data)
  )
}

export function useContractEvaluationManagerHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATIONS_MANAGER.HISTORIES(id, params || {}),
    () => getContractEvaluationManagerService().getContractEvaluationManagerHistories(id, params),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useContractEvaluationManagerHistoryDetail(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATIONS_MANAGER.HISTORY_DETAIL(id, logId),
    () =>
      getContractEvaluationManagerService().getContractEvaluationManagerHistoryDetail(id, logId),
    { enabled: !!id && !!logId, staleTime: 1000 * 60 * 5 }
  )
}
