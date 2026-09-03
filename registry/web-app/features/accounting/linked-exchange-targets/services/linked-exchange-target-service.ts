import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type LinkedExchangeTargetConfig = components['schemas']['LinkedExchangeTargetConfig']
export type LinkedExchangeTargetConfigRequest =
  components['schemas']['LinkedExchangeTargetConfigRequest']
export type PatchedLinkedExchangeTargetConfigRequest =
  components['schemas']['PatchedLinkedExchangeTargetConfigRequest']
export type GetLinkedExchangeTargetsParams =
  paths['/api/accounting/linked-exchange-targets/']['get']['parameters']['query']
export type LinkedExchangeTargetComputeRequest =
  components['schemas']['LinkedExchangeTargetComputeRequestRequest']
export type LinkedExchangeTargetComputeResult =
  components['schemas']['LinkedExchangeTargetComputeResult']

class LinkedExchangeTargetService extends BaseApiService {
  async getLinkedExchangeTargets(params?: GetLinkedExchangeTargetsParams) {
    return await this.getPaginated(ApiPaths.accounting_linked_exchange_targets_list, params)
  }

  async createLinkedExchangeTarget(data: LinkedExchangeTargetConfigRequest) {
    return await this.post(ApiPaths.accounting_linked_exchange_targets_create, data)
  }

  async getLinkedExchangeTarget(id: number) {
    return await this.get(ApiPaths.accounting_linked_exchange_targets_retrieve, { path: { id } })
  }

  async updateLinkedExchangeTarget(id: number, data: LinkedExchangeTargetConfigRequest) {
    return await this.put(ApiPaths.accounting_linked_exchange_targets_update, data, {
      path: { id },
    })
  }

  async partialUpdateLinkedExchangeTarget(
    id: number,
    data: PatchedLinkedExchangeTargetConfigRequest
  ) {
    return await this.patch(ApiPaths.accounting_linked_exchange_targets_partial_update, data, {
      path: { id },
    })
  }

  async deleteLinkedExchangeTarget(id: number) {
    return await this.delete(ApiPaths.accounting_linked_exchange_targets_destroy, { path: { id } })
  }

  async getLinkedExchangeTargetHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_linked_exchange_targets_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getLinkedExchangeTargetHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_linked_exchange_targets_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async computeLinkedExchangeTarget(data: LinkedExchangeTargetComputeRequest) {
    return await this.post(ApiPaths.accounting_linked_exchange_targets_compute_create, data)
  }

  async confirmLinkedExchangeTarget(id: number) {
    return await this.post(ApiPaths.accounting_linked_exchange_targets_confirm_create, {} as any, {
      path: { id },
    })
  }
}

let _service: LinkedExchangeTargetService | null = null

export function getLinkedExchangeTargetService(): LinkedExchangeTargetService {
  if (!_service) _service = new LinkedExchangeTargetService()
  return _service
}

export function useLinkedExchangeTargets(
  params?: GetLinkedExchangeTargetsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_TARGETS.LIST(params || {}),
    () => getLinkedExchangeTargetService().getLinkedExchangeTargets(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useLinkedExchangeTarget(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_TARGETS.DETAIL(id),
    () => getLinkedExchangeTargetService().getLinkedExchangeTarget(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateLinkedExchangeTarget() {
  return useApiMutation((data: LinkedExchangeTargetConfigRequest) =>
    getLinkedExchangeTargetService().createLinkedExchangeTarget(data)
  )
}

export function useUpdateLinkedExchangeTarget() {
  return useApiMutation((variables: { id: number; data: LinkedExchangeTargetConfigRequest }) =>
    getLinkedExchangeTargetService().updateLinkedExchangeTarget(variables.id, variables.data)
  )
}

export function usePartialUpdateLinkedExchangeTarget() {
  return useApiMutation(
    (variables: { id: number; data: PatchedLinkedExchangeTargetConfigRequest }) =>
      getLinkedExchangeTargetService().partialUpdateLinkedExchangeTarget(
        variables.id,
        variables.data
      )
  )
}

export function useDeleteLinkedExchangeTarget() {
  return useApiMutation((id: number) =>
    getLinkedExchangeTargetService().deleteLinkedExchangeTarget(id)
  )
}

export function useLinkedExchangeTargetHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_TARGETS.HISTORIES(id, params || {}),
    () => getLinkedExchangeTargetService().getLinkedExchangeTargetHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useLinkedExchangeTargetHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_TARGETS.HISTORY_DETAIL(id, logId),
    () => getLinkedExchangeTargetService().getLinkedExchangeTargetHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useComputeLinkedExchangeTarget() {
  return useApiMutation((data: LinkedExchangeTargetComputeRequest) =>
    getLinkedExchangeTargetService().computeLinkedExchangeTarget(data)
  )
}

export function useConfirmLinkedExchangeTarget() {
  return useApiMutation((id: number) =>
    getLinkedExchangeTargetService().confirmLinkedExchangeTarget(id)
  )
}
