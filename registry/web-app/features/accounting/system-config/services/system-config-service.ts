import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type SystemConfig = components['schemas']['SystemConfig']
export type PatchedSystemConfigRequest = components['schemas']['PatchedSystemConfigRequest']

class SystemConfigService extends BaseApiService {
  async getSystemConfigs() {
    return await this.getPaginated(ApiPaths.accounting_system_config_list)
  }

  async getSystemConfig(id: string) {
    return await this.get(ApiPaths.accounting_system_config_retrieve, { path: { id } })
  }

  async partialUpdateSystemConfig(id: string, data: PatchedSystemConfigRequest) {
    return await this.patch(ApiPaths.accounting_system_config_partial_update, data, {
      path: { id },
    })
  }

  async getSystemConfigHistories(id: string, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_system_config_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  async getSystemConfigHistory(id: string, logId: string) {
    return await this.get(ApiPaths.accounting_system_config_history_retrieve, {
      path: { id, log_id: logId },
    })
  }
}

let _service: SystemConfigService | null = null

export function getSystemConfigService(): SystemConfigService {
  if (!_service) _service = new SystemConfigService()
  return _service
}

export function useSystemConfigs(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.SYSTEM_CONFIG.LIST({}),
    () => getSystemConfigService().getSystemConfigs(),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useSystemConfig(id: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.SYSTEM_CONFIG.DETAIL(id),
    () => getSystemConfigService().getSystemConfig(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function usePartialUpdateSystemConfig() {
  return useApiMutation((variables: { id: string; data: PatchedSystemConfigRequest }) =>
    getSystemConfigService().partialUpdateSystemConfig(variables.id, variables.data)
  )
}

export function useSystemConfigHistories(
  id: string,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.SYSTEM_CONFIG.HISTORIES(id, params || {}),
    () => getSystemConfigService().getSystemConfigHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useSystemConfigHistory(id: string, logId: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.SYSTEM_CONFIG.HISTORY_DETAIL(id, logId),
    () => getSystemConfigService().getSystemConfigHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
