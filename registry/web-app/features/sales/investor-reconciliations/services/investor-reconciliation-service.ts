import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema.ts'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { ArrayElement } from '@/types'

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type GetInvestorReconciliationsParams =
  paths['/api/sales/investor-reconciliations/']['get']['parameters']['query']
export type GetInvestorReconciliationSheetsParams =
  paths['/api/sales/investor-reconciliation-sheets/']['get']['parameters']['query']

/**
 * Khối `summary` cạnh `results` của danh sách phiếu đối chiếu CĐT (CR 86eymqdfk).
 *
 * BE tính trên TOÀN BỘ queryset sau filter, trước phân trang — không phải trang đang xem — nên
 * dòng tổng dưới bảng không đổi khi sang trang. Optional trong schema vì paginator dùng chung
 * cho các action khác của viewset; danh sách thì luôn có.
 */
export type InvestorReconciliationSheetListSummary = NonNullable<
  components['schemas']['PaginatedInvestorReconciliationSheetListList']['summary']
>

export type CreateInvestorReconciliationRequest =
  paths['/api/sales/investor-reconciliations/']['post']['requestBody']['content']['application/json']
export type UpdateInvestorReconciliationRequest =
  paths['/api/sales/investor-reconciliations/{id}/']['put']['requestBody']['content']['application/json']
export type PartialUpdateInvestorReconciliationRequest = NonNullable<
  paths['/api/sales/investor-reconciliations/{id}/']['patch']['requestBody']
>['content']['application/json']

export type CreateInvestorReconciliationSheetRequest =
  paths['/api/sales/investor-reconciliation-sheets/']['post']['requestBody']['content']['application/json']
export type UpdateInvestorReconciliationSheetRequest =
  paths['/api/sales/investor-reconciliation-sheets/{id}/']['put']['requestBody']['content']['application/json']
export type PartialUpdateInvestorReconciliationSheetRequest = NonNullable<
  paths['/api/sales/investor-reconciliation-sheets/{id}/']['patch']['requestBody']
>['content']['application/json']
export type InvestorReconciliationSheetItemRequest = ArrayElement<
  CreateInvestorReconciliationSheetRequest['items']
>

// Huỷ phiếu đã xác nhận: `blocker` là lý do bị chặn kèm việc phải làm trước;
// `auto_action` là việc hệ thống tự làm khi huỷ (huỷ HĐ đầu ra nháp, huỷ HĐ
// đầu vào F2, gỡ nhãn quyết toán...).
export type RevertInvestorSheetPreview = components['schemas']['RevertInvestorSheetPreview']
export type RevertInvestorSheetBlocker = components['schemas']['RevertBlocker']
export type RevertInvestorSheetAutoAction = components['schemas']['RevertAutoAction']
export type RevertInvestorSheetResponse = components['schemas']['RevertInvestorSheetResponse']
export type RevertInvestorSheetRequest =
  paths['/api/sales/investor-reconciliation-sheets/{id}/revert/']['post']['requestBody']['content']['application/json']

// Huỷ bỏ phiếu nháp: khác `revert` ở chỗ phiếu chết hẳn thay vì quay lại sửa được.
// Dùng chung kiểu blocker/auto-action với revert vì BE trả cùng một hình dạng.
export type VoidInvestorSheetPreview = components['schemas']['VoidInvestorSheetPreview']
export type VoidInvestorSheetResponse = components['schemas']['VoidInvestorSheetResponse']
export type VoidInvestorSheetRequest =
  paths['/api/sales/investor-reconciliation-sheets/{id}/void/']['post']['requestBody']['content']['application/json']

// ----------------------------------------------------------------------

class InvestorReconciliationService extends BaseApiService {
  // --- Investor Reconciliations ---

  async getInvestorReconciliations(params?: GetInvestorReconciliationsParams) {
    return await this.getPaginated(ApiPaths.sales_investor_reconciliations_list, params)
  }

  async createInvestorReconciliation(data: CreateInvestorReconciliationRequest) {
    return await this.post(ApiPaths.sales_investor_reconciliations_create, data)
  }

  async getInvestorReconciliation(id: number) {
    return await this.get(ApiPaths.sales_investor_reconciliations_retrieve, { path: { id } })
  }

  async updateInvestorReconciliation(id: number, data: UpdateInvestorReconciliationRequest) {
    return await this.put(ApiPaths.sales_investor_reconciliations_update, data, { path: { id } })
  }

  async partialUpdateInvestorReconciliation(
    id: number,
    data: PartialUpdateInvestorReconciliationRequest
  ) {
    return await this.patch(ApiPaths.sales_investor_reconciliations_partial_update, data, {
      path: { id },
    })
  }

  async deleteInvestorReconciliation(id: number) {
    return await this.delete(ApiPaths.sales_investor_reconciliations_destroy, { path: { id } })
  }

  // --- Investor Reconciliation Sheets ---

  async getInvestorReconciliationSheets(params?: GetInvestorReconciliationSheetsParams) {
    return await this.getPaginated(ApiPaths.sales_investor_reconciliation_sheets_list, params)
  }

  async createInvestorReconciliationSheet(data: CreateInvestorReconciliationSheetRequest) {
    return await this.post(ApiPaths.sales_investor_reconciliation_sheets_create, data)
  }

  async getInvestorReconciliationSheet(id: number) {
    return await this.get(ApiPaths.sales_investor_reconciliation_sheets_retrieve, { path: { id } })
  }

  async updateInvestorReconciliationSheet(
    id: number,
    data: UpdateInvestorReconciliationSheetRequest
  ) {
    return await this.put(ApiPaths.sales_investor_reconciliation_sheets_update, data, {
      path: { id },
    })
  }

  async partialUpdateInvestorReconciliationSheet(
    id: number,
    data: PartialUpdateInvestorReconciliationSheetRequest
  ) {
    return await this.patch(ApiPaths.sales_investor_reconciliation_sheets_partial_update, data, {
      path: { id },
    })
  }

  async deleteInvestorReconciliationSheet(id: number) {
    return await this.delete(ApiPaths.sales_investor_reconciliation_sheets_destroy, {
      path: { id },
    })
  }

  async confirmInvestorReconciliationSheet(id: number) {
    return await this.post(
      ApiPaths.sales_investor_reconciliation_sheets_confirm_create,
      undefined,
      { path: { id } }
    )
  }

  async getRevertPreview(id: number) {
    return await this.get(ApiPaths.sales_investor_reconciliation_sheets_revert_preview_retrieve, {
      path: { id },
    })
  }

  async revertInvestorReconciliationSheet(id: number, data: RevertInvestorSheetRequest) {
    return await this.post(ApiPaths.sales_investor_reconciliation_sheets_revert_create, data, {
      path: { id },
    })
  }

  async getVoidPreview(id: number) {
    return await this.get(ApiPaths.sales_investor_reconciliation_sheets_void_preview_retrieve, {
      path: { id },
    })
  }

  async voidInvestorReconciliationSheet(id: number, data: VoidInvestorSheetRequest) {
    return await this.post(ApiPaths.sales_investor_reconciliation_sheets_void_create, data, {
      path: { id },
    })
  }
}

let _service: InvestorReconciliationService | null = null

export function getInvestorReconciliationService(): InvestorReconciliationService {
  if (!_service) _service = new InvestorReconciliationService()
  return _service
}

// ----------------------------------------------------------------------
// Hooks — Investor Reconciliations
// ----------------------------------------------------------------------

export function useInvestorReconciliations(
  params?: GetInvestorReconciliationsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'investor-reconciliations', 'list', JSON.stringify(params || {})],
    () => getInvestorReconciliationService().getInvestorReconciliations(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateInvestorReconciliation() {
  return useApiMutation((data: CreateInvestorReconciliationRequest) =>
    getInvestorReconciliationService().createInvestorReconciliation(data)
  )
}

export function useInvestorReconciliation(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'investor-reconciliations', 'detail', id],
    () => getInvestorReconciliationService().getInvestorReconciliation(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdateInvestorReconciliation() {
  return useApiMutation((variables: { id: number; data: UpdateInvestorReconciliationRequest }) =>
    getInvestorReconciliationService().updateInvestorReconciliation(variables.id, variables.data)
  )
}

export function usePartialUpdateInvestorReconciliation() {
  return useApiMutation(
    (variables: { id: number; data: PartialUpdateInvestorReconciliationRequest }) =>
      getInvestorReconciliationService().partialUpdateInvestorReconciliation(
        variables.id,
        variables.data
      )
  )
}

export function useDeleteInvestorReconciliation() {
  return useApiMutation((id: number) =>
    getInvestorReconciliationService().deleteInvestorReconciliation(id)
  )
}

// ----------------------------------------------------------------------
// Hooks — Investor Reconciliation Sheets
// ----------------------------------------------------------------------

export function useInvestorReconciliationSheets(
  params?: GetInvestorReconciliationSheetsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'investor-reconciliation-sheets', 'list', JSON.stringify(params || {})],
    () => getInvestorReconciliationService().getInvestorReconciliationSheets(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateInvestorReconciliationSheet() {
  return useApiMutation((data: CreateInvestorReconciliationSheetRequest) =>
    getInvestorReconciliationService().createInvestorReconciliationSheet(data)
  )
}

export function useInvestorReconciliationSheet(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'investor-reconciliation-sheets', 'detail', id],
    () => getInvestorReconciliationService().getInvestorReconciliationSheet(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdateInvestorReconciliationSheet() {
  return useApiMutation(
    (variables: { id: number; data: UpdateInvestorReconciliationSheetRequest }) =>
      getInvestorReconciliationService().updateInvestorReconciliationSheet(
        variables.id,
        variables.data
      )
  )
}

export function usePartialUpdateInvestorReconciliationSheet() {
  return useApiMutation(
    (variables: { id: number; data: PartialUpdateInvestorReconciliationSheetRequest }) =>
      getInvestorReconciliationService().partialUpdateInvestorReconciliationSheet(
        variables.id,
        variables.data
      )
  )
}

export function useDeleteInvestorReconciliationSheet() {
  return useApiMutation((id: number) =>
    getInvestorReconciliationService().deleteInvestorReconciliationSheet(id)
  )
}

export function useConfirmInvestorReconciliationSheet() {
  return useApiMutation((id: number) =>
    getInvestorReconciliationService().confirmInvestorReconciliationSheet(id)
  )
}

/**
 * Verdict "huỷ được hay không" của phiếu đã xác nhận. Read-only bên BE nên gọi
 * thoải mái, nhưng chỉ bật khi người dùng thực sự mở dialog huỷ (`enabled`) để
 * không tốn request trên mọi lượt xem chi tiết. `staleTime: 0` vì trạng thái
 * chứng từ liên quan có thể đổi bất cứ lúc nào.
 */
export function useRevertInvestorReconciliationSheetPreview(
  id: number,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'investor-reconciliation-sheets', 'revert-preview', id],
    () => getInvestorReconciliationService().getRevertPreview(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 0 }
  )
}

export function useRevertInvestorReconciliationSheet() {
  return useApiMutation((variables: { id: number; data: RevertInvestorSheetRequest }) =>
    getInvestorReconciliationService().revertInvestorReconciliationSheet(
      variables.id,
      variables.data
    )
  )
}

/**
 * Xem trước việc huỷ bỏ phiếu nháp. `staleTime: 0` vì hoá đơn / phiếu con liên
 * quan có thể đổi trạng thái bất cứ lúc nào và verdict phải theo kịp.
 */
export function useVoidInvestorReconciliationSheetPreview(
  id: number,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'investor-reconciliation-sheets', 'void-preview', id],
    () => getInvestorReconciliationService().getVoidPreview(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 0 }
  )
}

export function useVoidInvestorReconciliationSheet() {
  return useApiMutation((variables: { id: number; data: VoidInvestorSheetRequest }) =>
    getInvestorReconciliationService().voidInvestorReconciliationSheet(variables.id, variables.data)
  )
}
