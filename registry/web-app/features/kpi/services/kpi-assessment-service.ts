import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useExport } from '@/hooks/useExport'
import { useQueryClient } from '@tanstack/react-query'
import type { HistoriesParams } from '@/types/hrm-types'
import { KpiTaskState as KPIPeriodTaskState } from '@/constants/api-schema-aliases'

// ===== TYPE DEFINITIONS =====
export type EmployeeSelfAssessment = components['schemas']['EmployeeSelfAssessment']
export type EmployeeSelfAssessmentRequest = components['schemas']['EmployeeSelfAssessmentRequest']
export type PaginatedEmployeeSelfAssessmentList =
  components['schemas']['PaginatedEmployeeSelfAssessmentList']
export type PatchedEmployeeSelfAssessmentRequest =
  components['schemas']['PatchedEmployeeSelfAssessmentUpdateRequestRequest']
export type EmployeeKPIAssessment = components['schemas']['EmployeeKPIAssessment']
export type EmployeeKPIAssessmentList = components['schemas']['EmployeeKPIAssessmentList']
export type EmployeeKPIAssessmentUpdate = components['schemas']['EmployeeKPIAssessmentUpdate']
export type PaginatedEmployeeKPIAssessmentListList =
  components['schemas']['PaginatedEmployeeKPIAssessmentListList']
export type PatchedEmployeeKPIAssessmentUpdateRequest =
  components['schemas']['PatchedEmployeeKPIAssessmentUpdateRequest']
export type EmployeeKPIItem = components['schemas']['EmployeeKPIItem']
export type PatchedEmployeeKPIItemRequest = components['schemas']['PatchedEmployeeKPIItemRequest']
export type DepartmentKPIAssessment = components['schemas']['DepartmentKPIAssessment']
export type DepartmentKPIAssessmentList = components['schemas']['DepartmentKPIAssessmentList']
export type DepartmentKPIAssessmentUpdate = components['schemas']['DepartmentKPIAssessmentUpdate']
export type PaginatedDepartmentKPIAssessmentListList =
  components['schemas']['PaginatedDepartmentKPIAssessmentListList']
export type PatchedDepartmentKPIAssessmentUpdateRequest =
  components['schemas']['PatchedDepartmentKPIAssessmentUpdateRequest']
export type ManagerAssessment = components['schemas']['ManagerAssessment']
export type PaginatedManagerAssessmentList = components['schemas']['PaginatedManagerAssessmentList']
export type PatchedManagerAssessmentRequest =
  components['schemas']['PatchedManagerAssessmentUpdateRequestRequest']
export type KPIAssessmentPeriod = components['schemas']['KPIAssessmentPeriod']
export type PaginatedKPIAssessmentPeriodList =
  components['schemas']['PaginatedKPIAssessmentPeriodList']
export type KPIAssessmentPeriodGenerateRequest =
  components['schemas']['KPIAssessmentPeriodGenerateRequest']
export type KPIAssessmentPeriodFinalizeResponse =
  components['schemas']['KPIAssessmentPeriodFinalizeResponse']
export type KPIAssessmentPeriodSummary = components['schemas']['KPIAssessmentPeriodSummary']

export type GetPayrollKPIAssessmentManagerCurrentParams =
  paths['/api/payroll/kpi-assessments/manager/current/']['get']['parameters']['query']
export type GetPayrollKPIAssessmentsEmployeesParams =
  paths['/api/payroll/kpi-assessments/employees/']['get']['parameters']['query']
export type GetPayrollKPIAssessmentsEmployeesExportParams =
  paths['/api/payroll/kpi-assessments/employees/export/']['get']['parameters']['query']
export type GetPayrollKPIAssessmentsDepartmentsParams =
  paths['/api/payroll/kpi-assessments/departments/']['get']['parameters']['query']
export type GetPayrollKPIAssessmentsDepartmentsExportParams =
  paths['/api/payroll/kpi-assessments/departments/export/']['get']['parameters']['query']
export type GetPayrollKPIAssessmentsDepartmentsSummaryExportParams =
  paths['/api/payroll/kpi-assessments/departments/summary/export/']['get']['parameters']['query']
export type GetPayrollKPIAssessmentsMineParams =
  paths['/api/payroll/kpi-assessments/mine/']['get']['parameters']['query']
export type GetPayrollKPIAssessmentsManagerParams =
  paths['/api/payroll/kpi-assessments/manager/']['get']['parameters']['query'] & {
    grade_hrm?: string
  }
export type GetPayrollKPIPeriodsParams =
  paths['/api/payroll/kpi-periods/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class KPIAssessmentService extends BaseApiService {
  // ===== KPI ASSESSMENTS - MINE CURRENT =====
  /**
   * Get current unfinalized assessment for authenticated employee
   */
  async getPayrollKPIAssessmentMineCurrent() {
    return await this.get(ApiPaths.payroll_kpi_assessments_mine_current_retrieve)
  }

  /**
   * Get current unfinalized assessments for department employees
   */
  async getPayrollKPIAssessmentManagerCurrent(
    params?: GetPayrollKPIAssessmentManagerCurrentParams
  ) {
    return await this.getPaginated(ApiPaths.payroll_kpi_assessments_manager_current_list, params)
  }

  // ===== KPI ASSESSMENTS - EMPLOYEES =====
  /**
   * Get all employee KPI assessments
   */
  async getPayrollKPIAssessmentsEmployees(params?: GetPayrollKPIAssessmentsEmployeesParams) {
    return await this.getPaginated(ApiPaths.payroll_kpi_assessments_employees_list, params)
  }

  /**
   * Get employee KPI assessment by ID
   */
  async getPayrollKPIAssessmentEmployee(id: number) {
    return await this.get(ApiPaths.payroll_kpi_assessments_employees_retrieve, {
      path: { id },
    })
  }

  /**
   * Update employee KPI assessment (HRM only)
   */
  async partialUpdatePayrollKPIAssessmentEmployee(
    id: number,
    requestData: PatchedEmployeeKPIAssessmentUpdateRequest
  ) {
    return await this.patch(
      ApiPaths.payroll_kpi_assessments_employees_partial_update,
      requestData,
      {
        path: { id },
      }
    )
  }

  /**
   * Export employee KPI assessments to XLSX
   */
  async exportPayrollKPIAssessmentsEmployees(
    params?: GetPayrollKPIAssessmentsEmployeesExportParams
  ) {
    return await this.get(ApiPaths.payroll_kpi_assessments_employees_export_retrieve, {
      query: params,
    })
  }

  // ===== KPI ASSESSMENTS - DEPARTMENTS =====
  /**
   * Export department KPI assessments to XLSX
   */
  async exportPayrollKPIAssessmentsDepartments(
    params?: GetPayrollKPIAssessmentsDepartmentsExportParams
  ) {
    return await this.get(ApiPaths.payroll_kpi_assessments_departments_export_retrieve, {
      query: params,
    })
  }

  /**
   * Export department KPI assessments summary report to XLSX
   */
  async exportPayrollKPIAssessmentsDepartmentsSummary(
    params?: GetPayrollKPIAssessmentsDepartmentsSummaryExportParams
  ) {
    return await this.get(ApiPaths.payroll_kpi_assessments_departments_summary_export_retrieve, {
      query: params,
    })
  }

  /**
   * Get all department KPI assessments
   */
  async getPayrollKPIAssessmentsDepartments(params?: GetPayrollKPIAssessmentsDepartmentsParams) {
    return await this.getPaginated(ApiPaths.payroll_kpi_assessments_departments_list, params)
  }

  /**
   * Get department KPI assessment by ID
   */
  async getPayrollKPIAssessmentDepartment(id: number) {
    return await this.get(ApiPaths.payroll_kpi_assessments_departments_retrieve, {
      path: { id },
    })
  }

  /**
   * Update department KPI assessment
   */
  async partialUpdatePayrollKPIAssessmentDepartment(
    id: number,
    requestData: PatchedDepartmentKPIAssessmentUpdateRequest
  ) {
    return await this.patch(
      ApiPaths.payroll_kpi_assessments_departments_partial_update,
      requestData,
      { path: { id } }
    )
  }

  // ===== KPI ASSESSMENTS - MINE =====
  /**
   * Create employee self-assessment
   */
  async createPayrollKPIAssessmentMine(requestData: EmployeeSelfAssessmentRequest) {
    return await this.post(ApiPaths.payroll_kpi_assessments_mine_create, requestData)
  }

  /**
   * Submit employee self-assessment
   */
  async submitPayrollKPIAssessmentMine(id: number) {
    return await this.post(ApiPaths.payroll_kpi_assessments_mine_submit_create, undefined, {
      path: { id },
    })
  }

  /**
   * Get employee's KPI assessments
   */
  async getPayrollKPIAssessmentsMine(params?: GetPayrollKPIAssessmentsMineParams) {
    return await this.getPaginated(ApiPaths.payroll_kpi_assessments_mine_list, params)
  }

  /**
   * Get employee's specific KPI assessment
   */
  async getPayrollKPIAssessmentMine(id: number) {
    return await this.get(ApiPaths.payroll_kpi_assessments_mine_retrieve, {
      path: { id },
    })
  }

  /**
   * Update employee self-assessment
   */
  async partialUpdatePayrollKPIAssessmentMine(
    id: number,
    requestData: PatchedEmployeeSelfAssessmentRequest
  ) {
    return await this.patch(ApiPaths.payroll_kpi_assessments_mine_partial_update, requestData, {
      path: { id },
    })
  }

  /**
   * Update employee score for a specific KPI item
   */
  async partialUpdatePayrollKPIAssessmentMineItemScore(
    id: number,
    itemId: string,
    requestData: PatchedEmployeeKPIItemRequest
  ) {
    return await this.patch(
      ApiPaths.payroll_kpi_assessments_mine_items_score_partial_update,
      requestData,
      { path: { id, item_id: itemId } }
    )
  }

  // ===== KPI ASSESSMENTS - MANAGER =====
  /**
   * Get manager's employee assessments
   */
  async getPayrollKPIAssessmentsManager(params?: GetPayrollKPIAssessmentsManagerParams) {
    return await this.getPaginated(ApiPaths.payroll_kpi_assessments_manager_list, params)
  }

  /**
   * Get specific employee assessment for manager
   */
  async getPayrollKPIAssessmentManager(id: number) {
    return await this.get(ApiPaths.payroll_kpi_assessments_manager_retrieve, {
      path: { id },
    })
  }

  /**
   * Update manager assessment
   */
  async partialUpdatePayrollKPIAssessmentManager(
    id: number,
    requestData: PatchedManagerAssessmentRequest
  ) {
    return await this.patch(ApiPaths.payroll_kpi_assessments_manager_partial_update, requestData, {
      path: { id },
    })
  }

  // ===== KPI PERIODS =====
  /**
   * Get all KPI assessment periods
   */
  async getPayrollKPIPeriods(params?: GetPayrollKPIPeriodsParams) {
    return await this.getPaginated(ApiPaths.payroll_kpi_periods_list, params)
  }

  /**
   * Get KPI assessment period by ID
   */
  async getPayrollKPIPeriod(id: number) {
    return await this.get(ApiPaths.payroll_kpi_periods_retrieve, {
      path: { id },
    })
  }

  /**
   * Get KPI assessment periods for manager
   */
  async getPayrollKPIPeriodsManager(params?: GetPayrollKPIPeriodsParams) {
    return await this.getPaginated(ApiPaths.payroll_kpi_periods_manager_list, params)
  }

  /**
   * Get KPI assessment period details for manager
   */
  async getPayrollKPIPeriodManager(id: number) {
    return await this.get(ApiPaths.payroll_kpi_periods_manager_retrieve, {
      path: { id },
    })
  }

  /**
   * Finalize KPI assessment period
   */
  async finalizePayrollKPIPeriod(id: number) {
    return await this.post(ApiPaths.payroll_kpi_periods_finalize_create, undefined, {
      path: { id },
    })
  }

  /**
   * Generate KPI assessments for a month
   */
  async generateKPIAssessmentPeriod(requestData: KPIAssessmentPeriodGenerateRequest) {
    return await this.post(ApiPaths.payroll_kpi_periods_generate_create, requestData)
  }

  /**
   * Get KPI assessment period summary
   */
  async getPayrollKPIPeriodSummary(id: number) {
    return await this.get(ApiPaths.payroll_kpi_periods_summary_retrieve, { path: { id } })
  }

  /**
   * Get KPI period async task status
   */
  async getKpiPeriodTaskStatus(taskId: string) {
    return await this.get(ApiPaths.payroll_kpi_periods_task_status_retrieve, {
      path: { task_id: taskId },
    })
  }

  async getPayrollKPIAssessmentDepartmentHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.payroll_kpi_assessments_departments_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getPayrollKPIAssessmentDepartmentHistory(id: number, logId: string) {
    return await this.get(ApiPaths.payroll_kpi_assessments_departments_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _kpiAssessmentService: KPIAssessmentService | null = null

export function getKPIAssessmentService(): KPIAssessmentService {
  if (!_kpiAssessmentService) {
    _kpiAssessmentService = new KPIAssessmentService()
  }
  return _kpiAssessmentService
}

// ===== REACT QUERY HOOKS =====
// ===== MINE CURRENT HOOKS =====
export function usePayrollKPIAssessmentMineCurrent(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MINE_CURRENT(),
    () => getKPIAssessmentService().getPayrollKPIAssessmentMineCurrent(),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function usePayrollKPIAssessmentManagerCurrent(
  params?: GetPayrollKPIAssessmentManagerCurrentParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MANAGER_CURRENT(params || {}),
    () => getKPIAssessmentService().getPayrollKPIAssessmentManagerCurrent(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

// ===== EMPLOYEES HOOKS =====
export function usePayrollKPIAssessmentsEmployees(
  params?: GetPayrollKPIAssessmentsEmployeesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.EMPLOYEES_LIST(params || {}),
    () => getKPIAssessmentService().getPayrollKPIAssessmentsEmployees(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function usePayrollKPIAssessmentEmployee(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.EMPLOYEES_DETAIL(id),
    () => getKPIAssessmentService().getPayrollKPIAssessmentEmployee(id),
    {
      enabled: (options?.enabled ?? true) && !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function usePartialUpdatePayrollKPIAssessmentEmployee() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedEmployeeKPIAssessmentUpdateRequest }) =>
      getKPIAssessmentService().partialUpdatePayrollKPIAssessmentEmployee(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.EMPLOYEES_DETAIL(variables.id),
        })
      },
    }
  )
}

export function useExportPayrollKPIAssessmentsEmployees() {
  return useExport({
    exportFunction: (params?: GetPayrollKPIAssessmentsEmployeesExportParams) =>
      getKPIAssessmentService().exportPayrollKPIAssessmentsEmployees(params),
    defaultFilename: 'kpi-assessments-employees',
  })
}

// ===== DEPARTMENTS HOOKS =====
export function usePayrollKPIAssessmentsDepartments(
  params?: GetPayrollKPIAssessmentsDepartmentsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.DEPARTMENTS_LIST(params || {}),
    () => getKPIAssessmentService().getPayrollKPIAssessmentsDepartments(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function usePayrollKPIAssessmentDepartment(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.DEPARTMENTS_DETAIL(id),
    () => getKPIAssessmentService().getPayrollKPIAssessmentDepartment(id),
    {
      enabled: (options?.enabled ?? true) && !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function usePartialUpdatePayrollKPIAssessmentDepartment() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedDepartmentKPIAssessmentUpdateRequest }) =>
      getKPIAssessmentService().partialUpdatePayrollKPIAssessmentDepartment(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.DEPARTMENTS_DETAIL(variables.id),
        })
      },
    }
  )
}

export function useExportPayrollKPIAssessmentsDepartments() {
  return useExport({
    exportFunction: (params?: GetPayrollKPIAssessmentsDepartmentsExportParams) =>
      getKPIAssessmentService().exportPayrollKPIAssessmentsDepartments(params),
    defaultFilename: 'kpi-assessments-departments',
  })
}

export function useExportPayrollKPIAssessmentsDepartmentsSummary() {
  return useExport({
    exportFunction: (params?: GetPayrollKPIAssessmentsDepartmentsSummaryExportParams) =>
      getKPIAssessmentService().exportPayrollKPIAssessmentsDepartmentsSummary(params),
    defaultFilename: 'kpi-assessments-departments-summary',
  })
}

// ===== MINE HOOKS =====
export function usePayrollKPIAssessmentsMine(
  params?: GetPayrollKPIAssessmentsMineParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MINE_LIST(params || {}),
    () => getKPIAssessmentService().getPayrollKPIAssessmentsMine(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function usePayrollKPIAssessmentMine(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MINE_DETAIL(id),
    () => getKPIAssessmentService().getPayrollKPIAssessmentMine(id),
    {
      enabled: (options?.enabled ?? true) && !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreatePayrollKPIAssessmentMine() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (data: EmployeeSelfAssessmentRequest) =>
      getKPIAssessmentService().createPayrollKPIAssessmentMine(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MINE_LIST({}),
        })
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MINE_CURRENT(),
        })
      },
    }
  )
}

export function useSubmitPayrollKPIAssessmentMine() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (id: number) => getKPIAssessmentService().submitPayrollKPIAssessmentMine(id),
    {
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MINE_DETAIL(id),
        })
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MINE_LIST({}),
        })
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MINE_CURRENT(),
        })
      },
    }
  )
}

export function usePartialUpdatePayrollKPIAssessmentMine() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedEmployeeSelfAssessmentRequest }) =>
      getKPIAssessmentService().partialUpdatePayrollKPIAssessmentMine(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MINE_DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MINE_CURRENT(),
        })
      },
    }
  )
}

export function usePartialUpdatePayrollKPIAssessmentMineItemScore() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, itemId, data }: { id: number; itemId: string; data: PatchedEmployeeKPIItemRequest }) =>
      getKPIAssessmentService().partialUpdatePayrollKPIAssessmentMineItemScore(id, itemId, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MINE_DETAIL(variables.id),
        })
      },
    }
  )
}

// ===== MANAGER HOOKS =====
export function usePayrollKPIAssessmentsManager(
  params?: GetPayrollKPIAssessmentsManagerParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MANAGER_LIST(params || {}),
    () => getKPIAssessmentService().getPayrollKPIAssessmentsManager(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function usePayrollKPIAssessmentManager(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MANAGER_DETAIL(id),
    () => getKPIAssessmentService().getPayrollKPIAssessmentManager(id),
    {
      enabled: (options?.enabled ?? true) && !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function usePartialUpdatePayrollKPIAssessmentManager() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedManagerAssessmentRequest }) =>
      getKPIAssessmentService().partialUpdatePayrollKPIAssessmentManager(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MANAGER_DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.MANAGER_CURRENT({}),
        })
      },
    }
  )
}

// ===== KPI PERIODS HOOKS =====
export function usePayrollKPIPeriods(
  params?: GetPayrollKPIPeriodsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_PERIODS.LIST(params || {}),
    () => getKPIAssessmentService().getPayrollKPIPeriods(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function usePayrollKPIPeriod(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_PERIODS.DETAIL(id),
    () => getKPIAssessmentService().getPayrollKPIPeriod(id),
    {
      enabled: (options?.enabled ?? true) && !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function usePayrollKPIPeriodsManager(
  params?: GetPayrollKPIPeriodsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_PERIODS.MANAGER_LIST(params || {}),
    () => getKPIAssessmentService().getPayrollKPIPeriodsManager(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function usePayrollKPIPeriodManager(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_PERIODS.MANAGER_DETAIL(id),
    () => getKPIAssessmentService().getPayrollKPIPeriodManager(id),
    {
      enabled: (options?.enabled ?? true) && !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useFinalizePayrollKPIPeriod() {
  const queryClient = useQueryClient()
  return useApiMutation((id: number) => getKPIAssessmentService().finalizePayrollKPIPeriod(id), {
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PAYROLL.KPI_PERIODS.DETAIL(id),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PAYROLL.KPI_PERIODS.LIST({}),
      })
    },
  })
}

export function useGenerateKPIAssessmentPeriod() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (data: KPIAssessmentPeriodGenerateRequest) =>
      getKPIAssessmentService().generateKPIAssessmentPeriod(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.KPI_PERIODS.LIST({}),
        })
      },
    }
  )
}

export function usePayrollKPIPeriodSummary(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_PERIODS.SUMMARY(id),
    () => getKPIAssessmentService().getPayrollKPIPeriodSummary(id),
    {
      enabled: (options?.enabled ?? true) && !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function usePayrollKPIAssessmentDepartmentHistories(
  id: number,
  params?: HistoriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.DEPARTMENTS_HISTORIES(id, params || {}),
    () => getKPIAssessmentService().getPayrollKPIAssessmentDepartmentHistories(id, params),
    { enabled: (options?.enabled ?? true) && !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function usePayrollKPIAssessmentDepartmentHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_ASSESSMENTS.DEPARTMENTS_HISTORY_DETAIL(id, logId),
    () => getKPIAssessmentService().getPayrollKPIAssessmentDepartmentHistory(id, logId),
    { enabled: (options?.enabled ?? true) && !!id && !!logId, staleTime: 1000 * 60 * 5 }
  )
}

type UsePayrollKPIPeriodTaskStatusOptions = {
  enabled?: boolean
  refetchIntervalMs?: number
}

/**
 * Poll the async KPI period Celery task until it reaches SUCCESS or FAILURE.
 */
export function usePayrollKPIPeriodTaskStatus(
  taskId: string,
  options?: UsePayrollKPIPeriodTaskStatusOptions
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.KPI_PERIODS.TASK_STATUS(taskId),
    () => getKPIAssessmentService().getKpiPeriodTaskStatus(taskId),
    {
      enabled: (options?.enabled ?? true) && !!taskId,
      staleTime: 1000 * 2,
      refetchInterval: (query) => {
        const state = query.state.data?.state
        if (state === KPIPeriodTaskState.SUCCESS || state === KPIPeriodTaskState.FAILURE) {
          return false
        }
        return options?.refetchIntervalMs ?? 1000 * 2
      },
    }
  )
}
