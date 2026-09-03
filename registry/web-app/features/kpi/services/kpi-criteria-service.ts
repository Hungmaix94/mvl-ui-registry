import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useQueryClient } from '@tanstack/react-query'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type KPICriterion = components['schemas']['KPICriterion']
export type KPICriterionRequest = components['schemas']['KPICriterionRequest']
export type PatchedKPICriterionRequest = components['schemas']['PatchedKPICriterionRequest']
export type PaginatedKPICriterionList = components['schemas']['PaginatedKPICriterionList']
export type KPIConfig = components['schemas']['KPIConfig']
export type KPIConfigSchema = components['schemas']['KPIConfigSchema']

export type GetPayrollKPICriteriaParams =
  paths['/api/payroll/kpi-criteria/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class KPICriteriaService extends BaseApiService {
  /**
   * Get current salary configuration (for KPI)
   */
  async getSalaryConfigCurrent() {
    return await this.get(ApiPaths.payroll_salary_config_retrieve)
  }

  /**
   * Get KPI criteria list
   */
  async getPayrollKPICriteria(params?: GetPayrollKPICriteriaParams) {
    return await this.getPaginated(ApiPaths.payroll_kpi_criteria_list, params)
  }

  /**
   * Create KPI criterion
   */
  async createPayrollKPICriterion(requestData: KPICriterionRequest) {
    return await this.post(ApiPaths.payroll_kpi_criteria_create, requestData)
  }

  /**
   * Get KPI criterion by ID
   */
  async getPayrollKPICriterion(id: number) {
    return await this.get(ApiPaths.payroll_kpi_criteria_retrieve, {
      path: { id },
    })
  }

  /**
   * Update KPI criterion
   */
  async updatePayrollKPICriterion(id: number, requestData: KPICriterionRequest) {
    return await this.put(ApiPaths.payroll_kpi_criteria_update, requestData, { path: { id } })
  }

  /**
   * Partial update KPI criterion
   */
  async partialUpdatePayrollKPICriterion(id: number, requestData: PatchedKPICriterionRequest) {
    return await this.patch(ApiPaths.payroll_kpi_criteria_partial_update, requestData, {
      path: { id },
    })
  }

  /**
   * Delete KPI criterion
   */
  async deletePayrollKPICriterion(id: number) {
    return await this.delete(ApiPaths.payroll_kpi_criteria_destroy, { path: { id } })
  }

  /**
   * Get current KPI config
   */
  async getPayrollKPIConfigCurrent() {
    return await this.get(ApiPaths.payroll_kpi_config_retrieve)
  }

  async getPayrollKPICriterionHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.payroll_kpi_criteria_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getPayrollKPICriterionHistory(id: number, logId: string) {
    return await this.get(ApiPaths.payroll_kpi_criteria_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _kpiCriteriaService: KPICriteriaService | null = null

export function getKPICriteriaService(): KPICriteriaService {
  if (!_kpiCriteriaService) {
    _kpiCriteriaService = new KPICriteriaService()
  }
  return _kpiCriteriaService
}

// ===== REACT QUERY HOOKS =====
export function usePayrollKPICriteria(params?: GetPayrollKPICriteriaParams) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_CRITERIA.LIST(params || {}),
    () => getKPICriteriaService().getPayrollKPICriteria(params),
    {
      enabled: true,
    }
  )
}

export function usePayrollKPICriterion(id: number) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_CRITERIA.DETAIL(id),
    () => getKPICriteriaService().getPayrollKPICriterion(id),
    {
      enabled: !!id && id > 0,
    }
  )
}

export function useCreatePayrollKPICriterion() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (data: KPICriterionRequest) => getKPICriteriaService().createPayrollKPICriterion(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_CRITERIA.LIST({}),
        })
      },
    }
  )
}

export function useUpdatePayrollKPICriterion() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: KPICriterionRequest }) =>
      getKPICriteriaService().updatePayrollKPICriterion(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_CRITERIA.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_CRITERIA.LIST({}),
        })
      },
    }
  )
}

export function usePartialUpdatePayrollKPICriterion() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedKPICriterionRequest }) =>
      getKPICriteriaService().partialUpdatePayrollKPICriterion(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_CRITERIA.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_CRITERIA.LIST({}),
        })
      },
    }
  )
}

export function useDeletePayrollKPICriterion() {
  const queryClient = useQueryClient()
  return useApiMutation((id: number) => getKPICriteriaService().deletePayrollKPICriterion(id), {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PAYROLL.KPI_CRITERIA.LIST({}),
      })
    },
  })
}

export function usePayrollKPIConfigCurrent() {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_CONFIG.CURRENT(),
    () => getKPICriteriaService().getPayrollKPIConfigCurrent(),
    { staleTime: 1000 * 60 * 30 } // 30 minutes
  )
}

export function usePayrollKPICriterionHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_CRITERIA.HISTORIES(id, params || {}),
    () => getKPICriteriaService().getPayrollKPICriterionHistories(id, params),
    { enabled: !!id && id > 0, staleTime: 1000 * 60 * 5 }
  )
}

export function usePayrollKPICriterionHistory(id: number, logId: string) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_CRITERIA.HISTORY_DETAIL(id, logId),
    () => getKPICriteriaService().getPayrollKPICriterionHistory(id, logId),
    { enabled: !!id && id > 0 && !!logId, staleTime: 1000 * 60 * 5 }
  )
}
