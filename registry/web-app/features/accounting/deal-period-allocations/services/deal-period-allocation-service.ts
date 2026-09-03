import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useQueryClient } from '@tanstack/react-query'
import type { GetCommissionSplitsParams } from '@/features/accounting/commission-splits/services/commission-splits-service'

export type DealPeriodAllocation = components['schemas']['DealPeriodAllocation']
export type DealPeriodAllocationRequest = components['schemas']['DealPeriodAllocationRequest']
export type PatchedDealPeriodAllocationRequest =
  components['schemas']['PatchedDealPeriodAllocationRequest']
export type GetDealPeriodAllocationsParams =
  paths['/api/accounting/deal-period-allocations/']['get']['parameters']['query']
export type BulkApprovePbtvResult = components['schemas']['_BulkApprovePbtvResult']

class DealPeriodAllocationService extends BaseApiService {
  async getDealPeriodAllocations(params?: GetDealPeriodAllocationsParams) {
    return await this.getPaginated(ApiPaths.accounting_deal_period_allocations_list, params)
  }

  async createDealPeriodAllocation(data: DealPeriodAllocationRequest) {
    return await this.post(ApiPaths.accounting_deal_period_allocations_create, data)
  }

  async getDealPeriodAllocation(id: number) {
    return await this.get(ApiPaths.accounting_deal_period_allocations_retrieve, { path: { id } })
  }

  async updateDealPeriodAllocation(id: number, data: DealPeriodAllocationRequest) {
    return await this.put(ApiPaths.accounting_deal_period_allocations_update, data, {
      path: { id },
    })
  }

  async partialUpdateDealPeriodAllocation(id: number, data: PatchedDealPeriodAllocationRequest) {
    return await this.patch(ApiPaths.accounting_deal_period_allocations_partial_update, data, {
      path: { id },
    })
  }

  async deleteDealPeriodAllocation(id: number) {
    return await this.delete(ApiPaths.accounting_deal_period_allocations_destroy, { path: { id } })
  }

  async approveDealPeriodAllocation(id: number, data: { reason?: string }) {
    return await this.post(ApiPaths.accounting_deal_period_allocations_approve_create, data, {
      path: { id },
    })
  }

  async bulkApproveDealPeriodAllocations(ids: number[]): Promise<BulkApprovePbtvResult> {
    return (await this.post(ApiPaths.accounting_deal_period_allocations_bulk_approve_create, {
      ids,
    })) as BulkApprovePbtvResult
  }

  async bulkAdminApproveWorksheets(
    ids: number[],
    note: string = ''
  ): Promise<components['schemas']['WorksheetBulkAdminApproveResult']> {
    return (await this.post(ApiPaths.accounting_deal_period_worksheets_bulk_admin_approve_create, {
      ids,
      note,
    })) as components['schemas']['WorksheetBulkAdminApproveResult']
  }

  async voidDealPeriodAllocation(id: number, data: { reason?: string }) {
    return await this.post(ApiPaths.accounting_deal_period_allocations_void_create, data, {
      path: { id },
    })
  }

  async rejectDealPeriodAllocation(id: number, data: { reason?: string }) {
    return await this.post(ApiPaths.accounting_deal_period_allocations_reject_create, data, {
      path: { id },
    })
  }

  async reopenDealPeriodAllocation(id: number, data: { reason?: string }) {
    return await this.post(ApiPaths.accounting_deal_period_allocations_reopen_create, data, {
      path: { id },
    })
  }

  async confirmDefaultSplits(id: number | string) {
    return await this.post(
      ApiPaths.accounting_deal_period_allocations_confirm_default_splits_create,
      undefined,
      { path: { id: Number(id) } }
    )
  }

  async getDealPeriodAllocationHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_deal_period_allocations_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getDealPeriodAllocationHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_deal_period_allocations_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async getWorksheets(
    params: GetCommissionSplitsParams
  ): Promise<components['schemas']['PaginatedDealPeriodWorksheetListRowList']> {
    // BE returns a proper paginated envelope ({ count, results }); use getPaginated directly.
    // params is cast because the endpoint's typed query omits the extra filter fields
    // (search/status/project/…) that the list screen sends.
    return await this.getPaginated(ApiPaths.accounting_deal_period_worksheets_list, params as any)
  }

  // KHÔNG thêm lại một `getWorksheetDetail` gọi `..._retrieve` vào service này.
  // Màn "Giao dịch tiền về đợt này" đọc chi tiết qua `useCommissionSplitAdminPreview`
  // (endpoint `{pk}/admin-preview/`) — khớp với quyền `dealperiodworksheet.admin_preview`
  // đang gác route. Endpoint `retrieve` thuộc màn "Chia HH theo tháng" và đòi quyền
  // `dealperiodworksheet.retrieve`, thứ người xem màn này không được cấp.

  async adminApproveWorksheet(
    id: number | string,
    data: components['schemas']['PatchedWorksheetAdminApproveInputRequest']
  ): Promise<any> {
    return await this.patch(
      ApiPaths.accounting_deal_period_worksheets_admin_approve_partial_update,
      data,
      {
        path: { id: Number(id) },
      }
    )
  }
}

let _service: DealPeriodAllocationService | null = null

export function getDealPeriodAllocationService(): DealPeriodAllocationService {
  if (!_service) _service = new DealPeriodAllocationService()
  return _service
}

export function useDealPeriodAllocations(
  params?: GetDealPeriodAllocationsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEAL_PERIOD_ALLOCATIONS.LIST(params || {}),
    () => getDealPeriodAllocationService().getDealPeriodAllocations(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useDealPeriodAllocation(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEAL_PERIOD_ALLOCATIONS.DETAIL(id),
    () => getDealPeriodAllocationService().getDealPeriodAllocation(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateDealPeriodAllocation() {
  return useApiMutation((data: DealPeriodAllocationRequest) =>
    getDealPeriodAllocationService().createDealPeriodAllocation(data)
  )
}

export function useUpdateDealPeriodAllocation() {
  return useApiMutation((variables: { id: number; data: DealPeriodAllocationRequest }) =>
    getDealPeriodAllocationService().updateDealPeriodAllocation(variables.id, variables.data)
  )
}

export function usePartialUpdateDealPeriodAllocation() {
  return useApiMutation((variables: { id: number; data: PatchedDealPeriodAllocationRequest }) =>
    getDealPeriodAllocationService().partialUpdateDealPeriodAllocation(variables.id, variables.data)
  )
}

export function useDeleteDealPeriodAllocation() {
  return useApiMutation((id: number) =>
    getDealPeriodAllocationService().deleteDealPeriodAllocation(id)
  )
}

export function useApproveDealPeriodAllocation() {
  return useApiMutation((variables: { id: number; data: { reason?: string } }) =>
    getDealPeriodAllocationService().approveDealPeriodAllocation(variables.id, variables.data)
  )
}

export function useBulkApproveDealPeriodAllocations() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (ids: number[]) => getDealPeriodAllocationService().bulkApproveDealPeriodAllocations(ids),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['accounting', 'deal-period-allocation-worksheets', 'list'],
        })
        queryClient.invalidateQueries({
          queryKey: ['accounting', 'deal-period-allocations', 'list'],
        })
      },
    }
  )
}

export function useDealPeriodAllocationBulkAdminApproveWorksheets() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (variables: { ids: number[]; note?: string }) =>
      getDealPeriodAllocationService().bulkAdminApproveWorksheets(
        variables.ids,
        variables.note ?? ''
      ),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['accounting', 'deal-period-allocation-worksheets', 'list'],
        })
        queryClient.invalidateQueries({
          queryKey: ['accounting', 'deal-period-allocations', 'list'],
        })
      },
    }
  )
}

export function useVoidDealPeriodAllocation() {
  return useApiMutation((variables: { id: number; data: { reason?: string } }) =>
    getDealPeriodAllocationService().voidDealPeriodAllocation(variables.id, variables.data)
  )
}

export function useRejectDealPeriodAllocation() {
  return useApiMutation((variables: { id: number; data: { reason?: string } }) =>
    getDealPeriodAllocationService().rejectDealPeriodAllocation(variables.id, variables.data)
  )
}

export function useReopenDealPeriodAllocation() {
  return useApiMutation((variables: { id: number; data: { reason?: string } }) =>
    getDealPeriodAllocationService().reopenDealPeriodAllocation(variables.id, variables.data)
  )
}

export function useDealPeriodAllocationHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEAL_PERIOD_ALLOCATIONS.HISTORIES(id, params || {}),
    () => getDealPeriodAllocationService().getDealPeriodAllocationHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDealPeriodAllocationHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEAL_PERIOD_ALLOCATIONS.HISTORY_DETAIL(id, logId),
    () => getDealPeriodAllocationService().getDealPeriodAllocationHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useConfirmDefaultSplits() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (variables: { id: number | string }) =>
      getDealPeriodAllocationService().confirmDefaultSplits(variables.id),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ACCOUNTING.DEAL_PERIOD_ALLOCATIONS.DETAIL(Number(variables.id)),
        })
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ACCOUNTING.COMMISSION_SPLITS.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: ['accounting', 'commission-splits', 'list'],
        })
      },
    }
  )
}

export function useDealPeriodAllocationWorksheets(
  params: GetCommissionSplitsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['accounting', 'deal-period-allocation-worksheets', 'list', JSON.stringify(params)],
    () => getDealPeriodAllocationService().getWorksheets(params),
    { enabled: options?.enabled ?? true }
  )
}

export function useDealPeriodAllocationAdminApproveWorksheet() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (variables: {
      id: number | string
      data: components['schemas']['PatchedWorksheetAdminApproveInputRequest']
    }) => getDealPeriodAllocationService().adminApproveWorksheet(variables.id, variables.data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['accounting', 'deal-period-allocation-worksheets', 'detail', variables.id],
        })
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ACCOUNTING.COMMISSION_SPLITS.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: [
            'accounting',
            'deal-period-allocation-worksheets',
            'management-bonuses',
            variables.id,
          ],
        })
        queryClient.invalidateQueries({
          queryKey: [
            'accounting',
            'deal-period-allocation-worksheets',
            'management-kpi',
            variables.id,
          ],
        })
        queryClient.invalidateQueries({
          queryKey: ['accounting', 'deal-period-allocation-worksheets', 'list'],
        })
      },
    }
  )
}
