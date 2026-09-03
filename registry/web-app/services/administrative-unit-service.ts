import { BaseApiService } from '@/api/base-service'
import { ApiPaths, type components, type paths } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

// Type definitions from generated schema
export type AdministrativeUnit = components['schemas']['AdministrativeUnit']
export type PaginatedAdministrativeUnitList =
  components['schemas']['PaginatedAdministrativeUnitList']

// Request parameter types
export type GetAdministrativeUnitsParams =
  paths['/api/administrative-units/']['get']['parameters']['query']

/**
 * Administrative Unit service extending the base API service
 * Provides administrative unit-related API operations (read-only)
 */
export class AdministrativeUnitService extends BaseApiService {
  /**
   * Get all administrative units (paginated)
   */
  async getAdministrativeUnits(params?: GetAdministrativeUnitsParams) {
    return await this.getPaginated(ApiPaths.administrative_units_list, params)
  }

  /**
   * Get administrative unit by ID
   */
  async getAdministrativeUnit(id: number) {
    return await this.get(ApiPaths.administrative_units_retrieve, {
      path: { id },
    })
  }
}

// Create service instance via factory (lazy construction)
let _administrativeUnitService: AdministrativeUnitService | null = null

export function getAdministrativeUnitService(): AdministrativeUnitService {
  if (!_administrativeUnitService) {
    _administrativeUnitService = new AdministrativeUnitService()
  }
  return _administrativeUnitService
}

// For backward compatibility, export a getter
export const administrativeUnitService = {
  get instance() {
    return getAdministrativeUnitService()
  },
}

// React Query hooks for administrative unit operations
export function useAdministrativeUnits(
  params?: GetAdministrativeUnitsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ADMINISTRATIVE_UNITS.LIST(params || {}),
    () => getAdministrativeUnitService().getAdministrativeUnits(params),
    {
      staleTime: 1000 * 60 * 30, // 30 minutes (administrative units rarely change)
      enabled: options?.enabled !== false,
    }
  )
}

export function useAdministrativeUnit(id: number) {
  return useApiQuery(
    QUERY_KEYS.ADMINISTRATIVE_UNITS.DETAIL(id),
    () => getAdministrativeUnitService().getAdministrativeUnit(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 30, // 30 minutes
    }
  )
}
