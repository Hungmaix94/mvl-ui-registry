import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type KpiCommissionRule = components['schemas']['KpiCommissionRule']
export type KpiCommissionRuleRequest = components['schemas']['KpiCommissionRuleRequest']
export type PatchedKpiCommissionRuleRequest =
  components['schemas']['PatchedKpiCommissionRuleRequest']

export type GetKpiCommissionRulesParams =
  paths['/api/accounting/kpi-commission-rules/']['get']['parameters']['query']

export class ManagerKpiRuleService extends BaseApiService {
  async getRules(params?: GetKpiCommissionRulesParams) {
    return await this.getPaginated(ApiPaths.accounting_kpi_commission_rules_list, params)
  }

  async createRule(data: KpiCommissionRuleRequest) {
    return await this.post(ApiPaths.accounting_kpi_commission_rules_create, data)
  }

  async getRule(id: number) {
    return await this.get(ApiPaths.accounting_kpi_commission_rules_retrieve, { path: { id } })
  }

  async updateRule(id: number, data: PatchedKpiCommissionRuleRequest) {
    return await this.patch(ApiPaths.accounting_kpi_commission_rules_partial_update, data, {
      path: { id },
    })
  }

  async deleteRule(id: number) {
    return await this.delete(ApiPaths.accounting_kpi_commission_rules_destroy, { path: { id } })
  }
}

export const managerKpiRuleService = new ManagerKpiRuleService()

export const useManagerKpiRules = (
  params?: GetKpiCommissionRulesParams,
  options?: { enabled?: boolean }
) => {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_COMMISSION_RULES.LIST(params || {}),
    () => managerKpiRuleService.getRules(params),
    options
  )
}

export const useManagerKpiRule = (id: number) => {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_COMMISSION_RULES.DETAIL(id),
    () => managerKpiRuleService.getRule(id),
    { enabled: !!id }
  )
}

export const useCreateManagerKpiRule = () => {
  return useApiMutation((data: KpiCommissionRuleRequest) => managerKpiRuleService.createRule(data))
}

export const useUpdateManagerKpiRule = () => {
  return useApiMutation(({ id, data }: { id: number; data: PatchedKpiCommissionRuleRequest }) =>
    managerKpiRuleService.updateRule(id, data)
  )
}

export const useDeleteManagerKpiRule = () => {
  return useApiMutation((id: number) => managerKpiRuleService.deleteRule(id))
}
