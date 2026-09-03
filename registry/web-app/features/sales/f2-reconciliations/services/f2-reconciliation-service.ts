import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema.ts'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { ArrayElement } from '@/types'
import type { F2ReconciliationSheet } from '@/features/sales/f2-reconciliations/types/f2-reconciliation'

// ----------------------------------------------------------------------
// Types — F2 Reconciliations
// ----------------------------------------------------------------------

export type GetF2ReconciliationsParams =
  paths['/api/sales/f2-reconciliations/']['get']['parameters']['query']

export type CreateF2ReconciliationRequest =
  paths['/api/sales/f2-reconciliations/']['post']['requestBody']['content']['application/json']

export type UpdateF2ReconciliationRequest =
  paths['/api/sales/f2-reconciliations/{id}/']['put']['requestBody']['content']['application/json']

export type PartialUpdateF2ReconciliationRequest = NonNullable<
  paths['/api/sales/f2-reconciliations/{id}/']['patch']['requestBody']
>['content']['application/json']

export type ConfirmF2ReconciliationRequest = NonNullable<
  paths['/api/sales/f2-reconciliations/{id}/confirm/']['post']['requestBody']
>['content']['application/json']

// ----------------------------------------------------------------------
// Types — F2 Reconciliation Sheets
// ----------------------------------------------------------------------

export type GetF2ReconciliationSheetsParams =
  paths['/api/sales/f2-reconciliation-sheets/']['get']['parameters']['query']

/**
 * Khối `summary` cạnh `results` của danh sách phiếu đối chiếu F2 (CR 86eymqdfk).
 * Cùng hợp đồng với bản CĐT — xem `InvestorReconciliationSheetListSummary`.
 */
export type F2ReconciliationSheetListSummary = NonNullable<
  components['schemas']['PaginatedF2ReconciliationSheetListList']['summary']
>

export type CreateF2ReconciliationSheetRequest =
  paths['/api/sales/f2-reconciliation-sheets/']['post']['requestBody']['content']['application/json']

export type UpdateF2ReconciliationSheetRequest =
  paths['/api/sales/f2-reconciliation-sheets/{id}/']['put']['requestBody']['content']['application/json']

export type PartialUpdateF2ReconciliationSheetRequest = NonNullable<
  paths['/api/sales/f2-reconciliation-sheets/{id}/']['patch']['requestBody']
>['content']['application/json']

export type F2ReconciliationSheetItemRequest = ArrayElement<
  UpdateF2ReconciliationSheetRequest['items']
>

type MutationVariablesWithId<TData = undefined> = {
  id: number
  data?: TData
}

// ----------------------------------------------------------------------

class F2ReconciliationService extends BaseApiService {
  // --- F2 Reconciliations ---

  async getF2Reconciliations(params?: GetF2ReconciliationsParams) {
    return await this.getPaginated(ApiPaths.sales_f2_reconciliations_list, params)
  }

  async createF2Reconciliation(data: CreateF2ReconciliationRequest) {
    return await this.post(ApiPaths.sales_f2_reconciliations_create, data)
  }

  async getF2Reconciliation(id: number) {
    return await this.get(ApiPaths.sales_f2_reconciliations_retrieve, { path: { id } })
  }

  async updateF2Reconciliation(id: number, data: UpdateF2ReconciliationRequest) {
    return await this.put(ApiPaths.sales_f2_reconciliations_update, data, { path: { id } })
  }

  async partialUpdateF2Reconciliation(id: number, data: PartialUpdateF2ReconciliationRequest) {
    return await this.patch(ApiPaths.sales_f2_reconciliations_partial_update, data, {
      path: { id },
    })
  }

  async deleteF2Reconciliation(id: number) {
    return await this.delete(ApiPaths.sales_f2_reconciliations_destroy, { path: { id } })
  }

  async confirmF2Reconciliation(id: number, data?: ConfirmF2ReconciliationRequest) {
    return await this.post(ApiPaths.sales_f2_reconciliations_confirm_create, data, { path: { id } })
  }

  async resyncF2ReconciliationFromShares(id: number) {
    return await this.post(ApiPaths.sales_f2_reconciliations_resync_from_shares_create, undefined, {
      path: { id },
    })
  }

  async voidF2Reconciliation(id: number) {
    return await this.post(ApiPaths.sales_f2_reconciliations_void_create, undefined, {
      path: { id },
    })
  }

  // --- F2 Reconciliation Sheets ---

  async getF2ReconciliationSheets(params?: GetF2ReconciliationSheetsParams) {
    return await this.getPaginated(ApiPaths.sales_f2_reconciliation_sheets_list, params)
  }

  async createF2ReconciliationSheet(data: CreateF2ReconciliationSheetRequest) {
    return await this.post(ApiPaths.sales_f2_reconciliation_sheets_create, data)
  }

  async getF2ReconciliationSheet(id: number): Promise<F2ReconciliationSheet> {
    const data = await this.get(ApiPaths.sales_f2_reconciliation_sheets_retrieve, {
      path: { id },
    })
    return data as unknown as F2ReconciliationSheet
  }

  async updateF2ReconciliationSheet(id: number, data: UpdateF2ReconciliationSheetRequest) {
    return await this.put(ApiPaths.sales_f2_reconciliation_sheets_update, data, { path: { id } })
  }

  async partialUpdateF2ReconciliationSheet(
    id: number,
    data: PartialUpdateF2ReconciliationSheetRequest
  ) {
    return await this.patch(ApiPaths.sales_f2_reconciliation_sheets_partial_update, data, {
      path: { id },
    })
  }

  async deleteF2ReconciliationSheet(id: number) {
    return await this.delete(ApiPaths.sales_f2_reconciliation_sheets_destroy, { path: { id } })
  }

  async confirmF2ReconciliationSheet(id: number) {
    return await this.post(ApiPaths.sales_f2_reconciliation_sheets_confirm_create, undefined, {
      path: { id },
    })
  }

  /**
   * Xuất "Biên bản xác nhận hoa hồng môi giới" theo từng dòng căn (86eynadnn). Endpoint mới
   * `export-detail/` chưa có trong `schema.ts` (chưa regen từ BE dev) → gọi raw path + cast,
   * KHÔNG regen schema — cùng cách `department-commission-pools-service.ts#downloadImportTemplate`
   * xử lý endpoint chưa deploy. Sync-only, BE trả file đính kèm trực tiếp (206) nên `parseAs: 'blob'`.
   */
  async exportF2ReconciliationSheetDetail(id: number, code?: string): Promise<void> {
    const response = (await this.client.GET(
      `/api/sales/f2-reconciliation-sheets/${id}/export-detail/` as any,
      {
        parseAs: 'blob',
      }
    )) as unknown as { data?: Blob; error?: unknown }

    if (response.error) throw response.error

    const blob = response.data as Blob
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `bien-ban-xac-nhan-hoa-hong-f2-${code || id}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }
}

let _service: F2ReconciliationService | null = null

export function getF2ReconciliationService(): F2ReconciliationService {
  if (!_service) _service = new F2ReconciliationService()
  return _service
}

// ----------------------------------------------------------------------
// Hooks — F2 Reconciliations
// ----------------------------------------------------------------------

export function useF2Reconciliations(
  params?: GetF2ReconciliationsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'f2-reconciliations', 'list', JSON.stringify(params || {})],
    () => getF2ReconciliationService().getF2Reconciliations(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateF2Reconciliation() {
  return useApiMutation((data: CreateF2ReconciliationRequest) =>
    getF2ReconciliationService().createF2Reconciliation(data)
  )
}

export function useF2Reconciliation(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'f2-reconciliations', 'detail', id],
    () => getF2ReconciliationService().getF2Reconciliation(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdateF2Reconciliation() {
  return useApiMutation((variables: { id: number; data: UpdateF2ReconciliationRequest }) =>
    getF2ReconciliationService().updateF2Reconciliation(variables.id, variables.data)
  )
}

export function usePartialUpdateF2Reconciliation() {
  return useApiMutation((variables: { id: number; data: PartialUpdateF2ReconciliationRequest }) =>
    getF2ReconciliationService().partialUpdateF2Reconciliation(variables.id, variables.data)
  )
}

export function useDeleteF2Reconciliation() {
  return useApiMutation((id: number) => getF2ReconciliationService().deleteF2Reconciliation(id))
}

export function useConfirmF2Reconciliation() {
  return useApiMutation((variables: MutationVariablesWithId<ConfirmF2ReconciliationRequest>) =>
    getF2ReconciliationService().confirmF2Reconciliation(variables.id, variables.data)
  )
}

export function useResyncF2ReconciliationFromShares() {
  return useApiMutation((id: number) =>
    getF2ReconciliationService().resyncF2ReconciliationFromShares(id)
  )
}

export function useVoidF2Reconciliation() {
  return useApiMutation((id: number) => getF2ReconciliationService().voidF2Reconciliation(id))
}

// ----------------------------------------------------------------------
// Hooks — F2 Reconciliation Sheets
// ----------------------------------------------------------------------

export function useF2ReconciliationSheets(
  params?: GetF2ReconciliationSheetsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'f2-reconciliation-sheets', 'list', JSON.stringify(params || {})],
    () => getF2ReconciliationService().getF2ReconciliationSheets(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateF2ReconciliationSheet() {
  return useApiMutation((data: CreateF2ReconciliationSheetRequest) =>
    getF2ReconciliationService().createF2ReconciliationSheet(data)
  )
}

export function useF2ReconciliationSheet(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'f2-reconciliation-sheets', 'detail', id],
    () => getF2ReconciliationService().getF2ReconciliationSheet(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdateF2ReconciliationSheet() {
  return useApiMutation((variables: { id: number; data: UpdateF2ReconciliationSheetRequest }) =>
    getF2ReconciliationService().updateF2ReconciliationSheet(variables.id, variables.data)
  )
}

export function usePartialUpdateF2ReconciliationSheet() {
  return useApiMutation(
    (variables: { id: number; data: PartialUpdateF2ReconciliationSheetRequest }) =>
      getF2ReconciliationService().partialUpdateF2ReconciliationSheet(variables.id, variables.data)
  )
}

export function useDeleteF2ReconciliationSheet() {
  return useApiMutation((id: number) =>
    getF2ReconciliationService().deleteF2ReconciliationSheet(id)
  )
}

export function useConfirmF2ReconciliationSheet() {
  return useApiMutation((id: number) =>
    getF2ReconciliationService().confirmF2ReconciliationSheet(id)
  )
}

export function useExportF2ReconciliationSheetDetail() {
  return useApiMutation((variables: { id: number; code?: string }) =>
    getF2ReconciliationService().exportF2ReconciliationSheetDetail(variables.id, variables.code)
  )
}
