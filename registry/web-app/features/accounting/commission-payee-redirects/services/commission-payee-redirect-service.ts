import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type CommissionPayeeRedirect = components['schemas']['CommissionPayeeRedirect']
export type CommissionPayeeRedirectRequest = components['schemas']['CommissionPayeeRedirectRequest']
export type PatchedCommissionPayeeRedirectRequest =
  components['schemas']['PatchedCommissionPayeeRedirectRequest']
export type GetCommissionPayeeRedirectsParams =
  paths['/api/accounting/commission-payee-redirects/']['get']['parameters']['query']

class CommissionPayeeRedirectService extends BaseApiService {
  async getCommissionPayeeRedirects(params?: GetCommissionPayeeRedirectsParams) {
    return await this.getPaginated(ApiPaths.accounting_commission_payee_redirects_list, params)
  }

  async createCommissionPayeeRedirect(data: CommissionPayeeRedirectRequest) {
    return await this.post(ApiPaths.accounting_commission_payee_redirects_create, data)
  }

  async getCommissionPayeeRedirect(id: number) {
    return await this.get(ApiPaths.accounting_commission_payee_redirects_retrieve, { path: { id } })
  }

  async updateCommissionPayeeRedirect(id: number, data: CommissionPayeeRedirectRequest) {
    return await this.put(ApiPaths.accounting_commission_payee_redirects_update, data, {
      path: { id },
    })
  }

  async partialUpdateCommissionPayeeRedirect(
    id: number,
    data: PatchedCommissionPayeeRedirectRequest
  ) {
    return await this.patch(ApiPaths.accounting_commission_payee_redirects_partial_update, data, {
      path: { id },
    })
  }

  async deleteCommissionPayeeRedirect(id: number) {
    return await this.delete(ApiPaths.accounting_commission_payee_redirects_destroy, {
      path: { id },
    })
  }

  async cancelCommissionPayeeRedirect(id: number, data: { reason?: string }) {
    return await this.post(ApiPaths.accounting_commission_payee_redirects_cancel_create, data, {
      path: { id },
    })
  }

  async activateCommissionPayeeRedirect(id: number) {
    // Dedicated action — the generated schema types this endpoint with no request body.
    return await this.post(
      ApiPaths.accounting_commission_payee_redirects_activate_create,
      undefined as never,
      { path: { id } }
    )
  }

  async getCommissionPayeeRedirectHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_commission_payee_redirects_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getCommissionPayeeRedirectHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_commission_payee_redirects_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: CommissionPayeeRedirectService | null = null

export function getCommissionPayeeRedirectService(): CommissionPayeeRedirectService {
  if (!_service) _service = new CommissionPayeeRedirectService()
  return _service
}

export function useCommissionPayeeRedirects(
  params?: GetCommissionPayeeRedirectsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_PAYEE_REDIRECTS.LIST(params || {}),
    () => getCommissionPayeeRedirectService().getCommissionPayeeRedirects(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionPayeeRedirect(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_PAYEE_REDIRECTS.DETAIL(id),
    () => getCommissionPayeeRedirectService().getCommissionPayeeRedirect(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateCommissionPayeeRedirect() {
  return useApiMutation((data: CommissionPayeeRedirectRequest) =>
    getCommissionPayeeRedirectService().createCommissionPayeeRedirect(data)
  )
}

export function useUpdateCommissionPayeeRedirect() {
  return useApiMutation((variables: { id: number; data: CommissionPayeeRedirectRequest }) =>
    getCommissionPayeeRedirectService().updateCommissionPayeeRedirect(variables.id, variables.data)
  )
}

export function usePartialUpdateCommissionPayeeRedirect() {
  return useApiMutation((variables: { id: number; data: PatchedCommissionPayeeRedirectRequest }) =>
    getCommissionPayeeRedirectService().partialUpdateCommissionPayeeRedirect(
      variables.id,
      variables.data
    )
  )
}

export function useDeleteCommissionPayeeRedirect() {
  return useApiMutation((id: number) =>
    getCommissionPayeeRedirectService().deleteCommissionPayeeRedirect(id)
  )
}

export function useCancelCommissionPayeeRedirect() {
  return useApiMutation((variables: { id: number; data: { reason?: string } }) =>
    getCommissionPayeeRedirectService().cancelCommissionPayeeRedirect(variables.id, variables.data)
  )
}

export function useActivateCommissionPayeeRedirect() {
  return useApiMutation((id: number) =>
    getCommissionPayeeRedirectService().activateCommissionPayeeRedirect(id)
  )
}

export function useCommissionPayeeRedirectHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_PAYEE_REDIRECTS.HISTORIES(id, params || {}),
    () => getCommissionPayeeRedirectService().getCommissionPayeeRedirectHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionPayeeRedirectHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_PAYEE_REDIRECTS.HISTORY_DETAIL(id, logId),
    () => getCommissionPayeeRedirectService().getCommissionPayeeRedirectHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
