import { BaseApiService } from '@/api/base-service'
import { ApiPaths, type components, type paths } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

// Type definitions from generated schema
export type Province = components['schemas']['Province']

// Request parameter types
export type GetProvincesParams = paths['/api/provinces/']['get']['parameters']['query']

/**
 * Province service extending the base API service
 * Provides province-related API operations (read-only)
 */
export class ProvinceService extends BaseApiService {
  /**
   * Get all provinces
   */
  async getProvinces(params?: GetProvincesParams): Promise<Province[]> {
    return await this.getPaginated(ApiPaths.provinces_list, params)
  }

  /**
   * Get province by ID
   */
  async getProvince(id: number) {
    return await this.get(ApiPaths.provinces_retrieve, {
      path: { id },
    })
  }
}

// Create service instance via factory (lazy construction)
let _provinceService: ProvinceService | null = null

export function getProvinceService(): ProvinceService {
  if (!_provinceService) {
    _provinceService = new ProvinceService()
  }
  return _provinceService
}

// For backward compatibility, export a getter
export const provinceService = {
  get instance() {
    return getProvinceService()
  },
}

// React Query hooks for province operations
export function useProvinces(params?: GetProvincesParams) {
  return useApiQuery(
    QUERY_KEYS.PROVINCES.LIST(params || {}),
    () => getProvinceService().getProvinces(params),
    {
      staleTime: 1000 * 60 * 30, // 30 minutes (provinces rarely change)
    }
  )
}

export function useProvince(id: number) {
  return useApiQuery(QUERY_KEYS.PROVINCES.DETAIL(id), () => getProvinceService().getProvince(id), {
    enabled: !!id,
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}
