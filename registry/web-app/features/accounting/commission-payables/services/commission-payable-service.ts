import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

export type CommissionPayable = components['schemas']['CommissionPayable']
export type PayableByUnitGroup = components['schemas']['PayableByUnitGroup']
export type GetCommissionPayablesParams =
  paths['/api/accounting/commission-payables/']['get']['parameters']['query']
export type GetCommissionPayablesByUnitParams =
  paths['/api/accounting/commission-payables/by-unit/']['get']['parameters']['query']

class CommissionPayableService extends BaseApiService {
  async getCommissionPayables(params?: GetCommissionPayablesParams) {
    return await this.getPaginated(ApiPaths.accounting_commission_payables_list, params)
  }

  async getCommissionPayable(id: number) {
    return await this.get(ApiPaths.accounting_commission_payables_retrieve, { path: { id } })
  }

  async getCommissionPayablesByUnit(params: GetCommissionPayablesByUnitParams) {
    return await this.getPaginated(ApiPaths.accounting_commission_payables_by_unit_list, params)
  }
}

let _service: CommissionPayableService | null = null

export function getCommissionPayableService(): CommissionPayableService {
  if (!_service) _service = new CommissionPayableService()
  return _service
}

export function useCommissionPayables(
  params?: GetCommissionPayablesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_PAYABLES.LIST(params || {}),
    () => getCommissionPayableService().getCommissionPayables(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionPayable(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_PAYABLES.DETAIL(id),
    () => getCommissionPayableService().getCommissionPayable(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCommissionPayablesByUnit(
  params: GetCommissionPayablesByUnitParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.COMMISSION_PAYABLES.BY_UNIT(params),
    () => getCommissionPayableService().getCommissionPayablesByUnit(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}
