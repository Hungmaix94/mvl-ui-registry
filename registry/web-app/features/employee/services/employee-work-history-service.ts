import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type EmployeeWorkHistory = components['schemas']['EmployeeWorkHistory']
export type EmployeeWorkHistoryRequest = components['schemas']['EmployeeWorkHistoryRequest']
export type PatchedEmployeeWorkHistoryRequest =
  components['schemas']['PatchedEmployeeWorkHistoryRequest']
export type PaginatedEmployeeWorkHistoryList =
  components['schemas']['PaginatedEmployeeWorkHistoryList']

export type GetEmployeeWorkHistoriesParams =
  paths['/api/hrm/employee-work-histories/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class EmployeeWorkHistoryService extends BaseApiService {
  /**
   * Get all employee work histories
   */
  async getEmployeeWorkHistories(params?: GetEmployeeWorkHistoriesParams) {
    return await this.getPaginated(ApiPaths.hrm_employee_work_histories_list, params)
  }

  /**
   * Get employee work history by ID
   */
  async getEmployeeWorkHistory(id: number) {
    return await this.get(ApiPaths.hrm_employee_work_histories_retrieve, {
      path: { id: id },
    })
  }

  /**
   * Get employee work history histories
   */
  async getEmployeeWorkHistoryHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_employee_work_histories_histories_retrieve, {
      path: { id: id },
      query: params,
    })
  }

  /**
   * Get employee work history history detail
   */
  async getEmployeeWorkHistoryHistory(id: string, logId: string) {
    return await this.get(ApiPaths.hrm_employee_work_histories_history_retrieve, {
      path: { id: id, log_id: logId },
    })
  }

  /**
   * Update employee work history (full update)
   */
  async updateEmployeeWorkHistory(id: number, data: EmployeeWorkHistoryRequest) {
    return await this.put(ApiPaths.hrm_employee_work_histories_update, data, { path: { id } })
  }

  /**
   * Partial update employee work history
   */
  async partialUpdateEmployeeWorkHistory(id: number, data: PatchedEmployeeWorkHistoryRequest) {
    return await this.patch(ApiPaths.hrm_employee_work_histories_partial_update, data, {
      path: { id },
    })
  }

  /**
   * Delete employee work history
   */
  async deleteEmployeeWorkHistory(id: number) {
    return await this.delete(ApiPaths.hrm_employee_work_histories_destroy, { path: { id } })
  }
}

// ===== SERVICE SINGLETON =====
let _employeeWorkHistoryService: EmployeeWorkHistoryService | null = null

export function getEmployeeWorkHistoryService(): EmployeeWorkHistoryService {
  if (!_employeeWorkHistoryService) {
    _employeeWorkHistoryService = new EmployeeWorkHistoryService()
  }
  return _employeeWorkHistoryService
}

// ===== REACT QUERY HOOKS =====
export function useEmployeeWorkHistories(
  params?: GetEmployeeWorkHistoriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_WORK_HISTORIES.LIST(params || {}),
    () => getEmployeeWorkHistoryService().getEmployeeWorkHistories(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? !!params?.employee,
    }
  )
}

export function useEmployeeWorkHistory(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.EMPLOYEE_WORK_HISTORIES.DETAIL(id),
    () => getEmployeeWorkHistoryService().getEmployeeWorkHistory(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useUpdateEmployeeWorkHistory() {
  return useApiMutation(({ id, data }: { id: number; data: EmployeeWorkHistoryRequest }) =>
    getEmployeeWorkHistoryService().updateEmployeeWorkHistory(id, data)
  )
}

export function usePartialUpdateEmployeeWorkHistory() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedEmployeeWorkHistoryRequest }) =>
    getEmployeeWorkHistoryService().partialUpdateEmployeeWorkHistory(id, data)
  )
}

export function useDeleteEmployeeWorkHistory() {
  return useApiMutation((id: number) =>
    getEmployeeWorkHistoryService().deleteEmployeeWorkHistory(id)
  )
}
