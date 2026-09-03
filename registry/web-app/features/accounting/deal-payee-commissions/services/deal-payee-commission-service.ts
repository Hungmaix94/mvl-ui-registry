import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type DealPayeeCommission = components['schemas']['DealPayeeCommission']
export type HoldByAccountInputRequest = components['schemas']['_HoldByAccountInputRequest']
export type GetDealPayeeCommissionsParams =
  paths['/api/accounting/deal-payee-commissions/']['get']['parameters']['query']

class DealPayeeCommissionService extends BaseApiService {
  async getDealPayeeCommissions(params?: GetDealPayeeCommissionsParams) {
    return await this.getPaginated(ApiPaths.accounting_deal_payee_commissions_list, params)
  }

  async getDealPayeeCommission(id: number) {
    return await this.get(ApiPaths.accounting_deal_payee_commissions_retrieve, { path: { id } })
  }

  async holdDealPayeeCommission(id: number, data: HoldByAccountInputRequest) {
    return await this.post(ApiPaths.accounting_deal_payee_commissions_hold_create, data, {
      path: { id },
    })
  }

  async recomputeDealPayeeCommission(id: number) {
    return await this.post(ApiPaths.accounting_deal_payee_commissions_recompute_create, undefined, {
      path: { id },
    })
  }

  async getDealPayeeCommissionHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_deal_payee_commissions_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getDealPayeeCommissionHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_deal_payee_commissions_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: DealPayeeCommissionService | null = null

export function getDealPayeeCommissionService(): DealPayeeCommissionService {
  if (!_service) _service = new DealPayeeCommissionService()
  return _service
}

export function useDealPayeeCommissions(
  params?: GetDealPayeeCommissionsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEAL_PAYEE_COMMISSIONS.LIST(params || {}),
    () => getDealPayeeCommissionService().getDealPayeeCommissions(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useDealPayeeCommission(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEAL_PAYEE_COMMISSIONS.DETAIL(id),
    () => getDealPayeeCommissionService().getDealPayeeCommission(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useHoldDealPayeeCommission() {
  return useApiMutation((variables: { id: number; data: HoldByAccountInputRequest }) =>
    getDealPayeeCommissionService().holdDealPayeeCommission(variables.id, variables.data)
  )
}

export function useRecomputeDealPayeeCommission() {
  return useApiMutation((id: number) =>
    getDealPayeeCommissionService().recomputeDealPayeeCommission(id)
  )
}

export function useDealPayeeCommissionHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEAL_PAYEE_COMMISSIONS.HISTORIES(id, params || {}),
    () => getDealPayeeCommissionService().getDealPayeeCommissionHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDealPayeeCommissionHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEAL_PAYEE_COMMISSIONS.HISTORY_DETAIL(id, logId),
    () => getDealPayeeCommissionService().getDealPayeeCommissionHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
