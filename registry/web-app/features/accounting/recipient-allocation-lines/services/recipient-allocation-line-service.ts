import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type RecipientAllocationLine = components['schemas']['RecipientAllocationLine']
export type RecipientAllocationLineRequest = components['schemas']['RecipientAllocationLineRequest']
export type PatchedRecipientAllocationLineRequest =
  components['schemas']['PatchedRecipientAllocationLineRequest']
export type GetRecipientAllocationLinesParams =
  paths['/api/accounting/recipient-allocation-lines/']['get']['parameters']['query']

class RecipientAllocationLineService extends BaseApiService {
  async getRecipientAllocationLines(params?: GetRecipientAllocationLinesParams) {
    return await this.getPaginated(ApiPaths.accounting_recipient_allocation_lines_list, params)
  }

  async createRecipientAllocationLine(data: RecipientAllocationLineRequest) {
    return await this.post(ApiPaths.accounting_recipient_allocation_lines_create, data)
  }

  async getRecipientAllocationLine(id: number) {
    return await this.get(ApiPaths.accounting_recipient_allocation_lines_retrieve, { path: { id } })
  }

  async updateRecipientAllocationLine(id: number, data: RecipientAllocationLineRequest) {
    return await this.put(ApiPaths.accounting_recipient_allocation_lines_update, data, {
      path: { id },
    })
  }

  async partialUpdateRecipientAllocationLine(
    id: number,
    data: PatchedRecipientAllocationLineRequest
  ) {
    return await this.patch(ApiPaths.accounting_recipient_allocation_lines_partial_update, data, {
      path: { id },
    })
  }

  async deleteRecipientAllocationLine(id: number) {
    return await this.delete(ApiPaths.accounting_recipient_allocation_lines_destroy, {
      path: { id },
    })
  }

  async getRecipientAllocationLineHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_recipient_allocation_lines_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getRecipientAllocationLineHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_recipient_allocation_lines_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: RecipientAllocationLineService | null = null

export function getRecipientAllocationLineService(): RecipientAllocationLineService {
  if (!_service) _service = new RecipientAllocationLineService()
  return _service
}

export function useRecipientAllocationLines(
  params?: GetRecipientAllocationLinesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.RECIPIENT_ALLOCATION_LINES.LIST(params || {}),
    () => getRecipientAllocationLineService().getRecipientAllocationLines(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useRecipientAllocationLine(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.RECIPIENT_ALLOCATION_LINES.DETAIL(id),
    () => getRecipientAllocationLineService().getRecipientAllocationLine(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateRecipientAllocationLine() {
  return useApiMutation((data: RecipientAllocationLineRequest) =>
    getRecipientAllocationLineService().createRecipientAllocationLine(data)
  )
}

export function useUpdateRecipientAllocationLine() {
  return useApiMutation((variables: { id: number; data: RecipientAllocationLineRequest }) =>
    getRecipientAllocationLineService().updateRecipientAllocationLine(variables.id, variables.data)
  )
}

export function usePartialUpdateRecipientAllocationLine() {
  return useApiMutation((variables: { id: number; data: PatchedRecipientAllocationLineRequest }) =>
    getRecipientAllocationLineService().partialUpdateRecipientAllocationLine(
      variables.id,
      variables.data
    )
  )
}

export function useDeleteRecipientAllocationLine() {
  return useApiMutation((id: number) =>
    getRecipientAllocationLineService().deleteRecipientAllocationLine(id)
  )
}

export function useRecipientAllocationLineHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.RECIPIENT_ALLOCATION_LINES.HISTORIES(id, params || {}),
    () => getRecipientAllocationLineService().getRecipientAllocationLineHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useRecipientAllocationLineHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.RECIPIENT_ALLOCATION_LINES.HISTORY_DETAIL(id, logId),
    () => getRecipientAllocationLineService().getRecipientAllocationLineHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
