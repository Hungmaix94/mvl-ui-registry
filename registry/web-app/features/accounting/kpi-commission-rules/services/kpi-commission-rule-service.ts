import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import {
  type GetKpiCommissionStructuresParams,
  type KpiCommissionStructureRequest,
} from '../types/kpi-commission-rule-types'

export type KpiCommissionRuleRequest = components['schemas']['KpiCommissionRuleRequest']

export class KpiCommissionRuleService extends BaseApiService {
  async getKpiCommissionRules(params?: GetKpiCommissionStructuresParams) {
    return await this.getPaginated(ApiPaths.accounting_kpi_commission_structures_list, params)
  }

  async createKpiCommissionRule(data: KpiCommissionStructureRequest) {
    return await this.post(ApiPaths.accounting_kpi_commission_structures_create, data)
  }

  async getKpiCommissionRule(id: number) {
    return await this.get(ApiPaths.accounting_kpi_commission_structures_retrieve, { path: { id } })
  }

  async updateKpiCommissionRule(id: number, data: KpiCommissionStructureRequest) {
    return await this.put(ApiPaths.accounting_kpi_commission_structures_update, data, {
      path: { id },
    })
  }

  async deleteKpiCommissionRule(id: number) {
    return await this.delete(ApiPaths.accounting_kpi_commission_structures_destroy, {
      path: { id },
    })
  }

  async activateKpiCommissionRule(id: number) {
    return await this.post(
      ApiPaths.accounting_kpi_commission_structures_activate_create,
      {} as unknown as KpiCommissionStructureRequest,
      {
        path: { id },
      }
    )
  }

  async getKpiCommissionRuleHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_kpi_commission_structures_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  // ── Resource /api/accounting/kpi-commission-rules/ (quy tắc hoa hồng KPI quản lý) ──
  // CRUD chính (list/create/retrieve/patch/destroy) nằm ở manager-kpi-service
  // (feature manager-kpis); tại đây bổ sung PUT replace + 2 endpoint lịch sử.

  async replaceManagerKpiRule(id: number, data: KpiCommissionRuleRequest) {
    return await this.put(ApiPaths.accounting_kpi_commission_rules_update, data, {
      path: { id },
    })
  }

  async getManagerKpiRuleHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_kpi_commission_rules_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getManagerKpiRuleHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_kpi_commission_rules_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: KpiCommissionRuleService | null = null

export function getKpiCommissionRuleService(): KpiCommissionRuleService {
  if (!_service) _service = new KpiCommissionRuleService()
  return _service
}

export function useKpiCommissionRules(
  params?: GetKpiCommissionStructuresParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_COMMISSION_STRUCTURES.LIST(params || {}),
    () => getKpiCommissionRuleService().getKpiCommissionRules(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useKpiCommissionRule(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_COMMISSION_STRUCTURES.DETAIL(id),
    () => getKpiCommissionRuleService().getKpiCommissionRule(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateKpiCommissionRule() {
  return useApiMutation((data: KpiCommissionStructureRequest) =>
    getKpiCommissionRuleService().createKpiCommissionRule(data)
  )
}

export function useUpdateKpiCommissionRule() {
  return useApiMutation((variables: { id: number; data: KpiCommissionStructureRequest }) =>
    getKpiCommissionRuleService().updateKpiCommissionRule(variables.id, variables.data)
  )
}

export function useDeleteKpiCommissionRule() {
  return useApiMutation((id: number) => getKpiCommissionRuleService().deleteKpiCommissionRule(id))
}

export function useActivateKpiCommissionRule() {
  return useApiMutation((id: number) => getKpiCommissionRuleService().activateKpiCommissionRule(id))
}

export function useKpiCommissionRuleHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_COMMISSION_STRUCTURES.HISTORIES(id, params || {}),
    () => getKpiCommissionRuleService().getKpiCommissionRuleHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useReplaceManagerKpiRule() {
  return useApiMutation((variables: { id: number; data: KpiCommissionRuleRequest }) =>
    getKpiCommissionRuleService().replaceManagerKpiRule(variables.id, variables.data)
  )
}

export function useManagerKpiRuleHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_COMMISSION_RULES.HISTORIES(id, params || {}),
    () => getKpiCommissionRuleService().getManagerKpiRuleHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useManagerKpiRuleHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.KPI_COMMISSION_RULES.HISTORY_DETAIL(id, logId),
    () => getKpiCommissionRuleService().getManagerKpiRuleHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
export type { GetKpiCommissionStructuresParams, KpiCommissionStructureRequest }
