import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type SupportDeptCommissionRateConfig =
  components['schemas']['SupportDeptCommissionRateConfig']
export type PaginatedSupportDeptCommissionRateConfigList =
  components['schemas']['PaginatedSupportDeptCommissionRateConfigList']
export type SupportDeptCommissionRateConfigRequest =
  components['schemas']['SupportDeptCommissionRateConfigRequest']
export type PatchedSupportDeptCommissionRateConfigRequest =
  components['schemas']['PatchedSupportDeptCommissionRateConfigRequest']
export type GetSupportDeptCommissionRateConfigsParams =
  paths['/api/accounting/support-dept-commission-rate-configs/']['get']['parameters']['query']

export class SupportDeptCommissionRateService extends BaseApiService {
  async getConfigs(
    params?: GetSupportDeptCommissionRateConfigsParams
  ): Promise<PaginatedSupportDeptCommissionRateConfigList> {
    // getPaginated's structural type inference can collapse into a sibling list op
    // whose envelope shape matches; pin the return type to this endpoint's schema.
    return (await this.getPaginated(
      ApiPaths.accounting_support_dept_commission_rate_configs_list,
      params
    )) as PaginatedSupportDeptCommissionRateConfigList
  }

  async getConfig(id: number) {
    return await this.get(ApiPaths.accounting_support_dept_commission_rate_configs_retrieve, {
      path: { id },
    })
  }

  async createConfig(data: SupportDeptCommissionRateConfigRequest) {
    return await this.post(ApiPaths.accounting_support_dept_commission_rate_configs_create, data)
  }

  async updateConfig(id: number, data: PatchedSupportDeptCommissionRateConfigRequest) {
    return await this.patch(
      ApiPaths.accounting_support_dept_commission_rate_configs_partial_update,
      data,
      { path: { id } }
    )
  }

  async deleteConfig(id: number) {
    return await this.delete(ApiPaths.accounting_support_dept_commission_rate_configs_destroy, {
      path: { id },
    })
  }
}

let _service: SupportDeptCommissionRateService | null = null

export function getSupportDeptCommissionRateService(): SupportDeptCommissionRateService {
  if (!_service) _service = new SupportDeptCommissionRateService()
  return _service
}

export function useSupportDeptCommissionRates(
  params?: GetSupportDeptCommissionRateConfigsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.SUPPORT_DEPT_COMMISSION_RATES.LIST(params || {}),
    () => getSupportDeptCommissionRateService().getConfigs(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateSupportDeptCommissionRate() {
  return useApiMutation((data: SupportDeptCommissionRateConfigRequest) =>
    getSupportDeptCommissionRateService().createConfig(data)
  )
}

export function useUpdateSupportDeptCommissionRate() {
  return useApiMutation(
    (variables: { id: number; data: PatchedSupportDeptCommissionRateConfigRequest }) =>
      getSupportDeptCommissionRateService().updateConfig(variables.id, variables.data)
  )
}

export function useDeleteSupportDeptCommissionRate() {
  return useApiMutation((id: number) => getSupportDeptCommissionRateService().deleteConfig(id))
}
