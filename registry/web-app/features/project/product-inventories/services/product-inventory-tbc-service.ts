import { apiClient } from '@/api/client'
import { extractErrorMessage } from '@/utils/error-utils'
import toastService from '@/services/toast-service'
import { useApiQuery, useApiMutation } from '@/hooks/useApiQuery'

export type PiTbcResourceType =
  | 'tbc-commissions'
  | 'tbc-f2s'
  | 'tbc-sales'
  | 'tbc-management'
  | 'tbc-promotion'
  | 'tbc-investors'
  | 'commission-recipients'

export interface ProductInventoryTbcContext {
  id: number
  tbc_source: 'sa' | 'pi'
  tbc_commissions: any[]
  tbc_f2s: any[]
  tbc_sales: any[]
  tbc_management: any[]
  tbc_promotion: any[]
  tbc_investors: any[]
  [key: string]: any
}

export function useProductInventoryTbcList(piId: string | number, resource: PiTbcResourceType) {
  return useApiQuery(
    ['realestate', 'product-inventories', piId, resource],
    async () => {
      const res = await apiClient.GET(
        `/api/realestate/product-inventories/{pi_pk}/${resource}/` as any,
        {
          params: { path: { pi_pk: piId } as any },
        }
      )
      if (res.error) {
        toastService.error(extractErrorMessage(res.error))
        throw res.error
      }
      return res.data?.data || (res.data as any) || []
    },
    { enabled: !!piId && !!resource }
  )
}

export function useProductInventoryTbcItem(
  piId: string | number,
  resource: PiTbcResourceType,
  id?: string | number
) {
  return useApiQuery(
    ['realestate', 'product-inventories', piId, resource, id],
    async () => {
      const res = await apiClient.GET(
        `/api/realestate/product-inventories/{pi_pk}/${resource}/{id}/` as any,
        {
          params: { path: { pi_pk: piId, id } as any },
        }
      )
      if (res.error) {
        toastService.error(extractErrorMessage(res.error))
        throw res.error
      }
      return res.data?.data || res.data
    },
    { enabled: !!piId && !!resource && !!id }
  )
}

export function useCreateProductInventoryTbc(piId: string | number, resource: PiTbcResourceType) {
  return useApiMutation(
    async (data: any) => {
      const res = await apiClient.POST(
        `/api/realestate/product-inventories/{pi_pk}/${resource}/` as any,
        {
          params: { path: { pi_pk: piId } as any },
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

export function useUpdateProductInventoryTbc(piId: string | number, resource: PiTbcResourceType) {
  return useApiMutation(
    async ({ id, data }: { id: string | number; data: any }) => {
      const res = await apiClient.PATCH(
        `/api/realestate/product-inventories/{pi_pk}/${resource}/{id}/` as any,
        {
          params: { path: { pi_pk: piId, id } as any },
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

export function useDeleteProductInventoryTbc(piId: string | number, resource: PiTbcResourceType) {
  return useApiMutation(
    async (id: string | number) => {
      const res = await apiClient.DELETE(
        `/api/realestate/product-inventories/{pi_pk}/${resource}/{id}/` as any,
        {
          params: { path: { pi_pk: piId, id } as any },
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

export function useProductInventoryTbcContext(piId: string | number) {
  return useApiQuery(
    ['realestate', 'product-inventories', piId, 'tbc-context'],
    async () => {
      const res = await apiClient.GET(
        `/api/realestate/product-inventories/{id}/tbc-context/` as any,
        {
          params: { path: { id: piId } as any },
        }
      )
      if (res.error) {
        toastService.error(extractErrorMessage(res.error))
        throw res.error
      }
      const payload = res.data?.data || res.data

      return {
        id: payload?.product_inventory_id,
        tbc_source: payload?.tbc_source || 'sa',
        tbc_commissions: payload?.tbc || [],
        tbc_f2s: payload?.tbc_f2 || [],
        tbc_sales: payload?.tbc_sales || [],
        tbc_management: payload?.tbc_management || [],
        tbc_promotion: payload?.tbc_promotion || [],
        tbc_investors: payload?.tbc_investors || [],
      } as unknown as ProductInventoryTbcContext
    },
    { enabled: !!piId }
  )
}
