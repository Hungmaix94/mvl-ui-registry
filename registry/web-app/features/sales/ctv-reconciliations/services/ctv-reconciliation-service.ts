import { BaseApiService } from '@/api/base-service'
import { ApiPaths, paths } from '@/api/schema.ts'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type GetCTVReconciliationsParams =
  paths['/api/sales/ctv-reconciliations/']['get']['parameters']['query']

export type CreateCTVReconciliationRequest = NonNullable<
  paths['/api/sales/ctv-reconciliations/']['post']['requestBody']
>['content']['application/json']

export type UpdateCTVReconciliationRequest = NonNullable<
  paths['/api/sales/ctv-reconciliations/{id}/']['put']['requestBody']
>['content']['application/json']

export type PartialUpdateCTVReconciliationRequest = NonNullable<
  paths['/api/sales/ctv-reconciliations/{id}/']['patch']['requestBody']
>['content']['application/json']

// ----------------------------------------------------------------------

class CTVReconciliationService extends BaseApiService {
  async getCTVReconciliations(params?: GetCTVReconciliationsParams) {
    return await this.getPaginated(ApiPaths.sales_ctv_reconciliations_list, params)
  }

  async getCTVReconciliation(id: number) {
    return await this.get(ApiPaths.sales_ctv_reconciliations_retrieve, { path: { id } })
  }

  async createCTVReconciliation(data: CreateCTVReconciliationRequest) {
    return await this.post(ApiPaths.sales_ctv_reconciliations_create, data)
  }

  async updateCTVReconciliation(id: number, data: UpdateCTVReconciliationRequest) {
    return await this.put(ApiPaths.sales_ctv_reconciliations_update, data, { path: { id } })
  }

  async partialUpdateCTVReconciliation(id: number, data: PartialUpdateCTVReconciliationRequest) {
    return await this.patch(ApiPaths.sales_ctv_reconciliations_partial_update, data, {
      path: { id },
    })
  }

  async deleteCTVReconciliation(id: number) {
    return await this.delete(ApiPaths.sales_ctv_reconciliations_destroy, { path: { id } })
  }

  // --- Workflow actions (POST không body) ---
  async confirmCTVReconciliation(id: number) {
    return await this.post(ApiPaths.sales_ctv_reconciliations_confirm_create, undefined, {
      path: { id },
    })
  }

  async resyncCTVReconciliationFromShares(id: number) {
    return await this.post(
      ApiPaths.sales_ctv_reconciliations_resync_from_shares_create,
      undefined,
      { path: { id } }
    )
  }

  async voidCTVReconciliation(id: number) {
    return await this.post(ApiPaths.sales_ctv_reconciliations_void_create, undefined, {
      path: { id },
    })
  }
}

let _service: CTVReconciliationService | null = null

export function getCTVReconciliationService(): CTVReconciliationService {
  if (!_service) _service = new CTVReconciliationService()
  return _service
}

// ----------------------------------------------------------------------
// Hooks
// ----------------------------------------------------------------------

export function useCTVReconciliations(
  params?: GetCTVReconciliationsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'ctv-reconciliations', 'list', JSON.stringify(params || {})],
    () => getCTVReconciliationService().getCTVReconciliations(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCTVReconciliation(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'ctv-reconciliations', 'detail', id],
    () => getCTVReconciliationService().getCTVReconciliation(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateCTVReconciliation() {
  return useApiMutation((data: CreateCTVReconciliationRequest) =>
    getCTVReconciliationService().createCTVReconciliation(data)
  )
}

export function useUpdateCTVReconciliation() {
  return useApiMutation((variables: { id: number; data: UpdateCTVReconciliationRequest }) =>
    getCTVReconciliationService().updateCTVReconciliation(variables.id, variables.data)
  )
}

export function usePartialUpdateCTVReconciliation() {
  return useApiMutation((variables: { id: number; data: PartialUpdateCTVReconciliationRequest }) =>
    getCTVReconciliationService().partialUpdateCTVReconciliation(variables.id, variables.data)
  )
}

export function useDeleteCTVReconciliation() {
  return useApiMutation((id: number) => getCTVReconciliationService().deleteCTVReconciliation(id))
}

export function useConfirmCTVReconciliation() {
  return useApiMutation((id: number) => getCTVReconciliationService().confirmCTVReconciliation(id))
}

export function useResyncCTVReconciliationFromShares() {
  return useApiMutation((id: number) =>
    getCTVReconciliationService().resyncCTVReconciliationFromShares(id)
  )
}

export function useVoidCTVReconciliation() {
  return useApiMutation((id: number) => getCTVReconciliationService().voidCTVReconciliation(id))
}
