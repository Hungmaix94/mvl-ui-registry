import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type KpiStructure = components['schemas']['KpiCommissionStructure']
export type KpiStructureRequest = components['schemas']['KpiCommissionStructureRequest']
export type PatchedKpiStructureRequest =
  components['schemas']['PatchedKpiCommissionStructureRequest']
export type GetKpiStructuresParams =
  paths['/api/accounting/kpi-structures/']['get']['parameters']['query']

class KpiStructureService extends BaseApiService {
  async getKpiStructures(params?: GetKpiStructuresParams) {
    return await this.getPaginated(ApiPaths.accounting_kpi_structures_list, params)
  }

  async createKpiStructure(data: KpiStructureRequest) {
    return await this.post(ApiPaths.accounting_kpi_structures_create, data)
  }

  async getKpiStructure(id: number) {
    return await this.get(ApiPaths.accounting_kpi_structures_retrieve, { path: { id } })
  }

  async updateKpiStructure(id: number, data: KpiStructureRequest) {
    return await this.put(ApiPaths.accounting_kpi_structures_update, data, { path: { id } })
  }

  async partialUpdateKpiStructure(id: number, data: PatchedKpiStructureRequest) {
    return await this.patch(ApiPaths.accounting_kpi_structures_partial_update, data, {
      path: { id },
    })
  }

  async deleteKpiStructure(id: number) {
    return await this.delete(ApiPaths.accounting_kpi_structures_destroy, { path: { id } })
  }

  async activateKpiStructure(id: number) {
    return await this.post(ApiPaths.accounting_kpi_structures_activate_create, undefined, {
      path: { id },
    })
  }

  async getKpiStructureHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_kpi_structures_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getKpiStructureHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_kpi_structures_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: KpiStructureService | null = null

export function getKpiStructureService(): KpiStructureService {
  if (!_service) _service = new KpiStructureService()
  return _service
}

export function useKpiStructures(params?: GetKpiStructuresParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_STRUCTURES.LIST(params || {}),
    () => getKpiStructureService().getKpiStructures(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useKpiStructure(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_STRUCTURES.DETAIL(id),
    () => getKpiStructureService().getKpiStructure(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateKpiStructure() {
  return useApiMutation((data: KpiStructureRequest) =>
    getKpiStructureService().createKpiStructure(data)
  )
}

export function useUpdateKpiStructure() {
  return useApiMutation((variables: { id: number; data: KpiStructureRequest }) =>
    getKpiStructureService().updateKpiStructure(variables.id, variables.data)
  )
}

export function usePartialUpdateKpiStructure() {
  return useApiMutation((variables: { id: number; data: PatchedKpiStructureRequest }) =>
    getKpiStructureService().partialUpdateKpiStructure(variables.id, variables.data)
  )
}

export function useDeleteKpiStructure() {
  return useApiMutation((id: number) => getKpiStructureService().deleteKpiStructure(id))
}

export function useActivateKpiStructure() {
  return useApiMutation((id: number) => getKpiStructureService().activateKpiStructure(id))
}

export function useKpiStructureHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_STRUCTURES.HISTORIES(id, params || {}),
    () => getKpiStructureService().getKpiStructureHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useKpiStructureHistory(id: number, logId: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_STRUCTURES.HISTORY_DETAIL(id, logId),
    () => getKpiStructureService().getKpiStructureHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
