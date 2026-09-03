import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams, ImportStartRequest } from '@/types/hrm-types'
import {
  fetchAllPaginatedResults,
  HRM_LIST_PAGE_SIZE_MAX,
  type FetchAllProgress,
} from '@/utils/fetch-all-paginated'

// ===== TYPE DEFINITIONS =====
export type Employee = components['schemas']['Employee']
export type EmployeeRequest = components['schemas']['EmployeeRequest']
export type PatchedEmployeeRequest = components['schemas']['PatchedEmployeeRequest']
export type PaginatedEmployeeList = components['schemas']['PaginatedEmployeeList']

export type EmployeeDropdown = components['schemas']['EmployeeDropdown']
export type PaginatedEmployeeDropdownList = components['schemas']['PaginatedEmployeeDropdownList']

export type LeaderEmployeeList = components['schemas']['LeaderEmployeeList']
export type PaginatedLeaderEmployeeListList =
  components['schemas']['PaginatedLeaderEmployeeListList']

export type EmployeeAvatarRequest = components['schemas']['EmployeeAvatarRequest']

export type EmployeeDocumentSubmissionNested =
  components['schemas']['EmployeeDocumentSubmissionNested']
export type EmployeeDocumentSubmissionItemRequest =
  components['schemas']['EmployeeDocumentSubmissionItemRequest']
export type PatchedEmployeeDocumentSubmissionUpdateRequest =
  components['schemas']['PatchedEmployeeDocumentSubmissionUpdateRequest']

export type GetEmployeesParams = paths['/api/hrm/employees/']['get']['parameters']['query']
export type GetEmployeesDropdownParams =
  paths['/api/hrm/employees/dropdown/']['get']['parameters']['query']
export type GetEmployeesExportParams =
  paths['/api/hrm/employees/export/']['get']['parameters']['query']
export type GetEmployeesExportLimitParams =
  paths['/api/hrm/employees/export-limit/']['get']['parameters']['query']
export type GetEmployeeImportTemplateParams =
  paths['/api/hrm/employees/import_template/']['get']['parameters']['query']

export type LeaderEmployee = components['schemas']['LeaderEmployeeList']
export type GetLeaderEmployeesParams =
  paths['/api/hrm/employees/leader-list/']['get']['parameters']['query']
export type GetLeaderEmployeesExportParams =
  paths['/api/hrm/employees/leader-export/']['get']['parameters']['query']

export type LeadershipAppointedDateUpdateRequest =
  components['schemas']['PatchedLeadershipAppointedDateUpdateRequest']

// ===== SERVICE CLASS =====
export class EmployeeService extends BaseApiService {
  /**
   * Get all employees
   */
  async getEmployees(params?: GetEmployeesParams) {
    return await this.getPaginated(ApiPaths.hrm_employees_list, params)
  }

  /**
   * Get employees dropdown list
   */
  async listEmployeesDropdown(params?: GetEmployeesDropdownParams) {
    return await this.getPaginated(ApiPaths.hrm_employees_dropdown_list, params)
  }

  /**
   * Export employees to XLSX
   */
  async exportEmployees(params?: GetEmployeesExportParams) {
    return await this.get(ApiPaths.hrm_employees_export_retrieve, {
      query: params,
    })
  }

  /**
   * Export employees (limited fields) to XLSX
   */
  async exportEmployeesLimit(params?: GetEmployeesExportLimitParams) {
    return await this.get(ApiPaths.hrm_employees_export_limit_retrieve, {
      query: params,
    })
  }

  /**
   * Get leadership employees (status != Resigned)
   */
  async getLeaderEmployees(params?: GetLeaderEmployeesParams) {
    return await this.getPaginated(ApiPaths.hrm_employees_leader_list_list, params)
  }

  /**
   * Export leadership employees to XLSX
   */
  async exportLeaderEmployees(params?: GetLeaderEmployeesExportParams) {
    return await this.get(ApiPaths.hrm_employees_leader_export_retrieve, {
      query: params,
    })
  }

  /**
   * Manually correct the leadership appointed date for an employee currently
   * holding a leadership position (HR override — auto-set value is wrong or unreachable).
   */
  async setLeadershipAppointedDate(id: number, data: LeadershipAppointedDateUpdateRequest) {
    return await this.patch(ApiPaths.hrm_employees_leadership_appointed_date_partial_update, data, {
      path: { id },
    })
  }

  /**
   * Create a new employee
   */
  async createEmployee(employeeData: EmployeeRequest) {
    return await this.post(ApiPaths.hrm_employees_create, employeeData)
  }

  /**
   * Get employee by ID
   */
  async getEmployee(id: number) {
    return await this.get(ApiPaths.hrm_employees_retrieve, {
      path: { id: id },
    })
  }

  /**
   * Update employee
   */
  async updateEmployee(id: number, employeeData: EmployeeRequest) {
    return await this.put(ApiPaths.hrm_employees_update, employeeData, {
      path: { id },
    })
  }

  /**
   * Partially update employee
   */
  async partialUpdateEmployee(id: number, employeeData: PatchedEmployeeRequest) {
    return await this.patch(ApiPaths.hrm_employees_partial_update, employeeData, { path: { id } })
  }

  /**
   * Delete employee
   */
  async deleteEmployee(id: number) {
    return await this.delete(ApiPaths.hrm_employees_destroy, { path: { id } })
  }

  /**
   * Update employee avatar
   */
  async updateEmployeeAvatar(id: number, data: EmployeeAvatarRequest) {
    return await this.post(ApiPaths.hrm_employees_update_avatar_create, data, {
      path: { id },
    })
  }

  /**
   * Get employee import template
   */
  async getEmployeeImportTemplate(params?: GetEmployeeImportTemplateParams) {
    return await this.get(ApiPaths.hrm_employees_import_template_retrieve, {
      query: params,
    })
  }

  /**
   * Start employee import job
   */
  async startEmployeeImport(data: ImportStartRequest) {
    return await this.post(ApiPaths.hrm_employees_import_create, data)
  }

  async getEmployeeHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_employees_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  /**
   * Update employee onboarding document submission status (tick/untick the 7 tracked documents)
   */
  async updateEmployeeDocuments(id: number, data: PatchedEmployeeDocumentSubmissionUpdateRequest) {
    return await this.patch(ApiPaths.hrm_employees_documents_partial_update, data, {
      path: { id },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _employeeService: EmployeeService | null = null

export function getEmployeeService(): EmployeeService {
  if (!_employeeService) {
    _employeeService = new EmployeeService()
  }
  return _employeeService
}

// ===== REACT QUERY HOOKS =====
export function useEmployees(params?: GetEmployeesParams, enabled: boolean = true) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEES.LIST(params || {}),
    () => getEmployeeService().getEmployees(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: enabled,
    }
  )
}

export function useLeaderEmployees(params?: GetLeaderEmployeesParams, enabled: boolean = true) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEES.LEADER_LIST(params || {}),
    () => getEmployeeService().getLeaderEmployees(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: enabled,
    }
  )
}

export function useSetLeadershipAppointedDate() {
  return useApiMutation(
    ({ id, data }: { id: number; data: LeadershipAppointedDateUpdateRequest }) =>
      getEmployeeService().setLeadershipAppointedDate(id, data)
  )
}

/** Fetches every employee page sequentially via `next` until exhausted. */
export function useAllEmployees(
  params?: GetEmployeesParams,
  options?: { enabled?: boolean; onProgress?: (progress: FetchAllProgress) => void }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEES.LIST({ ...(params ?? {}), fetchAll: true }),
    ({ signal }) =>
      fetchAllPaginatedResults<Employee>(
        (page) =>
          getEmployeeService().getEmployees({
            ...(params ?? {}),
            page,
            page_size: HRM_LIST_PAGE_SIZE_MAX,
          }),
        options?.onProgress,
        signal
      ),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled !== false,
    }
  )
}

export function useEmployeesByIds(ids: number[], options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEES.LIST({ id__in: ids }),
    () =>
      getEmployeeService().listEmployeesDropdown({
        id__in: ids,
        page_size: Math.max(100, ids.length),
      }),
    {
      staleTime: 1000 * 60 * 5,
      enabled: ids.length > 0 && options?.enabled !== false,
    }
  )
}

export function useEmployeesDropdown(
  params?: GetEmployeesDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEES.DROPDOWN(params || {}),
    () => getEmployeeService().listEmployeesDropdown(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      ...options,
    }
  )
}

export function useEmployee(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEES.DETAIL(id),
    () => getEmployeeService().getEmployee(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateEmployee() {
  return useApiMutation((data: EmployeeRequest) => getEmployeeService().createEmployee(data))
}

export function useUpdateEmployee() {
  return useApiMutation(({ id, data }: { id: number; data: EmployeeRequest }) =>
    getEmployeeService().updateEmployee(id, data)
  )
}

export function useUpdateEmployeeAvatar() {
  return useApiMutation(({ id, data }: { id: number; data: EmployeeAvatarRequest }) =>
    getEmployeeService().updateEmployeeAvatar(id, data)
  )
}

export function usePartialUpdateEmployee() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedEmployeeRequest }) =>
    getEmployeeService().partialUpdateEmployee(id, data)
  )
}

export function useDeleteEmployee() {
  return useApiMutation((id: number) => getEmployeeService().deleteEmployee(id))
}

export function useUpdateEmployeeDocuments() {
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedEmployeeDocumentSubmissionUpdateRequest }) =>
      getEmployeeService().updateEmployeeDocuments(id, data)
  )
}

export function useEmployeeImportTemplate(
  params?: GetEmployeeImportTemplateParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEES.IMPORT_TEMPLATE(params || {}),
    () => getEmployeeService().getEmployeeImportTemplate(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useExportEmployees() {
  return useApiMutation((params?: GetEmployeesExportParams) =>
    getEmployeeService().exportEmployees(params)
  )
}

export function useExportEmployeesLimit() {
  return useApiMutation(
    (params?: GetEmployeesExportLimitParams) => getEmployeeService().exportEmployeesLimit(params),
    { skipInvalidateOnSuccess: true }
  )
}

export function useStartEmployeeImport() {
  return useApiMutation((data: ImportStartRequest) =>
    getEmployeeService().startEmployeeImport(data)
  )
}
