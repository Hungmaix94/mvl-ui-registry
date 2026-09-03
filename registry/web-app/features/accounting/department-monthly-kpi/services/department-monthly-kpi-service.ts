import { BaseApiService } from '@/api/base-service'
import { ApiPaths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'
import {
  GetDepartmentMonthlyKpisParams,
  DepartmentCommissionRow,
  GetDepartmentCommissionsParams,
} from '../types/department-monthly-kpi-types'

class DepartmentMonthlyKpiService extends BaseApiService {
  async getDepartmentCommissions(params: GetDepartmentCommissionsParams) {
    // Custom aggregate endpoint (not in the generated schema). base.get already
    // unwraps the { success, data, error } envelope, so this returns the row
    // array directly — callers must NOT read `.data` again.
    return (await (this.get as any)('/api/accounting/department-commissions/', {
      query: params,
    })) as DepartmentCommissionRow[]
  }

  async getDepartmentMonthlyKpis(params?: GetDepartmentMonthlyKpisParams) {
    return await this.getPaginated(ApiPaths.accounting_department_monthly_kpi_list, params)
  }

  async getDepartmentMonthlyKpi(id: number) {
    return await this.get(ApiPaths.accounting_department_monthly_kpi_retrieve, { path: { id } })
  }

  async getDepartmentMonthlyKpiHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_department_monthly_kpi_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getDepartmentMonthlyKpiHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_department_monthly_kpi_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: DepartmentMonthlyKpiService | null = null

export function getDepartmentMonthlyKpiService(): DepartmentMonthlyKpiService {
  if (!_service) _service = new DepartmentMonthlyKpiService()
  return _service
}

export function useDepartmentMonthlyKpis(
  params?: GetDepartmentMonthlyKpisParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEPARTMENT_MONTHLY_KPI.LIST(params || {}),
    () => getDepartmentMonthlyKpiService().getDepartmentMonthlyKpis(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useDepartmentMonthlyKpi(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEPARTMENT_MONTHLY_KPI.DETAIL(id),
    () => getDepartmentMonthlyKpiService().getDepartmentMonthlyKpi(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDepartmentMonthlyKpiHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEPARTMENT_MONTHLY_KPI.HISTORIES(id, params || {}),
    () => getDepartmentMonthlyKpiService().getDepartmentMonthlyKpiHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDepartmentMonthlyKpiHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEPARTMENT_MONTHLY_KPI.HISTORY_DETAIL(id, logId),
    () => getDepartmentMonthlyKpiService().getDepartmentMonthlyKpiHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

// Backward-compat: hook employee-monthly-kpi đã chuyển sang feature riêng
// (employee-monthly-kpi) với đầy đủ list/detail/histories — re-export để các
// page đang import từ file này không phải đổi đường dẫn.
export { useEmployeeMonthlyKpis } from '@/features/accounting/employee-monthly-kpi/services/employee-monthly-kpi-service'

export function useDepartmentCommissions(
  params: GetDepartmentCommissionsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEPARTMENT_COMMISSIONS.LIST(params || {}),
    () => getDepartmentMonthlyKpiService().getDepartmentCommissions(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}
