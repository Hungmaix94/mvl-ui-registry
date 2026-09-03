import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

export type AccountantDashboardSummary = components['schemas']['AccountantDashboardSummary']
export type AccountantDashboardDebtTrend = components['schemas']['AccountantDashboardDebtTrend']
export type AccountantDashboardDebtTrendMonth =
  components['schemas']['AccountantDashboardDebtTrendMonth']
export type AccountantDashboardCommissionPayable =
  components['schemas']['AccountantDashboardCommissionPayable']
export type AccountantDashboardCommissionTrend =
  components['schemas']['AccountantDashboardCommissionTrend']
export type AccountantDashboardCommissionTrendMonth =
  components['schemas']['AccountantDashboardCommissionTrendMonth']
export type AccountantDashboardPartnerTable =
  components['schemas']['AccountantDashboardPartnerTable']
export type AccountantDashboardPartnerRow = components['schemas']['AccountantDashboardPartnerRow']

export type GetAccountantDashboardDebtTrendParams =
  paths['/api/accounting/accountant-dashboard/debt-trend/']['get']['parameters']['query']
export type GetAccountantDashboardCommissionTrendParams =
  paths['/api/accounting/accountant-dashboard/commission-trend/']['get']['parameters']['query']
export type GetAccountantDashboardPartnerTableParams =
  paths['/api/accounting/accountant-dashboard/partner-table/']['get']['parameters']['query']
export type GetAccountantDashboardExportParams =
  paths['/api/accounting/accountant-dashboard/export/']['get']['parameters']['query']

class AccountantDashboardService extends BaseApiService {
  async getSummary() {
    return await this.get(ApiPaths.accounting_accountant_dashboard_summary_retrieve)
  }

  async getDebtTrend(params?: GetAccountantDashboardDebtTrendParams) {
    return await this.get(ApiPaths.accounting_accountant_dashboard_debt_trend_retrieve, {
      query: params,
    })
  }

  async getCommissionPayable() {
    return await this.get(ApiPaths.accounting_accountant_dashboard_commission_payable_retrieve)
  }

  async getCommissionTrend(params?: GetAccountantDashboardCommissionTrendParams) {
    return await this.get(ApiPaths.accounting_accountant_dashboard_commission_trend_retrieve, {
      query: params,
    })
  }

  async getPartnerTable(params?: GetAccountantDashboardPartnerTableParams) {
    return await this.get(ApiPaths.accounting_accountant_dashboard_partner_table_retrieve, {
      query: params,
    })
  }

  async exportPartnerTable(params?: GetAccountantDashboardExportParams): Promise<void> {
    // openapi-fetch cannot infer binary-only (xlsx) responses — narrow cast, same as other export services
    const response = (await this.client.GET(
      ApiPaths.accounting_accountant_dashboard_export_retrieve,
      {
        params: { query: params },
        parseAs: 'blob',
      }
    )) as unknown as { data?: Blob; error?: unknown }

    if (response.error) throw response.error

    const blob = response.data as Blob
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    const from = params?.from ? `_${params.from}` : ''
    const to = params?.to ? `_${params.to}` : ''
    link.setAttribute('download', `accountant_dashboard${from}${to}.xlsx`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }
}

let _service: AccountantDashboardService | null = null

export function getAccountantDashboardService(): AccountantDashboardService {
  if (!_service) _service = new AccountantDashboardService()
  return _service
}

export function useAccountantDashboardSummary(options?: { enabled?: boolean }) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.ACCOUNTANT_DASHBOARD.SUMMARY()],
    () => getAccountantDashboardService().getSummary(),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useAccountantDashboardDebtTrend(
  params?: GetAccountantDashboardDebtTrendParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.ACCOUNTANT_DASHBOARD.DEBT_TREND(), JSON.stringify(params ?? {})],
    () => getAccountantDashboardService().getDebtTrend(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useAccountantDashboardCommissionPayable(options?: { enabled?: boolean }) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.ACCOUNTANT_DASHBOARD.COMMISSION_PAYABLE()],
    () => getAccountantDashboardService().getCommissionPayable(),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useAccountantDashboardCommissionTrend(
  params?: GetAccountantDashboardCommissionTrendParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [
      ...QUERY_KEYS.ACCOUNTING.ACCOUNTANT_DASHBOARD.COMMISSION_TREND(),
      JSON.stringify(params ?? {}),
    ],
    () => getAccountantDashboardService().getCommissionTrend(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useAccountantDashboardPartnerTable(
  params?: GetAccountantDashboardPartnerTableParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    [...QUERY_KEYS.ACCOUNTING.ACCOUNTANT_DASHBOARD.PARTNER_TABLE(), JSON.stringify(params ?? {})],
    () => getAccountantDashboardService().getPartnerTable(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}
