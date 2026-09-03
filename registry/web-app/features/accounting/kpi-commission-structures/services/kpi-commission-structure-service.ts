import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type KpiCommissionStructure = components['schemas']['KpiCommissionStructure']
export type KpiCommissionStructureRequest = components['schemas']['KpiCommissionStructureRequest']
export type PatchedKpiCommissionStructureRequest =
  components['schemas']['PatchedKpiCommissionStructureRequest']
export type GetKpiCommissionStructuresParams =
  paths['/api/accounting/kpi-commission-structures/']['get']['parameters']['query']

class KpiCommissionStructureService extends BaseApiService {
  async getKpiCommissionStructures(params?: GetKpiCommissionStructuresParams) {
    return await this.getPaginated(ApiPaths.accounting_kpi_commission_structures_list, params)
  }

  async createKpiCommissionStructure(data: KpiCommissionStructureRequest) {
    return await this.post(ApiPaths.accounting_kpi_commission_structures_create, data)
  }

  async getKpiCommissionStructure(id: number) {
    return await this.get(ApiPaths.accounting_kpi_commission_structures_retrieve, { path: { id } })
  }

  async updateKpiCommissionStructure(id: number, data: KpiCommissionStructureRequest) {
    return await this.put(ApiPaths.accounting_kpi_commission_structures_update, data, {
      path: { id },
    })
  }

  async partialUpdateKpiCommissionStructure(
    id: number,
    data: PatchedKpiCommissionStructureRequest
  ) {
    return await this.patch(ApiPaths.accounting_kpi_commission_structures_partial_update, data, {
      path: { id },
    })
  }

  async deleteKpiCommissionStructure(id: number) {
    return await this.delete(ApiPaths.accounting_kpi_commission_structures_destroy, {
      path: { id },
    })
  }

  async getKpiCommissionStructureHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_kpi_commission_structures_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getKpiCommissionStructureHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_kpi_commission_structures_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: KpiCommissionStructureService | null = null

export function getKpiCommissionStructureService(): KpiCommissionStructureService {
  if (!_service) _service = new KpiCommissionStructureService()
  return _service
}

export function useKpiCommissionStructures(
  params?: GetKpiCommissionStructuresParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_COMMISSION_STRUCTURES.LIST(params || {}),
    () => getKpiCommissionStructureService().getKpiCommissionStructures(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useKpiCommissionStructure(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_COMMISSION_STRUCTURES.DETAIL(id),
    () => getKpiCommissionStructureService().getKpiCommissionStructure(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateKpiCommissionStructure() {
  return useApiMutation((data: KpiCommissionStructureRequest) =>
    getKpiCommissionStructureService().createKpiCommissionStructure(data)
  )
}

export function useUpdateKpiCommissionStructure() {
  return useApiMutation((variables: { id: number; data: KpiCommissionStructureRequest }) =>
    getKpiCommissionStructureService().updateKpiCommissionStructure(variables.id, variables.data)
  )
}

export function usePartialUpdateKpiCommissionStructure() {
  return useApiMutation((variables: { id: number; data: PatchedKpiCommissionStructureRequest }) =>
    getKpiCommissionStructureService().partialUpdateKpiCommissionStructure(
      variables.id,
      variables.data
    )
  )
}

export function useDeleteKpiCommissionStructure() {
  return useApiMutation((id: number) =>
    getKpiCommissionStructureService().deleteKpiCommissionStructure(id)
  )
}

export function useKpiCommissionStructureHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_COMMISSION_STRUCTURES.HISTORIES(id, params || {}),
    () => getKpiCommissionStructureService().getKpiCommissionStructureHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useKpiCommissionStructureHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_COMMISSION_STRUCTURES.HISTORY_DETAIL(id, logId),
    () => getKpiCommissionStructureService().getKpiCommissionStructureHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
