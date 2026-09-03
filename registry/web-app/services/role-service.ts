import { BaseApiService } from '@/api/base-service'
import { ApiPaths, type components, type paths } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useQueryClient } from '@tanstack/react-query'
import type { HistoriesParams } from '@/types/hrm-types'

// Type definitions from generated schema
export type Role = components['schemas']['Role']
export type RoleRequest = components['schemas']['RoleRequest']
export type PaginatedRoleList = components['schemas']['PaginatedRoleList']

export type PatchedRoleRequest = components['schemas']['PatchedRoleRequest']

// Request parameter types
export type GetRolesParams = paths['/api/roles/']['get']['parameters']['query']
export type RoleDropdown = components['schemas']['RoleDropdown']
export type PaginatedRoleDropdownList = components['schemas']['PaginatedRoleDropdownList']
export type GetRolesDropdownParams = paths['/api/roles/dropdown/']['get']['parameters']['query']

/**
 * Role service extending the base API service
 * Provides role-related API operations
 */
export class RoleService extends BaseApiService {
  /**
   * Get all roles
   */
  async getRoles(params?: GetRolesParams) {
    return await this.getPaginated(ApiPaths.roles_list, params)
  }

  /**
   * Create a new role
   */
  async createRole(roleData: RoleRequest) {
    return await this.post(ApiPaths.roles_create, roleData)
  }

  /**
   * Get role by ID
   */
  async getRole(id: number) {
    return await this.get(ApiPaths.roles_retrieve, {
      path: { id },
    })
  }

  /**
   * Update role
   */
  async updateRole(id: number, roleData: RoleRequest) {
    return await this.put(ApiPaths.roles_update, roleData, { path: { id } })
  }

  /**
   * Partially update role
   */
  async partialUpdateRole(id: number, roleData: PatchedRoleRequest) {
    return await this.patch(ApiPaths.roles_partial_update, roleData, {
      path: { id },
    })
  }

  /**
   * Delete role
   */
  async deleteRole(id: number) {
    return await this.delete(ApiPaths.roles_destroy, { path: { id } })
  }

  /**
   * Clone role
   */
  async cloneRole(id: number) {
    return await this.post(ApiPaths.roles_clone_create, {}, { path: { id } })
  }

  /**
   * Get role histories
   */
  async getRoleHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.roles_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  /**
   * Get roles dropdown list
   */
  async getRolesDropdown(params?: GetRolesDropdownParams) {
    return await this.getPaginated(ApiPaths.roles_dropdown_list, params)
  }
}

// Create service instance via factory (lazy construction)
let _roleService: RoleService | null = null

export function getRoleService(): RoleService {
  if (!_roleService) {
    _roleService = new RoleService()
  }
  return _roleService
}

// For backward compatibility, export a getter
export const roleService = {
  get instance() {
    return getRoleService()
  },
}

// React Query hooks for role operations
export function useRoles(params?: GetRolesParams, options?: { enabled?: boolean }) {
  return useApiQuery(QUERY_KEYS.ROLES.LIST(params || {}), () => getRoleService().getRoles(params), {
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: options?.enabled !== false,
  })
}

export function useRole(id: number) {
  return useApiQuery(QUERY_KEYS.ROLES.DETAIL(id), () => getRoleService().getRole(id), {
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useCreateRole() {
  return useApiMutation((data: RoleRequest) => getRoleService().createRole(data))
}

export function useUpdateRole() {
  return useApiMutation(({ id, data }: { id: number; data: RoleRequest }) =>
    getRoleService().updateRole(id, data)
  )
}

export function usePartialUpdateRole() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedRoleRequest }) =>
    getRoleService().partialUpdateRole(id, data)
  )
}

export function useDeleteRole() {
  return useApiMutation((id: number) => getRoleService().deleteRole(id))
}

export function useCloneRole() {
  const queryClient = useQueryClient()
  return useApiMutation<Role, unknown, number>((id) => getRoleService().cloneRole(id), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROLES.LIST({}) })
    },
  })
}

export function useRoleHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.ROLES.HISTORIES(id, params || {}),
    () => getRoleService().getRoleHistories(id, params),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useRolesDropdown(params?: GetRolesDropdownParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ROLES.DROPDOWN(params || {}),
    () => getRoleService().getRolesDropdown(params),
    {
      staleTime: 1000 * 60 * 10,
      enabled: options?.enabled !== false,
    }
  )
}
