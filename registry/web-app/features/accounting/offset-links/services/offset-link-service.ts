import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type OffsetLink = components['schemas']['OffsetLink']
export type OffsetLinkRequest = components['schemas']['OffsetLinkRequest']
export type PatchedOffsetLinkRequest = components['schemas']['PatchedOffsetLinkRequest']
export type GetOffsetLinksParams =
  paths['/api/accounting/offset-links/']['get']['parameters']['query']

class OffsetLinkService extends BaseApiService {
  async getOffsetLinks(params?: GetOffsetLinksParams) {
    return await this.getPaginated(ApiPaths.accounting_offset_links_list, params)
  }

  async createOffsetLink(data: OffsetLinkRequest) {
    return await this.post(ApiPaths.accounting_offset_links_create, data)
  }

  async getOffsetLink(id: number) {
    return await this.get(ApiPaths.accounting_offset_links_retrieve, { path: { id } })
  }

  async updateOffsetLink(id: number, data: OffsetLinkRequest) {
    return await this.put(ApiPaths.accounting_offset_links_update, data, { path: { id } })
  }

  async partialUpdateOffsetLink(id: number, data: PatchedOffsetLinkRequest) {
    return await this.patch(ApiPaths.accounting_offset_links_partial_update, data, { path: { id } })
  }

  async deleteOffsetLink(id: number) {
    return await this.delete(ApiPaths.accounting_offset_links_destroy, { path: { id } })
  }

  async getOffsetLinkHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_offset_links_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getOffsetLinkHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_offset_links_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: OffsetLinkService | null = null

export function getOffsetLinkService(): OffsetLinkService {
  if (!_service) _service = new OffsetLinkService()
  return _service
}

export function useOffsetLinks(params?: GetOffsetLinksParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.OFFSET_LINKS.LIST(params || {}),
    () => getOffsetLinkService().getOffsetLinks(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useOffsetLink(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.OFFSET_LINKS.DETAIL(id),
    () => getOffsetLinkService().getOffsetLink(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateOffsetLink() {
  return useApiMutation((data: OffsetLinkRequest) => getOffsetLinkService().createOffsetLink(data))
}

export function useUpdateOffsetLink() {
  return useApiMutation((variables: { id: number; data: OffsetLinkRequest }) =>
    getOffsetLinkService().updateOffsetLink(variables.id, variables.data)
  )
}

export function usePartialUpdateOffsetLink() {
  return useApiMutation((variables: { id: number; data: PatchedOffsetLinkRequest }) =>
    getOffsetLinkService().partialUpdateOffsetLink(variables.id, variables.data)
  )
}

export function useDeleteOffsetLink() {
  return useApiMutation((id: number) => getOffsetLinkService().deleteOffsetLink(id))
}

export function useOffsetLinkHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.OFFSET_LINKS.HISTORIES(id, params || {}),
    () => getOffsetLinkService().getOffsetLinkHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useOffsetLinkHistory(id: number, logId: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.OFFSET_LINKS.HISTORY_DETAIL(id, logId),
    () => getOffsetLinkService().getOffsetLinkHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
