import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type EmployeeRoleList = components['schemas']['EmployeeRoleList']
export type PaginatedEmployeeRoleListList = components['schemas']['PaginatedEmployeeRoleListList']
export type BulkUpdateRoleRequest = components['schemas']['BulkUpdateRoleRequest']

/**
 * Namespace mặc định khi gán vai trò cho nhân viên. BE ghi rõ: `erp` là namespace DUY NHẤT hiện có
 * vai trò gán được cho nhân viên, và `namespace` phải khớp namespace của chính `new_role_id`.
 * Schema `Role` không trả `namespace` nên FE không có gì để chọn — luôn gửi `erp`.
 */
export const EMPLOYEE_ROLE_NAMESPACE = 'erp'

/**
 * `namespace` có `@default erp` ở BE nhưng openapi-typescript sinh ra là BẮT BUỘC. Cho phép nơi gọi
 * bỏ trống; service điền mặc định — tránh rải hằng `'erp'` khắp các màn.
 */
export type BulkUpdateRolePayload = Omit<BulkUpdateRoleRequest, 'namespace'> &
  Partial<Pick<BulkUpdateRoleRequest, 'namespace'>>

export type GetEmployeeRolesParams = paths['/api/hrm/employee-roles/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class EmployeeRoleService extends BaseApiService {
  /**
   * Get all employee roles
   */
  async getEmployeeRoles(params?: GetEmployeeRolesParams) {
    return await this.getPaginated(ApiPaths.hrm_employee_roles_list, params)
  }

  /**
   * Get employee role by ID
   */
  async getEmployeeRole(id: number) {
    return await this.get(ApiPaths.hrm_employee_roles_retrieve, {
      path: { id: id },
    })
  }

  /**
   * Bulk update employee roles
   */
  async bulkUpdateEmployeeRoles(data: BulkUpdateRolePayload) {
    return await this.post(ApiPaths.hrm_employee_roles_bulk_update_roles_create, {
      ...data,
      namespace: data.namespace ?? EMPLOYEE_ROLE_NAMESPACE,
    })
  }

  async getEmployeeRoleHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_employee_roles_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getEmployeeRoleHistory(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_employee_roles_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _employeeRoleService: EmployeeRoleService | null = null

export function getEmployeeRoleService(): EmployeeRoleService {
  if (!_employeeRoleService) {
    _employeeRoleService = new EmployeeRoleService()
  }
  return _employeeRoleService
}

// ===== REACT QUERY HOOKS =====
export function useEmployeeRoles(params?: GetEmployeeRolesParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_ROLES.LIST(params || {}),
    () => getEmployeeRoleService().getEmployeeRoles(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useEmployeeRole(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_ROLES.DETAIL(id),
    () => getEmployeeRoleService().getEmployeeRole(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useBulkUpdateEmployeeRoles() {
  return useApiMutation((data: BulkUpdateRolePayload) =>
    getEmployeeRoleService().bulkUpdateEmployeeRoles(data)
  )
}

export function useEmployeeRoleHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_ROLES.HISTORIES(id, params || {}),
    () => getEmployeeRoleService().getEmployeeRoleHistories(id, params),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useEmployeeRoleHistory(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_ROLES.HISTORY_DETAIL(id, logId),
    () => getEmployeeRoleService().getEmployeeRoleHistory(id, logId),
    { enabled: !!id && !!logId, staleTime: 1000 * 60 * 5 }
  )
}
