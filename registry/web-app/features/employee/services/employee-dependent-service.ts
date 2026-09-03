import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams, ImportStartRequest } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type EmployeeDependent = components['schemas']['EmployeeDependent']
export type EmployeeDependentRequest = components['schemas']['EmployeeDependentRequest']
export type PatchedEmployeeDependentRequest =
  components['schemas']['PatchedEmployeeDependentRequest']
export type PaginatedEmployeeDependentList = components['schemas']['PaginatedEmployeeDependentList']

export type GetEmployeeDependentsParams =
  paths['/api/hrm/employee-dependents/']['get']['parameters']['query']
export type GetEmployeeDependentsExportParams =
  paths['/api/hrm/employee-dependents/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class EmployeeDependentService extends BaseApiService {
  /**
   * Get all employee dependents
   */
  async getEmployeeDependents(params?: GetEmployeeDependentsParams) {
    return await this.getPaginated(ApiPaths.hrm_employee_dependents_list, params)
  }

  /**
   * Create a new employee dependent
   */
  async createEmployeeDependent(dependentData: EmployeeDependentRequest) {
    return await this.post(ApiPaths.hrm_employee_dependents_create, dependentData)
  }

  /**
   * Get employee dependent by ID
   */
  async getEmployeeDependent(id: number) {
    return await this.get(ApiPaths.hrm_employee_dependents_retrieve, {
      path: { id: id },
    })
  }

  /**
   * Update employee dependent
   */
  async updateEmployeeDependent(id: number, dependentData: EmployeeDependentRequest) {
    return await this.put(ApiPaths.hrm_employee_dependents_update, dependentData, { path: { id } })
  }

  /**
   * Partially update employee dependent
   */
  async partialUpdateEmployeeDependent(id: number, dependentData: PatchedEmployeeDependentRequest) {
    return await this.patch(ApiPaths.hrm_employee_dependents_partial_update, dependentData, {
      path: { id },
    })
  }

  /**
   * Delete employee dependent
   */
  async deleteEmployeeDependent(id: number) {
    return await this.delete(ApiPaths.hrm_employee_dependents_destroy, { path: { id } })
  }

  /**
   * Get employee dependent histories
   */
  async getEmployeeDependentHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_employee_dependents_histories_retrieve, {
      path: { id: id },
      query: params,
    })
  }

  /**
   * Get employee dependent history detail
   */
  async getEmployeeDependentHistory(id: string, logId: string) {
    return await this.get(ApiPaths.hrm_employee_dependents_history_retrieve, {
      path: { id: id, log_id: logId },
    })
  }

  /**
   * Export employee dependents to XLSX
   */
  async exportEmployeeDependents(params?: GetEmployeeDependentsExportParams) {
    return await this.get(ApiPaths.hrm_employee_dependents_export_retrieve, {
      query: params,
    })
  }

  /**
   * Start employee dependents import job
   */
  async startEmployeeDependentsImport(data: ImportStartRequest) {
    return await this.post(ApiPaths.hrm_employee_dependents_import_create, data)
  }

  /**
   * Get employee dependents import template
   */
  async getEmployeeDependentsImportTemplate() {
    return await this.get(ApiPaths.hrm_employee_dependents_import_template_retrieve)
  }
}

// ===== SERVICE SINGLETON =====
let _employeeDependentService: EmployeeDependentService | null = null

export function getEmployeeDependentService(): EmployeeDependentService {
  if (!_employeeDependentService) {
    _employeeDependentService = new EmployeeDependentService()
  }
  return _employeeDependentService
}

// ===== REACT QUERY HOOKS =====
export function useEmployeeDependents(
  params?: GetEmployeeDependentsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_DEPENDENTS.LIST(params || {}),
    () => getEmployeeDependentService().getEmployeeDependents(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? !!params?.employee,
    }
  )
}

export function useEmployeeDependent(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_DEPENDENTS.DETAIL(id),
    () => getEmployeeDependentService().getEmployeeDependent(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreateEmployeeDependent() {
  return useApiMutation((data: EmployeeDependentRequest) =>
    getEmployeeDependentService().createEmployeeDependent(data)
  )
}

export function useUpdateEmployeeDependent() {
  return useApiMutation(({ id, data }: { id: number; data: EmployeeDependentRequest }) =>
    getEmployeeDependentService().updateEmployeeDependent(id, data)
  )
}

export function usePartialUpdateEmployeeDependent() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedEmployeeDependentRequest }) =>
    getEmployeeDependentService().partialUpdateEmployeeDependent(id, data)
  )
}

export function useDeleteEmployeeDependent() {
  return useApiMutation((id: number) => getEmployeeDependentService().deleteEmployeeDependent(id))
}

export function useExportEmployeeDependents() {
  return useApiMutation((params?: GetEmployeeDependentsExportParams) =>
    getEmployeeDependentService().exportEmployeeDependents(params)
  )
}

export function useEmployeeDependentsImportTemplate(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_DEPENDENTS.IMPORT_TEMPLATE(),
    () => getEmployeeDependentService().getEmployeeDependentsImportTemplate(),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStartEmployeeDependentsImport() {
  return useApiMutation((data: ImportStartRequest) =>
    getEmployeeDependentService().startEmployeeDependentsImport(data)
  )
}
