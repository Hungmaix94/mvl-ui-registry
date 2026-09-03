import { BaseApiService } from '@/api/base-service'
import { ApiPaths } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

// Type definitions for constants response
export type ConstantsResponse = Record<string, any>

// Request parameters
export type GetConstantsParams = {
  modules?: string // Comma-separated list of module names
}

/**
 * Constants service extending the base API service
 * Provides application constants operations
 */
export class ConstantsService extends BaseApiService {
  /**
   * Get application constants
   */
  async getConstants(params?: GetConstantsParams) {
    return await this.get(ApiPaths.constants_retrieve, {
      query: params,
    })
  }
}

// Create service instance via factory (lazy construction)
let _constantsService: ConstantsService | null = null

export function getConstantsService(): ConstantsService {
  if (!_constantsService) {
    _constantsService = new ConstantsService()
  }
  return _constantsService
}

// For backward compatibility, export a getter
export const constantsService = {
  get instance() {
    return getConstantsService()
  },
}

// React Query hook for constants
export function useConstants(params?: GetConstantsParams) {
  return useApiQuery(
    QUERY_KEYS.CONSTANTS.LIST(params || {}),
    () => getConstantsService().getConstants(params),
    {
      staleTime: 1000 * 60 * 30, // 30 minutes (constants rarely change)
    }
  )
}
