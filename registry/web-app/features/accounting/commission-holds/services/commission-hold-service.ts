import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type CommissionHold = components['schemas']['CommissionHold']
export type CommissionHoldRequest = components['schemas']['CommissionHoldRequest']
export type PatchedCommissionHoldRequest = components['schemas']['PatchedCommissionHoldRequest']
export type GetCommissionHoldsParams =
  paths['/api/accounting/commission-holds/']['get']['parameters']['query']
export type CommissionHoldAutoGenerateRequest =
  components['schemas']['CommissionHoldAutoGenerateRequestRequest']
export type CommissionHoldAutoGenerateResult =
  components['schemas']['CommissionHoldAutoGenerateResult']
export type BulkHoldByPayeeRequest = components['schemas']['_BulkHoldByPayeeRequest']

// GET /commission-holds/grouped/ — một dòng cho mỗi (beneficiary, kỳ hoa hồng).
// Các *_amount chỉ cộng hold ACTIVE; 5 bucket cộng lại = total_hold_amount.
export type CommissionHoldGroup = components['schemas']['CommissionHoldGroup']
export type CommissionHoldGroupListResponse =
  components['schemas']['PaginatedCommissionHoldGroupList']

class CommissionHoldService extends BaseApiService {
  async getCommissionHolds(params?: GetCommissionHoldsParams) {
    return await this.getPaginated(ApiPaths.accounting_commission_holds_list, params)
  }

  async getCommissionHoldsGrouped(params?: GetCommissionHoldsParams) {
    // Cùng bộ filter/search/pagination với list phẳng.
    return await this.getPaginated(ApiPaths.accounting_commission_holds_grouped_list, params)
  }

  async createCommissionHold(data: CommissionHoldRequest) {
    return await this.post(ApiPaths.accounting_commission_holds_create, data)
  }

  async getCommissionHold(id: number) {
    return await this.get(ApiPaths.accounting_commission_holds_retrieve, { path: { id } })
  }

  async updateCommissionHold(id: number, data: CommissionHoldRequest) {
    return await this.put(ApiPaths.accounting_commission_holds_update, data, { path: { id } })
  }

  async partialUpdateCommissionHold(id: number, data: PatchedCommissionHoldRequest) {
    return await this.patch(ApiPaths.accounting_commission_holds_partial_update, data, {
      path: { id },
    })
  }

  async deleteCommissionHold(id: number) {
    return await this.delete(ApiPaths.accounting_commission_holds_destroy, { path: { id } })
  }

  async cancelCommissionHold(id: number, data: { reason?: string }) {
    return await this.post(ApiPaths.accounting_commission_holds_cancel_create, data, {
      path: { id },
    })
  }

  async releaseCommissionHold(id: number, data: { reason?: string }) {
    return await this.post(ApiPaths.accounting_commission_holds_release_create, data, {
      path: { id },
    })
  }

  async bulkReleaseCommissionHolds(data: { hold_ids: number[]; reason?: string }) {
    return await this.post(ApiPaths.accounting_commission_holds_bulk_release_create, data)
  }

  async autoGenerateCommissionHolds(data: CommissionHoldAutoGenerateRequest) {
    return await this.post(ApiPaths.accounting_commission_holds_auto_generate_create, data)
  }

  async bulkHoldByPayee(data: BulkHoldByPayeeRequest) {
    return await this.post(ApiPaths.accounting_commission_holds_bulk_hold_by_payee_create, data)
  }

  async getCommissionHoldHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_commission_holds_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getCommissionHoldHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_commission_holds_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: CommissionHoldService | null = null

export function getCommissionHoldService(): CommissionHoldService {
  if (!_service) _service = new CommissionHoldService()
  return _service
}

export function useCommissionHolds(
  params?: GetCommissionHoldsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_HOLDS.LIST(params || {}),
    () => getCommissionHoldService().getCommissionHolds(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionHoldsGrouped(
  params?: GetCommissionHoldsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_HOLDS.GROUPED(params || {}),
    () => getCommissionHoldService().getCommissionHoldsGrouped(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionHold(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_HOLDS.DETAIL(id),
    () => getCommissionHoldService().getCommissionHold(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateCommissionHold() {
  return useApiMutation((data: CommissionHoldRequest) =>
    getCommissionHoldService().createCommissionHold(data)
  )
}

export function useUpdateCommissionHold() {
  return useApiMutation((variables: { id: number; data: CommissionHoldRequest }) =>
    getCommissionHoldService().updateCommissionHold(variables.id, variables.data)
  )
}

export function usePartialUpdateCommissionHold() {
  return useApiMutation((variables: { id: number; data: PatchedCommissionHoldRequest }) =>
    getCommissionHoldService().partialUpdateCommissionHold(variables.id, variables.data)
  )
}

export function useDeleteCommissionHold() {
  return useApiMutation((id: number) => getCommissionHoldService().deleteCommissionHold(id))
}

export function useCancelCommissionHold() {
  return useApiMutation((variables: { id: number; data: { reason?: string } }) =>
    getCommissionHoldService().cancelCommissionHold(variables.id, variables.data)
  )
}

export function useReleaseCommissionHold() {
  return useApiMutation((variables: { id: number; data: { reason?: string } }) =>
    getCommissionHoldService().releaseCommissionHold(variables.id, variables.data)
  )
}

export function useBulkReleaseCommissionHolds() {
  return useApiMutation((data: { hold_ids: number[]; reason?: string }) =>
    getCommissionHoldService().bulkReleaseCommissionHolds(data)
  )
}

export function useAutoGenerateCommissionHolds() {
  return useApiMutation((data: CommissionHoldAutoGenerateRequest) =>
    getCommissionHoldService().autoGenerateCommissionHolds(data)
  )
}

export function useBulkHoldByPayee() {
  return useApiMutation((data: BulkHoldByPayeeRequest) =>
    getCommissionHoldService().bulkHoldByPayee(data)
  )
}

export function useCommissionHoldHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_HOLDS.HISTORIES(id, params || {}),
    () => getCommissionHoldService().getCommissionHoldHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionHoldHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_HOLDS.HISTORY_DETAIL(id, logId),
    () => getCommissionHoldService().getCommissionHoldHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
