import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

export type EmployeeMonthlyKpi = components['schemas']['EmployeeMonthlyKpi']
export type GetEmployeeMonthlyKpisParams =
  paths['/api/accounting/employee-monthly-kpi/']['get']['parameters']['query']

class EmployeeMonthlyKpiService extends BaseApiService {
  async getEmployeeMonthlyKpis(params?: GetEmployeeMonthlyKpisParams) {
    return await this.getPaginated(ApiPaths.accounting_employee_monthly_kpi_list, params)
  }

  async getEmployeeMonthlyKpi(id: number) {
    return await this.get(ApiPaths.accounting_employee_monthly_kpi_retrieve, { path: { id } })
  }

  async getEmployeeMonthlyKpiHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_employee_monthly_kpi_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getEmployeeMonthlyKpiHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_employee_monthly_kpi_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: EmployeeMonthlyKpiService | null = null

export function getEmployeeMonthlyKpiService(): EmployeeMonthlyKpiService {
  if (!_service) _service = new EmployeeMonthlyKpiService()
  return _service
}

export function useEmployeeMonthlyKpis(
  params?: GetEmployeeMonthlyKpisParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.EMPLOYEE_MONTHLY_KPI.LIST(params || {}),
    () => getEmployeeMonthlyKpiService().getEmployeeMonthlyKpis(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useEmployeeMonthlyKpi(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.EMPLOYEE_MONTHLY_KPI.DETAIL(id),
    () => getEmployeeMonthlyKpiService().getEmployeeMonthlyKpi(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useEmployeeMonthlyKpiHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.EMPLOYEE_MONTHLY_KPI.HISTORIES(id, params || {}),
    () => getEmployeeMonthlyKpiService().getEmployeeMonthlyKpiHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useEmployeeMonthlyKpiHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.EMPLOYEE_MONTHLY_KPI.HISTORY_DETAIL(id, logId),
    () => getEmployeeMonthlyKpiService().getEmployeeMonthlyKpiHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
