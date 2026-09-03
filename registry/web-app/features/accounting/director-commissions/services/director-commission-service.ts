import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type ProjectDirectorCommissionPeriod =
  components['schemas']['ProjectDirectorCommissionPeriod']
export type ProjectDirectorCommissionAdjustment =
  components['schemas']['ProjectDirectorCommissionAdjustment']
export type ProjectDirectorCommissionInputRequest =
  components['schemas']['ProjectDirectorCommissionInputRequest']
export type PatchedProjectDirectorCommissionInputRequest =
  components['schemas']['PatchedProjectDirectorCommissionInputRequest']
export type ProjectDirectorCommissionVoidRequest =
  components['schemas']['ProjectDirectorCommissionVoidRequest']
export type DirectorCommissionPreviewResponse =
  components['schemas']['DirectorCommissionPreviewResponse']
export type DirectorCommissionLedgerRow = components['schemas']['DirectorCommissionLedgerRow']
export type DirectorCommissionReceiptRow = components['schemas']['DirectorCommissionReceiptRow']
export type GetDirectorCommissionsParams =
  paths['/api/accounting/director-commissions/']['get']['parameters']['query']

class DirectorCommissionService extends BaseApiService {
  async getDirectorCommissions(params?: GetDirectorCommissionsParams) {
    return await this.getPaginated(ApiPaths.accounting_director_commissions_list, params)
  }

  async getDirectorCommission(id: number) {
    return await this.get(ApiPaths.accounting_director_commissions_retrieve, { path: { id } })
  }

  async createDirectorCommission(data: ProjectDirectorCommissionInputRequest) {
    return await this.post(ApiPaths.accounting_director_commissions_create, data)
  }

  async partialUpdateDirectorCommission(
    id: number,
    data: PatchedProjectDirectorCommissionInputRequest
  ) {
    return await this.patch(ApiPaths.accounting_director_commissions_partial_update, data, {
      path: { id },
    })
  }

  async deleteDirectorCommission(id: number) {
    return await this.delete(ApiPaths.accounting_director_commissions_destroy, { path: { id } })
  }

  async previewDirectorCommission(data: ProjectDirectorCommissionInputRequest) {
    return await this.post(ApiPaths.accounting_director_commissions_preview_create, data)
  }

  async confirmDirectorCommission(id: number) {
    return await this.post(
      ApiPaths.accounting_director_commissions_confirm_create,
      {},
      {
        path: { id },
      }
    )
  }

  async reopenDirectorCommission(id: number) {
    return await this.post(
      ApiPaths.accounting_director_commissions_reopen_create,
      {},
      {
        path: { id },
      }
    )
  }

  async recomputeDirectorCommission(id: number) {
    return await this.post(
      ApiPaths.accounting_director_commissions_recompute_create,
      {},
      {
        path: { id },
      }
    )
  }

  async voidDirectorCommission(id: number, data: ProjectDirectorCommissionVoidRequest) {
    return await this.post(ApiPaths.accounting_director_commissions_void_create, data, {
      path: { id },
    })
  }

  // Full reconciliation history: fetch EVERY page so the running-balance table shows
  // all periods (mirror of the promotion deals-table all-pages loop).
  async getLedgerDirectorCommission(
    id: number
  ): Promise<{ results: DirectorCommissionLedgerRow[] }> {
    const pageSize = 100
    const results: DirectorCommissionLedgerRow[] = []
    let page = 1
    for (;;) {
      const resp = await this.get(ApiPaths.accounting_director_commissions_ledger_list, {
        path: { id },
        query: { page, page_size: pageSize },
      })
      const rows = resp?.results ?? []
      results.push(...rows)
      if (!resp?.next || rows.length === 0) break
      page += 1
    }
    return { results }
  }

  async getReceiptsDirectorCommission(
    id: number
  ): Promise<{ results: DirectorCommissionReceiptRow[] }> {
    const pageSize = 100
    const results: DirectorCommissionReceiptRow[] = []
    let page = 1
    for (;;) {
      const resp = await this.get(ApiPaths.accounting_director_commissions_receipts_list, {
        path: { id },
        query: { page, page_size: pageSize },
      })
      const rows = resp?.results ?? []
      results.push(...rows)
      if (!resp?.next || rows.length === 0) break
      page += 1
    }
    return { results }
  }
}

let _service: DirectorCommissionService | null = null

export function getDirectorCommissionService(): DirectorCommissionService {
  if (!_service) _service = new DirectorCommissionService()
  return _service
}

export function useDirectorCommissions(
  params?: GetDirectorCommissionsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DIRECTOR_COMMISSIONS.LIST(params || {}),
    () => getDirectorCommissionService().getDirectorCommissions(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useDirectorCommission(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DIRECTOR_COMMISSIONS.DETAIL(id),
    () => getDirectorCommissionService().getDirectorCommission(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateDirectorCommission() {
  return useApiMutation((data: ProjectDirectorCommissionInputRequest) =>
    getDirectorCommissionService().createDirectorCommission(data)
  )
}

export function usePartialUpdateDirectorCommission() {
  return useApiMutation(
    (variables: { id: number; data: PatchedProjectDirectorCommissionInputRequest }) =>
      getDirectorCommissionService().partialUpdateDirectorCommission(variables.id, variables.data)
  )
}

export function useDeleteDirectorCommission() {
  return useApiMutation((id: number) => getDirectorCommissionService().deleteDirectorCommission(id))
}

export function usePreviewDirectorCommission() {
  return useApiMutation((data: ProjectDirectorCommissionInputRequest) =>
    getDirectorCommissionService().previewDirectorCommission(data)
  )
}

export function useConfirmDirectorCommission() {
  return useApiMutation((id: number) =>
    getDirectorCommissionService().confirmDirectorCommission(id)
  )
}

export function useReopenDirectorCommission() {
  return useApiMutation((id: number) => getDirectorCommissionService().reopenDirectorCommission(id))
}

export function useRecomputeDirectorCommission() {
  return useApiMutation((id: number) =>
    getDirectorCommissionService().recomputeDirectorCommission(id)
  )
}

export function useVoidDirectorCommission() {
  return useApiMutation((variables: { id: number; data: ProjectDirectorCommissionVoidRequest }) =>
    getDirectorCommissionService().voidDirectorCommission(variables.id, variables.data)
  )
}

export function useDirectorCommissionLedger(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DIRECTOR_COMMISSIONS.LEDGER(id),
    () => getDirectorCommissionService().getLedgerDirectorCommission(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDirectorCommissionReceipts(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DIRECTOR_COMMISSIONS.RECEIPTS(id),
    () => getDirectorCommissionService().getReceiptsDirectorCommission(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
