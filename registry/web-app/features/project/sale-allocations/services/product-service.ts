import { BaseApiService } from '@/api/base-service'
import { ApiPaths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery, useApiMutation } from '@/hooks/useApiQuery'
import {
  GetProductsParams,
  PaginatedProductList,
  PatchedProductRequest,
  Product,
  ProductRequest,
  ProductStatusUpdateRequest,
} from '../types/product'

class ProductApiService extends BaseApiService {
  async getProducts(params?: GetProductsParams): Promise<PaginatedProductList> {
    return this.getPaginated(ApiPaths.realestate_product_inventories_list, params as any) as any
  }

  async getProduct(id: string | number): Promise<Product> {
    return this.get(ApiPaths.realestate_product_inventories_retrieve, {
      path: { id: id as any },
    }) as any
  }

  async createProduct(data: ProductRequest): Promise<Product> {
    return this.post(ApiPaths.realestate_product_inventories_create, data as any) as any
  }

  async updateProduct(id: string | number, data: ProductRequest): Promise<Product> {
    return this.put(ApiPaths.realestate_product_inventories_update, data as any, {
      path: { id: id as any },
    }) as any
  }

  async patchProduct(id: string | number, data: PatchedProductRequest): Promise<Product> {
    return this.patch(ApiPaths.realestate_product_inventories_partial_update, data as any, {
      path: { id: id as any },
    }) as any
  }

  async deleteProduct(id: string | number): Promise<void> {
    return this.delete(ApiPaths.realestate_product_inventories_destroy, {
      path: { id: id as any },
    })
  }

  async updateProductStatus(
    id: string | number,
    data: ProductStatusUpdateRequest
  ): Promise<Product> {
    return this.patch(
      ApiPaths.realestate_product_inventories_partial_update,
      { status: data.status, note: data.notes } as any,
      { path: { id: id as any } }
    ) as any
  }
}

export const productApiService = new ProductApiService()

// ============================================
// React Query Hooks
// ============================================

export function useProducts(params?: GetProductsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECT_SALE_ALLOCATIONS.LIST(
      (params as unknown as Record<string, unknown>) || {}
    ),
    () => productApiService.getProducts(params),
    {
      staleTime: 1000 * 60 * 5,
      ...options,
    }
  )
}

export function useProduct(id: string | number) {
  return useApiQuery(
    QUERY_KEYS.REALESTATE.PROJECT_SALE_ALLOCATIONS.DETAIL(id),
    () => productApiService.getProduct(id),
    { enabled: !!id }
  )
}

export function useCreateProduct() {
  return useApiMutation((data: ProductRequest) => productApiService.createProduct(data), {
    showErrorToast: true,
  })
}

export function useUpdateProduct() {
  return useApiMutation(
    ({ id, data }: { id: string | number; data: ProductRequest }) =>
      productApiService.updateProduct(id, data),
    { showErrorToast: true }
  )
}

export function usePartialUpdateProduct() {
  return useApiMutation(
    ({ id, data }: { id: string | number; data: PatchedProductRequest }) =>
      productApiService.patchProduct(id, data),
    { showErrorToast: true }
  )
}

export function useDeleteProduct() {
  return useApiMutation((id: string | number) => productApiService.deleteProduct(id), {
    showErrorToast: true,
  })
}

export function useUpdateProductStatus() {
  return useApiMutation(
    ({ id, data }: { id: string | number; data: ProductStatusUpdateRequest }) =>
      productApiService.updateProductStatus(id, data),
    { showErrorToast: true }
  )
}
