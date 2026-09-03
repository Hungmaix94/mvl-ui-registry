import { BaseApiService } from '@/api/base-service'
import { ApiPaths, type components, type paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type ContractEvaluation = components['schemas']['ContractEvaluation']
export type ContractEvaluationList = components['schemas']['ContractEvaluationList']
export type ContractEvaluationDropdown = components['schemas']['ContractEvaluationDropdown']
export type PatchedContractEvaluationRequest =
  components['schemas']['PatchedContractEvaluationRequest']
export type PaginatedContractEvaluationListList =
  components['schemas']['PaginatedContractEvaluationListList']

// Per-action request bodies (v2). This service is the shared type hub — the manager
// service imports `ManagerDecisionRequest` + `PatchedContractEvaluationRequest` from here.
export type ManagerDecisionRequest = components['schemas']['ManagerDecisionRequest']
export type HrDecisionRequest = components['schemas']['HrDecisionRequest']
export type ReassignApproverRequest = components['schemas']['ReassignApproverRequest']
export type HrRevokeRequest = components['schemas']['HrRevokeRequest']
export type ForceCreateRequest = components['schemas']['ForceCreateRequest']

export type GetContractEvaluationsHrParams =
  paths['/api/hrm/contract-evaluations/hr/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class ContractEvaluationHrService extends BaseApiService {
  async getContractEvaluationsHr(params?: GetContractEvaluationsHrParams) {
    return await this.getPaginated(ApiPaths.hrm_contract_evaluations_hr_list, params)
  }

  async getContractEvaluationHr(id: number) {
    return await this.get(ApiPaths.hrm_contract_evaluations_hr_retrieve, {
      path: { id },
    })
  }

  async partialUpdateContractEvaluationHr(id: number, data: PatchedContractEvaluationRequest) {
    return await this.patch(ApiPaths.hrm_contract_evaluations_hr_partial_update, data, {
      path: { id },
    })
  }

  async decideContractEvaluationHr(id: number, data: HrDecisionRequest) {
    return await this.post(ApiPaths.hrm_contract_evaluations_hr_decision_create, data, {
      path: { id },
    })
  }

  async reassignApproverContractEvaluationHr(id: number, data: ReassignApproverRequest) {
    return await this.post(ApiPaths.hrm_contract_evaluations_hr_reassign_approver_create, data, {
      path: { id },
    })
  }

  async revokeApprovalContractEvaluationHr(id: number, data: HrRevokeRequest) {
    return await this.post(ApiPaths.hrm_contract_evaluations_hr_revoke_approval_create, data, {
      path: { id },
    })
  }

  async forceCreateContractEvaluationHr(data: ForceCreateRequest) {
    return await this.post(ApiPaths.hrm_contract_evaluations_hr_force_create_create, data)
  }

  async getContractEvaluationHrDropdown() {
    return await this.get(ApiPaths.hrm_contract_evaluations_hr_dropdown_retrieve)
  }

  async getContractEvaluationHrHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_contract_evaluations_hr_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getContractEvaluationHrHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_contract_evaluations_hr_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _contractEvaluationHrService: ContractEvaluationHrService | null = null

export function getContractEvaluationHrService(): ContractEvaluationHrService {
  if (!_contractEvaluationHrService) {
    _contractEvaluationHrService = new ContractEvaluationHrService()
  }
  return _contractEvaluationHrService
}

// ===== REACT QUERY HOOKS =====
export function useContractEvaluationsHr(
  params?: GetContractEvaluationsHrParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATIONS_HR.LIST(params || {}),
    () => getContractEvaluationHrService().getContractEvaluationsHr(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useContractEvaluationHr(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATIONS_HR.DETAIL(id),
    () => getContractEvaluationHrService().getContractEvaluationHr(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useContractEvaluationHrDropdown(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATIONS_HR.DROPDOWN(),
    () => getContractEvaluationHrService().getContractEvaluationHrDropdown(),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function usePartialUpdateContractEvaluationHr() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedContractEvaluationRequest }) =>
    getContractEvaluationHrService().partialUpdateContractEvaluationHr(id, data)
  )
}

export function useDecideContractEvaluationHr() {
  return useApiMutation(({ id, data }: { id: number; data: HrDecisionRequest }) =>
    getContractEvaluationHrService().decideContractEvaluationHr(id, data)
  )
}

export function useReassignApproverContractEvaluationHr() {
  return useApiMutation(({ id, data }: { id: number; data: ReassignApproverRequest }) =>
    getContractEvaluationHrService().reassignApproverContractEvaluationHr(id, data)
  )
}

export function useRevokeApprovalContractEvaluationHr() {
  return useApiMutation(({ id, data }: { id: number; data: HrRevokeRequest }) =>
    getContractEvaluationHrService().revokeApprovalContractEvaluationHr(id, data)
  )
}

export function useForceCreateContractEvaluationHr() {
  return useApiMutation((data: ForceCreateRequest) =>
    getContractEvaluationHrService().forceCreateContractEvaluationHr(data)
  )
}

export function useContractEvaluationHrHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATIONS_HR.HISTORIES(id, params || {}),
    () => getContractEvaluationHrService().getContractEvaluationHrHistories(id, params),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useContractEvaluationHrHistoryDetail(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.HRM.CONTRACT_EVALUATIONS_HR.HISTORY_DETAIL(id, logId),
    () => getContractEvaluationHrService().getContractEvaluationHrHistoryDetail(id, logId),
    { enabled: !!id && !!logId, staleTime: 1000 * 60 * 5 }
  )
}
