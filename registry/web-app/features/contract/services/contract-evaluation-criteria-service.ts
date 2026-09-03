import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type ContractEvaluationCriterion = components['schemas']['ContractEvaluationCriterion']
export type ContractEvaluationCriterionDropdown =
  components['schemas']['ContractEvaluationCriterionDropdown']
export type PaginatedContractEvaluationCriterionList =
  components['schemas']['PaginatedContractEvaluationCriterionList']

export type GetContractEvaluationCriteriaParams =
  paths['/api/hrm/contract-evaluation-criteria/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class ContractEvaluationCriteriaService extends BaseApiService {
  async getContractEvaluationCriteria(params?: GetContractEvaluationCriteriaParams) {
    return await this.getPaginated(ApiPaths.hrm_contract_evaluation_criteria_list, params)
  }

  async getContractEvaluationCriterion(id: number) {
    return await this.get(ApiPaths.hrm_contract_evaluation_criteria_retrieve, {
      path: { id },
    })
  }

  async getContractEvaluationCriteriaDropdown() {
    return await this.get(ApiPaths.hrm_contract_evaluation_criteria_dropdown_retrieve)
  }

  async getContractEvaluationCriterionHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_contract_evaluation_criteria_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getContractEvaluationCriterionHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_contract_evaluation_criteria_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _contractEvaluationCriteriaService: ContractEvaluationCriteriaService | null = null

export function getContractEvaluationCriteriaService(): ContractEvaluationCriteriaService {
  if (!_contractEvaluationCriteriaService) {
    _contractEvaluationCriteriaService = new ContractEvaluationCriteriaService()
  }
  return _contractEvaluationCriteriaService
}

// ===== REACT QUERY HOOKS =====
export function useContractEvaluationCriteria(
  params?: GetContractEvaluationCriteriaParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATION_CRITERIA.LIST(params || {}),
    () => getContractEvaluationCriteriaService().getContractEvaluationCriteria(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useContractEvaluationCriterion(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATION_CRITERIA.DETAIL(id),
    () => getContractEvaluationCriteriaService().getContractEvaluationCriterion(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useContractEvaluationCriteriaDropdown(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATION_CRITERIA.DROPDOWN(),
    () => getContractEvaluationCriteriaService().getContractEvaluationCriteriaDropdown(),
    {
      staleTime: 1000 * 60 * 10,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useContractEvaluationCriterionHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATION_CRITERIA.HISTORIES(id, params || {}),
    () =>
      getContractEvaluationCriteriaService().getContractEvaluationCriterionHistories(id, params),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useContractEvaluationCriterionHistoryDetail(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATION_CRITERIA.HISTORY_DETAIL(id, logId),
    () =>
      getContractEvaluationCriteriaService().getContractEvaluationCriterionHistoryDetail(id, logId),
    {
      enabled: !!id && !!logId,
      staleTime: 1000 * 60 * 5,
    }
  )
}
