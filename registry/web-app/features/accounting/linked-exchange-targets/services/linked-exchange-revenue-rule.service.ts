import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useQueryClient } from '@tanstack/react-query'

export type LinkedExchangeRevenueRule = components['schemas']['LinkedExchangeRevenueRule']
export type LinkedExchangeRevenueRuleRequest =
  components['schemas']['LinkedExchangeRevenueRuleRequest']
export type PatchedLinkedExchangeRevenueRuleRequest =
  components['schemas']['PatchedLinkedExchangeRevenueRuleRequest']
export type GetLinkedExchangeRevenueRuleParams =
  paths['/api/accounting/linked-exchange-revenue-rules/']['get']['parameters']['query']

class LinkedExchangeRevenueRuleService extends BaseApiService {
  async getRules(params?: GetLinkedExchangeRevenueRuleParams) {
    return await this.getPaginated(ApiPaths.accounting_linked_exchange_revenue_rules_list, params)
  }

  async getRule(id: number) {
    return await this.get(ApiPaths.accounting_linked_exchange_revenue_rules_retrieve, {
      path: { id },
    })
  }

  async createRule(data: LinkedExchangeRevenueRuleRequest) {
    return await this.post(ApiPaths.accounting_linked_exchange_revenue_rules_create, data)
  }

  async updateRule(id: number, data: LinkedExchangeRevenueRuleRequest) {
    return await this.put(ApiPaths.accounting_linked_exchange_revenue_rules_update, data, {
      path: { id },
    })
  }

  async partialUpdateRule(id: number, data: PatchedLinkedExchangeRevenueRuleRequest) {
    return await this.patch(
      ApiPaths.accounting_linked_exchange_revenue_rules_partial_update,
      data,
      { path: { id } }
    )
  }

  async deleteRule(id: number) {
    return await this.delete(ApiPaths.accounting_linked_exchange_revenue_rules_destroy, {
      path: { id },
    })
  }

  async getHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_linked_exchange_revenue_rules_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_linked_exchange_revenue_rules_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: LinkedExchangeRevenueRuleService | null = null

export function getLinkedExchangeRevenueRuleService(): LinkedExchangeRevenueRuleService {
  if (!_service) _service = new LinkedExchangeRevenueRuleService()
  return _service
}

export const QUERY_KEYS_LINKED_EXCHANGE_REVENUE_RULES = {
  LIST: (params?: GetLinkedExchangeRevenueRuleParams) => [
    'linked_exchange_revenue_rules',
    JSON.stringify(params || {}),
  ],
  DETAIL: (id: number) => ['linked_exchange_revenue_rules', id],
  HISTORIES: (id: number) => ['linked_exchange_revenue_rules', id, 'histories'],
  HISTORY_DETAIL: (id: number, logId: string) => [
    'linked_exchange_revenue_rules',
    id,
    'history-detail',
    logId,
  ],
}

export function useLinkedExchangeRevenueRules(
  params?: GetLinkedExchangeRevenueRuleParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS_LINKED_EXCHANGE_REVENUE_RULES.LIST(params),
    () => getLinkedExchangeRevenueRuleService().getRules(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useLinkedExchangeRevenueRule(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS_LINKED_EXCHANGE_REVENUE_RULES.DETAIL(id),
    () => getLinkedExchangeRevenueRuleService().getRule(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useLinkedExchangeRevenueRuleHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS_LINKED_EXCHANGE_REVENUE_RULES.HISTORY_DETAIL(id, logId),
    () => getLinkedExchangeRevenueRuleService().getHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateLinkedExchangeRevenueRule() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (data: LinkedExchangeRevenueRuleRequest) =>
      getLinkedExchangeRevenueRuleService().createRule(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['linked_exchange_revenue_rules'] })
      },
    }
  )
}

export function useUpdateLinkedExchangeRevenueRule() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (data: { id: number; payload: LinkedExchangeRevenueRuleRequest }) =>
      getLinkedExchangeRevenueRuleService().updateRule(data.id, data.payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['linked_exchange_revenue_rules'] })
      },
    }
  )
}

export function useDeleteLinkedExchangeRevenueRule() {
  const queryClient = useQueryClient()
  return useApiMutation((id: number) => getLinkedExchangeRevenueRuleService().deleteRule(id), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked_exchange_revenue_rules'] })
    },
  })
}
