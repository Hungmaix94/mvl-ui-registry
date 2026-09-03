import { BaseApiService } from '@/api/base-service'
import { ApiPaths, type components, type paths } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

// Type definitions from generated schema
export type Permission = components['schemas']['Permission']
export type PermissionStructure = {
  modules?: string[]
  submodules?: string[]
}
export type PaginatedPermissionList = components['schemas']['PaginatedPermissionList']

// Request parameter types
export type GetPermissionsParams = paths['/api/permissions/']['get']['parameters']['query']
export type GetPermissionStructureParams =
  paths['/api/permissions/structure/']['get']['parameters']['query']

/**
 * Permission service extending the base API service
 * Provides permission-related API operations (read-only)
 */
export class PermissionService extends BaseApiService {
  /**
   * Get all permissions
   */
  async getPermissions(params?: GetPermissionsParams): Promise<PaginatedPermissionList> {
    return await this.getPaginated(ApiPaths.permissions_list, params)
  }

  /**
   * Get permission by ID
   */
  async getPermission(id: number) {
    return await this.get(ApiPaths.permissions_retrieve, {
      path: { id },
    })
  }

  /**
   * Get permission structure (modules/submodules)
   */
  async getPermissionStructure(params?: GetPermissionStructureParams) {
    return await this.get(ApiPaths.permissions_structure_retrieve, {
      query: params,
    })
  }
}

// Create service instance via factory (lazy construction)
let _permissionService: PermissionService | null = null

export function getPermissionService(): PermissionService {
  if (!_permissionService) {
    _permissionService = new PermissionService()
  }
  return _permissionService
}

// For backward compatibility, export a getter
export const permissionService = {
  get instance() {
    return getPermissionService()
  },
}

// React Query hooks for permission operations
export function usePermissions(params?: GetPermissionsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PERMISSIONS.LIST(params || {}),
    () => getPermissionService().getPermissions(params),
    {
      staleTime: 1000 * 60 * 30, // 30 minutes (permissions rarely change)
      ...options,
    }
  )
}

export function usePermission(id: number) {
  return useApiQuery(
    QUERY_KEYS.PERMISSIONS.DETAIL(id),
    () => getPermissionService().getPermission(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 30, // 30 minutes
    }
  )
}

export function usePermissionStructure(params?: GetPermissionStructureParams) {
  return useApiQuery(
    QUERY_KEYS.PERMISSIONS.STRUCTURE(params || {}),
    () => getPermissionService().getPermissionStructure(params),
    {
      staleTime: 1000 * 60 * 30, // 30 minutes
    }
  )
}
