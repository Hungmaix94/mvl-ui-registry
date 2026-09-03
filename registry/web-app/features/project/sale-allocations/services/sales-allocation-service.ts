import { apiClient } from '@/api/client'
import { BaseApiService } from '@/api/base-service'
import { ApiPaths } from '@/api/schema'
import { extractErrorMessage } from '@/utils/error-utils'
import toastService from '@/services/toast-service'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery, useApiMutation } from '@/hooks/useApiQuery'
import {
  GetSalesAllocationsParams,
  PaginatedSalesAllocationList,
  SalesAllocation,
} from '../types/sales-allocation'

export type SalesAllocationStaff = import('@/api/schema').components['schemas']['ProjectStaff']
export type SalesAllocationStaffRequest =
  import('@/api/schema').components['schemas']['ProjectStaffRequest']
export type PaginatedSalesAllocationStaffList =
  import('@/api/schema').components['schemas']['PaginatedProjectStaffList']
export type SalesAllocationStaffReassignmentPreviewResponse =
  import('@/api/schema').components['schemas']['ProjectStaffReassignmentPreviewResponse']

export type GetSalesAllocationStaffParams =
  import('@/api/schema').paths['/api/realestate/project-staff/']['get']['parameters']['query']

class SalesAllocationApiService extends BaseApiService {
  async getSalesAllocations(
    params?: GetSalesAllocationsParams
  ): Promise<PaginatedSalesAllocationList> {
    return this.getPaginated(ApiPaths.realestate_sales_allocations_list, params as any) as any
  }

  async getSalesAllocation(id: string | number): Promise<SalesAllocation> {
    return this.get(ApiPaths.realestate_sales_allocations_retrieve, {
      path: { id: id as any },
    }) as any
  }

  async createSalesAllocation(data: any): Promise<SalesAllocation> {
    return this.post(ApiPaths.realestate_sales_allocations_create, data as any) as any
  }

  async updateSalesAllocation(id: string | number, data: any): Promise<SalesAllocation> {
    return this.patch(ApiPaths.realestate_sales_allocations_partial_update, data as any, {
      path: { id: id as any },
    }) as any
  }

  async deleteSalesAllocation(id: string | number): Promise<void> {
    return this.delete(ApiPaths.realestate_sales_allocations_destroy, {
      path: { id: id as any },
    })
  }

  async getSalesAllocationStaffList(
    params?: GetSalesAllocationStaffParams
  ): Promise<PaginatedSalesAllocationStaffList> {
    return this.getPaginated(ApiPaths.realestate_project_staff_list, params as any) as any
  }

  async createSalesAllocationStaff(
    data: SalesAllocationStaffRequest
  ): Promise<SalesAllocationStaff> {
    return this.post(ApiPaths.realestate_project_staff_create, data as any) as any
  }

  async getSalesAllocationStaff(id: number): Promise<SalesAllocationStaff> {
    return this.get(ApiPaths.realestate_project_staff_retrieve, {
      path: { id },
    }) as any
  }
  async getReassignmentPreview(
    id: number
  ): Promise<SalesAllocationStaffReassignmentPreviewResponse> {
    return this.get(ApiPaths.realestate_project_staff_reassignment_preview_retrieve, {
      path: { id },
    }) as any
  }
}

export const salesAllocationApiService = new SalesAllocationApiService()

export function useSalesAllocations(
  params?: GetSalesAllocationsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS?.LIST?.(
      (params as unknown as Record<string, unknown>) || {}
    ) || ['realestate', 'sales-allocations', params],
    () => salesAllocationApiService.getSalesAllocations(params),
    {
      staleTime: 1000 * 60 * 5,
      ...options,
    }
  )
}

export function useSalesAllocation(id: string | number) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS?.DETAIL?.(id) || [
      'realestate',
      'sales-allocations',
      id,
    ],
    () => salesAllocationApiService.getSalesAllocation(id),
    { enabled: !!id }
  )
}

export function useDeleteSalesAllocation() {
  return useApiMutation(
    (id: string | number) => salesAllocationApiService.deleteSalesAllocation(id),
    { showErrorToast: true }
  )
}

export function useCreateSalesAllocation() {
  return useApiMutation((data: any) => salesAllocationApiService.createSalesAllocation(data), {
    showErrorToast: true,
  })
}

export function useUpdateSalesAllocation() {
  return useApiMutation(
    ({ id, data }: { id: string | number; data: any }) =>
      salesAllocationApiService.updateSalesAllocation(id, data),
    { showErrorToast: true }
  )
}

export type TbcResourceType =
  | 'tbc-commissions'
  | 'tbc-f2s'
  | 'tbc-sales'
  | 'tbc-management'
  | 'tbc-promotion'
  | 'tbc-investors'
  | 'commission-recipients'

export function useSalesAllocationTbcList(saId: string | number, resource: TbcResourceType) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saId, resource],
    async () => {
      const res = await apiClient.GET(
        `/api/realestate/sales-allocations/{sa_pk}/${resource}/` as any,
        {
          params: { path: { sa_pk: saId } as any },
        }
      )
      if (res.error) {
        toastService.error(extractErrorMessage(res.error))
        throw res.error
      }
      return res.data?.data || (res.data as any) || []
    },
    { enabled: !!saId && !!resource }
  )
}

export function useSalesAllocationTbc(
  saId: string | number,
  resource: TbcResourceType,
  id?: string | number
) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saId, resource, id],
    async () => {
      const res = await apiClient.GET(
        `/api/realestate/sales-allocations/{sa_pk}/${resource}/{id}/` as any,
        {
          params: { path: { sa_pk: saId, id } as any },
        }
      )
      if (res.error) {
        toastService.error(extractErrorMessage(res.error))
        throw res.error
      }
      return res.data?.data || (res.data as any)
    },
    { enabled: !!saId && !!resource && !!id }
  )
}

export function useCreateSalesAllocationTbc(saId: string | number, resource: TbcResourceType) {
  return useApiMutation(
    async (data: any) => {
      const res = await apiClient.POST(
        `/api/realestate/sales-allocations/{sa_pk}/${resource}/` as any,
        {
          params: { path: { sa_pk: saId } as any },
          body: data as any,
        }
      )
      if (res.error) {
        toastService.error(extractErrorMessage(res.error))
        throw res.error
      }
      return res.data?.data || (res.data as any)
    },
    { showErrorToast: true }
  )
}

export function useUpdateSalesAllocationTbc(saId: string | number, resource: TbcResourceType) {
  return useApiMutation(
    async ({ id, data }: { id: string | number; data: any }) => {
      const res = await apiClient.PATCH(
        `/api/realestate/sales-allocations/{sa_pk}/${resource}/{id}/` as any,
        {
          params: { path: { sa_pk: saId, id } as any },
          body: data as any,
        }
      )
      if (res.error) {
        toastService.error(extractErrorMessage(res.error))
        throw res.error
      }
      return res.data?.data || (res.data as any)
    },
    { showErrorToast: true }
  )
}

export function useDeleteSalesAllocationTbc(saId: string | number, resource: TbcResourceType) {
  return useApiMutation(
    async (id: string | number) => {
      const res = await apiClient.DELETE(
        `/api/realestate/sales-allocations/{sa_pk}/${resource}/{id}/` as any,
        {
          params: { path: { sa_pk: saId, id } as any },
        }
      )
      if (res.error) {
        toastService.error(extractErrorMessage(res.error))
        throw res.error
      }
      return res.data?.data || (res.data as any)
    },
    { showErrorToast: true }
  )
}

export function useSalesAllocationDealsList(saId: string | number, params?: any) {
  return useApiQuery(
    ['realestate', 'sales-allocations', saId, 'deals', params],
    async () => {
      const res = await apiClient.GET(ApiPaths.realestate_sales_allocations_deals_list as any, {
        params: { path: { id: saId } as any, query: params },
      })
      if (res.error) {
        toastService.error(extractErrorMessage(res.error))
        throw res.error
      }
      return res.data?.data || (res.data as any)
    },
    { enabled: !!saId }
  )
}
