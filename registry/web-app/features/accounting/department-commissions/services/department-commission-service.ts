import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

export type DepartmentCommissionRow = components['schemas']['DepartmentCommissionRow']
export type GetDepartmentCommissionsParams =
  paths['/api/accounting/department-commissions/']['get']['parameters']['query']

class DepartmentCommissionService extends BaseApiService {
  async getDepartmentCommissions(params: GetDepartmentCommissionsParams) {
    return await this.getPaginated(ApiPaths.accounting_department_commissions_list, params)
  }
}

let _service: DepartmentCommissionService | null = null

export function getDepartmentCommissionService(): DepartmentCommissionService {
  if (!_service) _service = new DepartmentCommissionService()
  return _service
}

export function useDepartmentCommissions(
  params: GetDepartmentCommissionsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEPARTMENT_COMMISSIONS.LIST(params),
    () => getDepartmentCommissionService().getDepartmentCommissions(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}
