import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths, AccountingPeriodStatus } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type AccountingPeriod = components['schemas']['AccountingPeriod'] & {
  // TODO(schema): dirty flag doanh thu/KPI (BE plan_dial_auto_default_recognition_20260727)
  // — true khi input ghi nhận (dial/duyệt/mở lại bảng kê) đổi sau lần compute gần nhất;
  // compute() chạy xong thì BE tự clear. Fold into regen after BE deploy.
  revenue_recompute_needed?: boolean
  revenue_recompute_marked_at?: string | null
}
export type AccountingPeriodRequest = components['schemas']['AccountingPeriodRequest']
export type PatchedAccountingPeriodRequest = components['schemas']['PatchedAccountingPeriodRequest']
export type GetAccountingPeriodsParams =
  paths['/api/accounting/accounting-periods/']['get']['parameters']['query'] & {
    year?: number
    month?: number
    status?: AccountingPeriodStatus
  }

class AccountingPeriodService extends BaseApiService {
  async getAccountingPeriods(params?: GetAccountingPeriodsParams) {
    return await this.getPaginated(ApiPaths.accounting_accounting_periods_list, params)
  }

  async createAccountingPeriod(data: AccountingPeriodRequest) {
    return await this.post(ApiPaths.accounting_accounting_periods_create, data)
  }

  async getAccountingPeriod(id: number) {
    return await this.get(ApiPaths.accounting_accounting_periods_retrieve, { path: { id } })
  }

  async updateAccountingPeriod(id: number, data: AccountingPeriodRequest) {
    return await this.put(ApiPaths.accounting_accounting_periods_update, data, { path: { id } })
  }

  async partialUpdateAccountingPeriod(id: number, data: PatchedAccountingPeriodRequest) {
    return await this.patch(ApiPaths.accounting_accounting_periods_partial_update, data, {
      path: { id },
    })
  }

  async deleteAccountingPeriod(id: number) {
    return await this.delete(ApiPaths.accounting_accounting_periods_destroy, { path: { id } })
  }

  async hardCloseAccountingPeriod(id: number, data: AccountingPeriodRequest) {
    return await this.post(ApiPaths.accounting_accounting_periods_hard_close_create, data, {
      path: { id },
    })
  }

  async softCloseAccountingPeriod(id: number, data: AccountingPeriodRequest) {
    return await this.post(ApiPaths.accounting_accounting_periods_soft_close_create, data, {
      path: { id },
    })
  }

  async reopenAccountingPeriod(id: number, data: { reason?: string }) {
    return await this.post(ApiPaths.accounting_accounting_periods_reopen_create, data, {
      path: { id },
    })
  }

  async getAccountingPeriodHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_accounting_periods_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getAccountingPeriodHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_accounting_periods_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  /** Today's accounting period (created server-side if missing). */
  async getCurrentAccountingPeriod() {
    return await this.get(ApiPaths.accounting_accounting_periods_current_retrieve)
  }

  /** Fetch every accounting period by paging through page_size=100 until exhausted. */
  async getAllAccountingPeriods(): Promise<AccountingPeriod[]> {
    const all: AccountingPeriod[] = []
    let page = 1
    // Guard against an unbounded loop if `next` is ever malformed.
    for (let safety = 0; safety < 1000; safety++) {
      const res = await this.getAccountingPeriods({
        ordering: '-year,-month',
        page,
        page_size: 100,
      })
      all.push(...(res?.results ?? []))
      if (!res?.next) break
      page += 1
    }
    return all
  }
}

let _service: AccountingPeriodService | null = null

export function getAccountingPeriodService(): AccountingPeriodService {
  if (!_service) _service = new AccountingPeriodService()
  return _service
}

export function useAccountingPeriods(
  params?: GetAccountingPeriodsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.ACCOUNTING_PERIODS.LIST(params || {}),
    () => getAccountingPeriodService().getAccountingPeriods(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useCurrentAccountingPeriod(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.ACCOUNTING_PERIODS.CURRENT(),
    () => getAccountingPeriodService().getCurrentAccountingPeriod(),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useAllAccountingPeriods(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.ACCOUNTING_PERIODS.ALL(),
    () => getAccountingPeriodService().getAllAccountingPeriods(),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useAccountingPeriod(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.ACCOUNTING_PERIODS.DETAIL(id),
    () => getAccountingPeriodService().getAccountingPeriod(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateAccountingPeriod() {
  return useApiMutation((data: AccountingPeriodRequest) =>
    getAccountingPeriodService().createAccountingPeriod(data)
  )
}

export function useUpdateAccountingPeriod() {
  return useApiMutation((variables: { id: number; data: AccountingPeriodRequest }) =>
    getAccountingPeriodService().updateAccountingPeriod(variables.id, variables.data)
  )
}

export function usePartialUpdateAccountingPeriod() {
  return useApiMutation((variables: { id: number; data: PatchedAccountingPeriodRequest }) =>
    getAccountingPeriodService().partialUpdateAccountingPeriod(variables.id, variables.data)
  )
}

export function useDeleteAccountingPeriod() {
  return useApiMutation((id: number) => getAccountingPeriodService().deleteAccountingPeriod(id))
}

export function useHardCloseAccountingPeriod() {
  return useApiMutation((variables: { id: number; data: AccountingPeriodRequest }) =>
    getAccountingPeriodService().hardCloseAccountingPeriod(variables.id, variables.data)
  )
}

export function useSoftCloseAccountingPeriod() {
  return useApiMutation((variables: { id: number; data: AccountingPeriodRequest }) =>
    getAccountingPeriodService().softCloseAccountingPeriod(variables.id, variables.data)
  )
}

export function useReopenAccountingPeriod() {
  return useApiMutation((variables: { id: number; data: { reason?: string } }) =>
    getAccountingPeriodService().reopenAccountingPeriod(variables.id, variables.data)
  )
}

export function useAccountingPeriodHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.ACCOUNTING_PERIODS.HISTORIES(id, params || {}),
    () => getAccountingPeriodService().getAccountingPeriodHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useAccountingPeriodHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.ACCOUNTING_PERIODS.HISTORY_DETAIL(id, logId),
    () => getAccountingPeriodService().getAccountingPeriodHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
