import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema.ts'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { QUERY_KEYS } from '@/constants/query-keys'

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type CollaboratorContract = components['schemas']['CollaboratorContract']
export type CollaboratorContractList = components['schemas']['CollaboratorContractList']
export type CollaboratorContractRequest = components['schemas']['CollaboratorContractRequest']
export type PatchedCollaboratorContractRequest =
  components['schemas']['PatchedCollaboratorContractRequest']

export type GetCollaboratorContractsParams =
  paths['/api/sales/collaborator-contracts/']['get']['parameters']['query']

// ----------------------------------------------------------------------

class CollaboratorContractService extends BaseApiService {
  async getCollaboratorContracts(params?: GetCollaboratorContractsParams) {
    return await this.getPaginated(ApiPaths.sales_collaborator_contracts_list, params)
  }

  async getCollaboratorContract(id: number) {
    return await this.get(ApiPaths.sales_collaborator_contracts_retrieve, { path: { id } })
  }

  async createCollaboratorContract(data: CollaboratorContractRequest) {
    return await this.post(ApiPaths.sales_collaborator_contracts_create, data)
  }

  async updateCollaboratorContract(id: number, data: CollaboratorContractRequest) {
    return await this.put(ApiPaths.sales_collaborator_contracts_update, data, { path: { id } })
  }

  async partialUpdateCollaboratorContract(id: number, data: PatchedCollaboratorContractRequest) {
    return await this.patch(ApiPaths.sales_collaborator_contracts_partial_update, data, {
      path: { id },
    })
  }

  async deleteCollaboratorContract(id: number) {
    return await this.delete(ApiPaths.sales_collaborator_contracts_destroy, { path: { id } })
  }

  async getCollaboratorContractHistories(id: number) {
    return await this.get(ApiPaths.sales_collaborator_contracts_histories_retrieve, {
      path: { id: String(id) },
    })
  }

  async getCollaboratorContractHistoryDetail(id: number, logId: number) {
    return await this.get(ApiPaths.sales_collaborator_contracts_history_retrieve, {
      path: { id: String(id), log_id: String(logId) },
    })
  }
}

let _service: CollaboratorContractService | null = null

export function getCollaboratorContractService(): CollaboratorContractService {
  if (!_service) _service = new CollaboratorContractService()
  return _service
}

// ----------------------------------------------------------------------
// Hooks
// ----------------------------------------------------------------------

export function useCollaboratorContracts(
  params?: GetCollaboratorContractsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.COLLABORATOR_CONTRACTS.LIST(params || {}),
    () => getCollaboratorContractService().getCollaboratorContracts(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCollaboratorContract(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.COLLABORATOR_CONTRACTS.DETAIL(id),
    () => getCollaboratorContractService().getCollaboratorContract(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCollaboratorContractHistories(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.COLLABORATOR_CONTRACTS.HISTORIES(id, {}),
    () => getCollaboratorContractService().getCollaboratorContractHistories(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCollaboratorContractHistoryDetail(
  id: number,
  logId: number,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.COLLABORATOR_CONTRACTS.HISTORIES(id, {}), 'detail', logId],
    () => getCollaboratorContractService().getCollaboratorContractHistoryDetail(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateCollaboratorContract() {
  return useApiMutation((data: CollaboratorContractRequest) =>
    getCollaboratorContractService().createCollaboratorContract(data)
  )
}

export function useUpdateCollaboratorContract() {
  return useApiMutation((variables: { id: number; data: CollaboratorContractRequest }) =>
    getCollaboratorContractService().updateCollaboratorContract(variables.id, variables.data)
  )
}

export function usePartialUpdateCollaboratorContract() {
  return useApiMutation((variables: { id: number; data: PatchedCollaboratorContractRequest }) =>
    getCollaboratorContractService().partialUpdateCollaboratorContract(variables.id, variables.data)
  )
}

export function useDeleteCollaboratorContract() {
  return useApiMutation((id: number) =>
    getCollaboratorContractService().deleteCollaboratorContract(id)
  )
}
