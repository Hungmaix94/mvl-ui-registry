import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema.ts'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { CTVReconciliation } from '@/features/sales/ctv-reconciliations/types/ctv-reconciliation'

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

// Use the patched CTVReconciliation that fixes product_inventory* typing
// (see types/ctv-reconciliation.ts).
type RawCTVReconciliationSheet = components['schemas']['CTVReconciliationSheet']
export type CTVReconciliationSheet = Omit<RawCTVReconciliationSheet, 'reconciliations'> & {
  readonly reconciliations: CTVReconciliation[]
}
export type CTVReconciliationSheetList = components['schemas']['CTVReconciliationSheetList']

export type GetCTVReconciliationSheetsParams =
  paths['/api/sales/ctv-reconciliation-sheets/']['get']['parameters']['query']

export type CreateCTVReconciliationSheetRequest = NonNullable<
  paths['/api/sales/ctv-reconciliation-sheets/']['post']['requestBody']
>['content']['application/json']

export type UpdateCTVReconciliationSheetRequest = NonNullable<
  paths['/api/sales/ctv-reconciliation-sheets/{id}/']['put']['requestBody']
>['content']['application/json']

export type PartialUpdateCTVReconciliationSheetRequest = NonNullable<
  paths['/api/sales/ctv-reconciliation-sheets/{id}/']['patch']['requestBody']
>['content']['application/json']

// ----------------------------------------------------------------------

class CTVReconciliationSheetService extends BaseApiService {
  async getCTVReconciliationSheets(params?: GetCTVReconciliationSheetsParams) {
    return await this.getPaginated(ApiPaths.sales_ctv_reconciliation_sheets_list, params)
  }

  async getCTVReconciliationSheet(id: number): Promise<CTVReconciliationSheet> {
    const data = await this.get(ApiPaths.sales_ctv_reconciliation_sheets_retrieve, {
      path: { id },
    })
    return data as unknown as CTVReconciliationSheet
  }

  async createCTVReconciliationSheet(data: CreateCTVReconciliationSheetRequest) {
    return await this.post(ApiPaths.sales_ctv_reconciliation_sheets_create, data)
  }

  async updateCTVReconciliationSheet(id: number, data: UpdateCTVReconciliationSheetRequest) {
    return await this.put(ApiPaths.sales_ctv_reconciliation_sheets_update, data, { path: { id } })
  }

  async partialUpdateCTVReconciliationSheet(
    id: number,
    data: PartialUpdateCTVReconciliationSheetRequest
  ) {
    return await this.patch(ApiPaths.sales_ctv_reconciliation_sheets_partial_update, data, {
      path: { id },
    })
  }

  async deleteCTVReconciliationSheet(id: number) {
    return await this.delete(ApiPaths.sales_ctv_reconciliation_sheets_destroy, { path: { id } })
  }

  async confirmCTVReconciliationSheet(id: number) {
    return await this.post(ApiPaths.sales_ctv_reconciliation_sheets_confirm_create, undefined, {
      path: { id },
    })
  }
}

let _service: CTVReconciliationSheetService | null = null

export function getCTVReconciliationSheetService(): CTVReconciliationSheetService {
  if (!_service) _service = new CTVReconciliationSheetService()
  return _service
}

// ----------------------------------------------------------------------
// Hooks
// ----------------------------------------------------------------------

export function useCTVReconciliationSheets(
  params?: GetCTVReconciliationSheetsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'ctv-reconciliation-sheets', 'list', JSON.stringify(params || {})],
    () => getCTVReconciliationSheetService().getCTVReconciliationSheets(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCTVReconciliationSheet(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'ctv-reconciliation-sheets', 'detail', id],
    () => getCTVReconciliationSheetService().getCTVReconciliationSheet(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateCTVReconciliationSheet() {
  return useApiMutation((data: CreateCTVReconciliationSheetRequest) =>
    getCTVReconciliationSheetService().createCTVReconciliationSheet(data)
  )
}

export function useUpdateCTVReconciliationSheet() {
  return useApiMutation((variables: { id: number; data: UpdateCTVReconciliationSheetRequest }) =>
    getCTVReconciliationSheetService().updateCTVReconciliationSheet(variables.id, variables.data)
  )
}

export function usePartialUpdateCTVReconciliationSheet() {
  return useApiMutation(
    (variables: { id: number; data: PartialUpdateCTVReconciliationSheetRequest }) =>
      getCTVReconciliationSheetService().partialUpdateCTVReconciliationSheet(
        variables.id,
        variables.data
      )
  )
}

export function useDeleteCTVReconciliationSheet() {
  return useApiMutation((id: number) =>
    getCTVReconciliationSheetService().deleteCTVReconciliationSheet(id)
  )
}

export function useConfirmCTVReconciliationSheet() {
  return useApiMutation((id: number) =>
    getCTVReconciliationSheetService().confirmCTVReconciliationSheet(id)
  )
}
