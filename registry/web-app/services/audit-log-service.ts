import { BaseApiService } from '@/api/base-service'
import { ApiPaths, type components, type paths } from '@/api/schema.ts'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'
import type { UseQueryOptions } from '@tanstack/react-query'

// Type definitions from generated schema
export type AuditLog = components['schemas']['AuditLog']
export type AuditLogSummary = components['schemas']['AuditLogSummary']
export type AuditLogSearchResponse = components['schemas']['AuditLogSearchResponse']

// Request parameter types
export type GetAuditLogDetailParams =
  paths['/api/audit-logs/detail/{log_id}/']['get']['parameters']['path']
export type GetAuditLogSearchParams = paths['/api/audit-logs/search/']['get']['parameters']['query']

/**
 * Audit Log service extending the base API service
 * Provides audit log-related API operations (read-only)
 */
export class AuditLogService extends BaseApiService {
  /**
   * Get audit log detail by log ID
   */
  async getAuditLogDetail(logId: string) {
    return await this.get(ApiPaths.audit_logs_detail_retrieve, {
      path: { log_id: logId },
    })
  }

  /**
   * Search audit logs
   */
  async searchAuditLogs(params?: GetAuditLogSearchParams) {
    return await this.get(ApiPaths.audit_logs_search_retrieve, {
      query: params,
    })
  }
}

// Create service instance via factory (lazy construction)
let _auditLogService: AuditLogService | null = null

export function getAuditLogService(): AuditLogService {
  if (!_auditLogService) {
    _auditLogService = new AuditLogService()
  }
  return _auditLogService
}

// For backward compatibility, export a getter
export const auditLogService = {
  get instance() {
    return getAuditLogService()
  },
}

// React Query hooks for audit log operations
export function useAuditLogDetail(logId: string) {
  return useApiQuery(
    QUERY_KEYS.AUDIT_LOGS.DETAIL(logId),
    () => getAuditLogService().getAuditLogDetail(logId),
    {
      enabled: !!logId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

type UseAuditLogSearchOptions = Omit<
  UseQueryOptions<AuditLogSearchResponse, Error>,
  'queryKey' | 'queryFn'
>

export function useAuditLogSearch(
  params?: GetAuditLogSearchParams,
  options?: UseAuditLogSearchOptions
) {
  return useApiQuery(
    QUERY_KEYS.AUDIT_LOGS.SEARCH(params || {}),
    () => getAuditLogService().searchAuditLogs(params),
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      ...options,
    }
  )
}
