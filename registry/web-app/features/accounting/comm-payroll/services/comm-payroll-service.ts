import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type CommissionPayrollRow = components['schemas']['CommissionPayrollRow']
export type CommissionPayrollDetail = components['schemas']['CommissionPayrollDetail']
export type CommissionPayrollSummary = components['schemas']['CommissionPayrollSummary']
export type GetCommPayrollsParams =
  paths['/api/accounting/comm-payroll/{role}/']['get']['parameters']['query']
export type GetCommPayrollSummaryParams =
  paths['/api/accounting/comm-payroll/{role}/summary/']['get']['parameters']['query']

class CommPayrollService extends BaseApiService {
  async getCommPayrolls(role: string, params: GetCommPayrollsParams) {
    return await this.getPaginated(ApiPaths.accounting_comm_payroll_list, params, { role })
  }

  async getCommPayroll(role: string, id: number) {
    return await this.get(ApiPaths.accounting_comm_payroll_retrieve, { path: { role, id } })
  }

  async approveCommPayroll(role: string, id: number) {
    return await this.patch(ApiPaths.accounting_comm_payroll_approve_partial_update, undefined, {
      path: { role, id },
    })
  }

  async markPaidCommPayroll(role: string, id: number) {
    return await this.patch(ApiPaths.accounting_comm_payroll_mark_paid_partial_update, undefined, {
      path: { role, id },
    })
  }

  async getCommPayrollSummary(role: string, params: GetCommPayrollSummaryParams) {
    return await this.get(ApiPaths.accounting_comm_payroll_summary_retrieve, {
      path: { role },
      query: params,
    })
  }
}

let _service: CommPayrollService | null = null

export function getCommPayrollService(): CommPayrollService {
  if (!_service) _service = new CommPayrollService()
  return _service
}

export function useCommPayrolls(
  role: string,
  params: GetCommPayrollsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMM_PAYROLL.LIST(role, params),
    () => getCommPayrollService().getCommPayrolls(role, params),
    { enabled: !!role && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCommPayroll(role: string, id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMM_PAYROLL.DETAIL(role, id),
    () => getCommPayrollService().getCommPayroll(role, id),
    { enabled: !!role && !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveCommPayroll() {
  return useApiMutation((variables: { role: string; id: number }) =>
    getCommPayrollService().approveCommPayroll(variables.role, variables.id)
  )
}

export function useMarkPaidCommPayroll() {
  return useApiMutation((variables: { role: string; id: number }) =>
    getCommPayrollService().markPaidCommPayroll(variables.role, variables.id)
  )
}

export function useCommPayrollSummary(
  role: string,
  params: GetCommPayrollSummaryParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMM_PAYROLL.SUMMARY(role, params),
    () => getCommPayrollService().getCommPayrollSummary(role, params),
    { enabled: !!role && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
