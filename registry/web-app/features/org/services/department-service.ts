import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'
import { fetchAllPaginatedResults, HRM_LIST_PAGE_SIZE_MAX } from '@/utils/fetch-all-paginated'

// ===== TYPE DEFINITIONS =====
export type Department = components['schemas']['Department']
export type DepartmentRequest = components['schemas']['DepartmentRequest']
export type PatchedDepartmentRequest = components['schemas']['PatchedDepartmentRequest']
export type PaginatedDepartmentList = components['schemas']['PaginatedDepartmentList']

export type GetDepartmentsParams = paths['/api/hrm/departments/']['get']['parameters']['query']
export type DepartmentDropdown = components['schemas']['DepartmentDropdown']
export type PaginatedDepartmentDropdownList =
  components['schemas']['PaginatedDepartmentDropdownList']
export type GetDepartmentsDropdownParams =
  paths['/api/hrm/departments/dropdown/']['get']['parameters']['query']
export type GetDepartmentsExportParams =
  paths['/api/hrm/departments/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class DepartmentService extends BaseApiService {
  async getDepartments(params?: GetDepartmentsParams) {
    return await this.getPaginated(ApiPaths.hrm_departments_list, params)
  }

  async createDepartment(departmentData: DepartmentRequest) {
    return await this.post(ApiPaths.hrm_departments_create, departmentData)
  }

  async getDepartment(id: number) {
    return await this.get(ApiPaths.hrm_departments_retrieve, { path: { id: id } })
  }

  async updateDepartment(id: number, departmentData: DepartmentRequest) {
    return await this.put(ApiPaths.hrm_departments_update, departmentData, { path: { id } })
  }

  async partialUpdateDepartment(id: number, departmentData: PatchedDepartmentRequest) {
    return await this.patch(ApiPaths.hrm_departments_partial_update, departmentData, {
      path: { id },
    })
  }

  async deleteDepartment(id: number) {
    return await this.delete(ApiPaths.hrm_departments_destroy, { path: { id } })
  }

  async getDepartmentFunctionChoices() {
    return await this.get(ApiPaths.hrm_departments_function_choices_retrieve)
  }

  async getDepartmentManagementChoices() {
    return await this.get(ApiPaths.hrm_departments_management_choices_retrieve)
  }

  async getDepartmentTree() {
    return await this.get(ApiPaths.hrm_departments_tree_retrieve)
  }

  async getDepartmentHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_departments_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getDepartmentsDropdown(params?: GetDepartmentsDropdownParams) {
    return await this.getPaginated(ApiPaths.hrm_departments_dropdown_list, params)
  }

  /**
   * Export departments to XLSX
   */
  async exportDepartments(params?: GetDepartmentsExportParams) {
    return await this.get(ApiPaths.hrm_departments_export_retrieve, {
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _departmentService: DepartmentService | null = null

export function getDepartmentService(): DepartmentService {
  if (!_departmentService) {
    _departmentService = new DepartmentService()
  }
  return _departmentService
}

// ===== REACT QUERY HOOKS =====
export function useDepartments(params?: GetDepartmentsParams, enabled?: boolean) {
  return useApiQuery(
    QUERY_KEYS.HRM.DEPARTMENTS.LIST(params || {}),
    () => getDepartmentService().getDepartments(params),
    {
      staleTime: 1000 * 60 * 10,
      enabled: enabled !== false,
    }
  )
}

/** Fetches every department page (backend `page_size` max 100). */
export function useAllDepartments(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.DEPARTMENTS.LIST({ fetchAll: true }),
    () =>
      fetchAllPaginatedResults<Department>((page) =>
        getDepartmentService().getDepartments({ page, page_size: HRM_LIST_PAGE_SIZE_MAX })
      ),
    { staleTime: 1000 * 60 * 10, enabled: options?.enabled !== false }
  )
}

export function useDepartment(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.DEPARTMENTS.DETAIL(id),
    () => getDepartmentService().getDepartment(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 10,
    }
  )
}

export function useCreateDepartment() {
  return useApiMutation((data: DepartmentRequest) => getDepartmentService().createDepartment(data))
}

export function useUpdateDepartment() {
  return useApiMutation(({ id, data }: { id: number; data: DepartmentRequest }) =>
    getDepartmentService().updateDepartment(id, data)
  )
}

export function usePartialUpdateDepartment() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedDepartmentRequest }) =>
    getDepartmentService().partialUpdateDepartment(id, data)
  )
}

export function useDeleteDepartment() {
  return useApiMutation((id: number) => getDepartmentService().deleteDepartment(id))
}

export function useDepartmentFunctionChoices() {
  return useApiQuery(
    QUERY_KEYS.HRM.DEPARTMENTS.FUNCTION_CHOICES(),
    () => getDepartmentService().getDepartmentFunctionChoices(),
    { staleTime: 1000 * 60 * 30 }
  )
}

export function useDepartmentManagementChoices() {
  return useApiQuery(
    QUERY_KEYS.HRM.DEPARTMENTS.MANAGEMENT_CHOICES(),
    () => getDepartmentService().getDepartmentManagementChoices(),
    { staleTime: 1000 * 60 * 30 }
  )
}

export function useDepartmentTree(enabled?: boolean) {
  return useApiQuery(
    QUERY_KEYS.HRM.DEPARTMENTS.TREE(),
    () => getDepartmentService().getDepartmentTree(),
    {
      staleTime: 1000 * 60 * 10,
      enabled: enabled !== false,
    }
  )
}

export function useDepartmentsDropdown(
  params?: GetDepartmentsDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.DEPARTMENTS.DROPDOWN(params || {}),
    () => getDepartmentService().getDepartmentsDropdown(params),
    {
      staleTime: 1000 * 60 * 10,
      enabled: options?.enabled !== false,
    }
  )
}
