import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type SalaryPeriod = components['schemas']['SalaryPeriod']
// SalaryPeriodDetail is same as SalaryPeriod in schema
export type SalaryPeriodRequest = components['schemas']['SalaryPeriodRequest']
export type SalaryPeriodCreateAsyncRequest = components['schemas']['SalaryPeriodCreateAsyncRequest']
export type SalaryPeriodCreateResponse = components['schemas']['SalaryPeriodCreateResponse']
export type SalaryPeriodRecalculateResponse =
  components['schemas']['SalaryPeriodRecalculateResponse']
export type PatchedSalaryPeriodUpdateDeadlinesRequest =
  components['schemas']['PatchedSalaryPeriodUpdateDeadlinesRequest']
export type SendSalaryPeriodEmailsRequest = NonNullable<
  paths[ApiPaths.payroll_salary_periods_send_emails_create]['post']['requestBody']
>['content']['application/json']
export type SalaryPeriodList = components['schemas']['SalaryPeriodList']
export type PaginatedSalaryPeriodList = components['schemas']['PaginatedSalaryPeriodListList']

export type GetSalaryPeriodsParams =
  paths['/api/payroll/salary-periods/']['get']['parameters']['query']
export type GetSalaryPeriodSlipsParams =
  paths['/api/payroll/salary-periods/{id}/ready/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class SalaryPeriodService extends BaseApiService {
  /**
   * Create salary period asynchronously
   */
  async createSalaryPeriod(data: SalaryPeriodCreateAsyncRequest) {
    return await this.post(ApiPaths.payroll_salary_periods_create, data)
  }

  /**
   * Get salary periods list
   */
  async getSalaryPeriods(params?: GetSalaryPeriodsParams) {
    return await this.getPaginated(ApiPaths.payroll_salary_periods_list, params)
  }

  /**
   * Get salary period by ID
   */
  async getSalaryPeriod(id: number) {
    return await this.get(ApiPaths.payroll_salary_periods_retrieve, {
      path: { id },
    })
  }

  /**
   * Partially update salary period deadlines
   */
  async partialUpdateSalaryPeriodDeadlines(
    id: number,
    data: PatchedSalaryPeriodUpdateDeadlinesRequest
  ) {
    return await this.patch(ApiPaths.payroll_salary_periods_partial_update, data, { path: { id } })
  }

  /**
   * Get not-ready payroll slips for salary period
   */
  async getSalaryPeriodNotReadySlips(id: number, params?: GetSalaryPeriodSlipsParams) {
    return await this.get(ApiPaths.payroll_salary_periods_not_ready_list, {
      path: { id },
      query: params,
    })
  }

  /**
   * Get ready payroll slips for salary period
   */
  async getSalaryPeriodReadySlips(id: number, params?: GetSalaryPeriodSlipsParams) {
    return await this.get(ApiPaths.payroll_salary_periods_ready_list, {
      path: { id },
      query: params,
    })
  }

  /**
   * Complete salary period
   */
  async completeSalaryPeriod(id: number, data: SalaryPeriodRequest) {
    return await this.post(ApiPaths.payroll_salary_periods_complete_create, data, {
      path: { id },
    })
  }

  /**
   * Uncomplete salary period
   */
  async uncompleteSalaryPeriod(id: number) {
    return await this.post(ApiPaths.payroll_salary_periods_uncomplete_create, undefined, {
      path: { id },
    })
  }

  /**
   * Recalculate all payroll slips in salary period
   */
  async recalculateSalaryPeriod(id: number) {
    return await this.post(ApiPaths.payroll_salary_periods_recalculate_create, undefined, {
      path: { id },
    })
  }

  /**
   * Send salary period emails
   */
  async sendSalaryPeriodEmails(id: number, data: SendSalaryPeriodEmailsRequest) {
    return await this.post(ApiPaths.payroll_salary_periods_send_emails_create, data, {
      path: { id },
    })
  }

  /**
   * Get salary period histories
   */
  async getSalaryPeriodHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.payroll_salary_periods_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  /**
   * Get salary period history detail
   */
  async getSalaryPeriodHistory(id: number, logId: string) {
    return await this.get(ApiPaths.payroll_salary_periods_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  /**
   * Get salary period async task status
   */
  async getSalaryPeriodTaskStatus(taskId: string) {
    return await this.get(ApiPaths.payroll_salary_periods_task_status_retrieve, {
      path: { task_id: taskId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _salaryPeriodService: SalaryPeriodService | null = null

export function getSalaryPeriodService(): SalaryPeriodService {
  if (!_salaryPeriodService) {
    _salaryPeriodService = new SalaryPeriodService()
  }
  return _salaryPeriodService
}

// ===== REACT QUERY HOOKS =====
export function useSalaryPeriods(params?: GetSalaryPeriodsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.SALARY_PERIODS.LIST(params || {}),
    () => getSalaryPeriodService().getSalaryPeriods(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? true,
    }
  )
}

export function useSalaryPeriod(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.SALARY_PERIODS.DETAIL(id),
    () => getSalaryPeriodService().getSalaryPeriod(id),
    {
      enabled: (options?.enabled ?? true) && !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useSalaryPeriodReadySlips(
  id: number,
  params?: GetSalaryPeriodSlipsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['payroll', 'salary-periods', id, 'ready-slips', JSON.stringify(params || {})],
    () => getSalaryPeriodService().getSalaryPeriodReadySlips(id, params),
    {
      enabled: (options?.enabled ?? true) && !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useSalaryPeriodNotReadySlips(
  id: number,
  params?: GetSalaryPeriodSlipsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['payroll', 'salary-periods', id, 'not-ready-slips', JSON.stringify(params || {})],
    () => getSalaryPeriodService().getSalaryPeriodNotReadySlips(id, params),
    {
      enabled: (options?.enabled ?? true) && !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateSalaryPeriod() {
  return useApiMutation((data: SalaryPeriodCreateAsyncRequest) =>
    getSalaryPeriodService().createSalaryPeriod(data)
  )
}

export function usePartialUpdateSalaryPeriodDeadlines() {
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedSalaryPeriodUpdateDeadlinesRequest }) =>
      getSalaryPeriodService().partialUpdateSalaryPeriodDeadlines(id, data)
  )
}

export function useCompleteSalaryPeriod() {
  return useApiMutation(({ id, data }: { id: number; data: SalaryPeriodRequest }) =>
    getSalaryPeriodService().completeSalaryPeriod(id, data)
  )
}

export function useUncompleteSalaryPeriod() {
  return useApiMutation((id: number) => getSalaryPeriodService().uncompleteSalaryPeriod(id))
}

export function useRecalculateSalaryPeriod() {
  return useApiMutation((id: number) => getSalaryPeriodService().recalculateSalaryPeriod(id))
}

export function useSendSalaryPeriodEmails() {
  return useApiMutation(({ id, data }: { id: number; data: SendSalaryPeriodEmailsRequest }) =>
    getSalaryPeriodService().sendSalaryPeriodEmails(id, data)
  )
}

export function useSalaryPeriodTaskStatus(taskId: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['payroll', 'salary-periods', 'task-status', taskId],
    () => getSalaryPeriodService().getSalaryPeriodTaskStatus(taskId),
    { staleTime: 0, enabled: options?.enabled ?? !!taskId, refetchInterval: 2000 }
  )
}
