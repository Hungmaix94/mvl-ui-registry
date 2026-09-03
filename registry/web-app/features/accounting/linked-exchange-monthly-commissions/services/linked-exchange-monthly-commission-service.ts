import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, LinkedExchangeRevenueLineF2_source, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { unwrapSlkRevenueLines } from '../utils/revenue-lines-response'

/** Asked for on the revenue-lines call so a future switch to pagination still returns the
 *  whole period in one page. A period is a handful of deals, never near this bound. */
const REVENUE_LINES_PAGE_SIZE = 1000

export type LinkedExchangeMonthlyCommission =
  components['schemas']['LinkedExchangeMonthlyCommission']
export type LinkedExchangeComputeRequest = components['schemas']['LinkedExchangeComputeRequest']
export type F2SourcePoolSplit = components['schemas']['F2SourcePoolSplit']
export type F2SourcePoolSplitLine = components['schemas']['F2SourcePoolSplitLine']
export type F2SourcePayoutRow = components['schemas']['F2SourcePayoutRow']
export type DirectorDealPendingF2 = components['schemas']['DirectorDealPendingF2']
export type SetSourceSplitsRequest = components['schemas']['SetSourceSplitsRequest']
export type MarkPoolProcessedRequest = components['schemas']['MarkPoolProcessedRequest']
export type LinkedExchangeStaleness = components['schemas']['LinkedExchangeStaleness']
export type GetLinkedExchangeMonthlyCommissionsParams =
  paths['/api/accounting/linked-exchange-monthly-commissions/']['get']['parameters']['query']

/**
 * Per-(deal × F2 exchange) revenue breakdown line of an SLK monthly commission.
 *
 * NOTE: the `yarn api:update` of 2026-08-13 closed the missing-fields gap, but
 * `LinkedExchangeRevenueLine` still cannot replace this interface — drf-spectacular
 * types three decimal fields as `number` while the wire carries strings:
 * `fee_calculation_price`, `agency_received_amount`, `remaining_amount` (verified
 * against period 07/2026). `slk_progress_source` also arrives as `''` on lines with no
 * pinned progress, which the generated enum does not admit. Retire this interface once
 * the backend annotates those fields; re-check exactly these four on the next regen.
 */
export interface SlkRevenueLine {
  id: number
  monthly: number
  deal: number
  deal_code: string
  project_name: string
  project_code: string
  product_inventory: number | null
  product_inventory_label: string
  unit_number: string
  exchange: number
  exchange_name: string
  f2_source: LinkedExchangeRevenueLineF2_source
  f2_source_director: number | null
  f2_source_director_detail?: components['schemas']['EmployeeWithDepartmentNested']
  f2_reconciliation: number | null
  deposit_date: string | null
  fee_calculation_price: string
  sales_name: string
  department_name: string
  block_name: string
  agency_fee: string
  participation_pct: string
  commission_before_vat: string
  collected_in_period: string
  slk_progress_pct: string
  slk_progress_source: 'PINNED' | 'COLLECTED' | ''
  slk_full: string
  slk_revenue: string
  agency_received_amount: string
  agency_disbursed_amount: string
  remaining_amount: string
}

class LinkedExchangeMonthlyCommissionService extends BaseApiService {
  async getLinkedExchangeMonthlyCommissions(params?: GetLinkedExchangeMonthlyCommissionsParams) {
    return await this.getPaginated(
      ApiPaths.accounting_linked_exchange_monthly_commissions_list,
      params
    )
  }

  async getLinkedExchangeMonthlyCommission(id: number) {
    return await this.get(ApiPaths.accounting_linked_exchange_monthly_commissions_retrieve, {
      path: { id },
    })
  }

  /**
   * Whether the statement still shows figures that match a recompute of their inputs.
   * Read-only on the server; screens warn on it before the accountant starts approving.
   */
  async getStaleness(id: number): Promise<LinkedExchangeStaleness> {
    return await this.get(
      ApiPaths.accounting_linked_exchange_monthly_commissions_staleness_retrieve,
      {
        path: { id },
      }
    )
  }

  /**
   * Every revenue line of the period — never a page of them. `buildSlkPoolRows` sums
   * `slk_revenue` over this list to get each director pool's revenue, so a missing line
   * is an understated payout, not a cosmetic gap. `page_size` is sent for the day the
   * backend switches this endpoint to the paginated shape its schema already declares;
   * if anything still gets truncated, `unwrapSlkRevenueLines` throws rather than return
   * a short list. See `utils/revenue-lines-response.ts` for the measured contract.
   */
  async getRevenueLines(id: number): Promise<SlkRevenueLine[]> {
    const data = await this.get(
      ApiPaths.accounting_linked_exchange_monthly_commissions_revenue_lines_list,
      { path: { id }, query: { page_size: REVENUE_LINES_PAGE_SIZE } }
    )
    return unwrapSlkRevenueLines<SlkRevenueLine>(data)
  }

  async reviewLinkedExchangeMonthlyCommission(id: number) {
    return await this.post(
      ApiPaths.accounting_linked_exchange_monthly_commissions_review_create,
      {} as Record<string, never>,
      { path: { id } }
    )
  }

  async postLinkedExchangeMonthlyCommission(id: number) {
    return await this.post(
      ApiPaths.accounting_linked_exchange_monthly_commissions_post_create,
      {} as Record<string, never>,
      { path: { id } }
    )
  }

  async reopenLinkedExchangeMonthlyCommission(id: number) {
    return await this.post(
      ApiPaths.accounting_linked_exchange_monthly_commissions_reopen_create,
      {} as Record<string, never>,
      { path: { id } }
    )
  }

  async markPoolProcessed(id: number, data: MarkPoolProcessedRequest) {
    return await this.post(
      ApiPaths.accounting_linked_exchange_monthly_commissions_mark_pool_processed_create,
      data,
      { path: { id } }
    )
  }

  async computeLinkedExchangeMonthlyCommission(data: LinkedExchangeComputeRequest) {
    return await this.post(
      ApiPaths.accounting_linked_exchange_monthly_commissions_compute_create,
      data
    )
  }

  async setSourceSplits(id: number, data: SetSourceSplitsRequest) {
    return await this.post(
      ApiPaths.accounting_linked_exchange_monthly_commissions_set_source_splits_create,
      data,
      { path: { id } }
    )
  }

  async getLinkedExchangeMonthlyCommissionHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(
      ApiPaths.accounting_linked_exchange_monthly_commissions_histories_retrieve,
      {
        path: { id: String(id) },
        query: params,
      }
    )
  }

  async getLinkedExchangeMonthlyCommissionHistory(id: number, logId: string) {
    return await this.get(
      ApiPaths.accounting_linked_exchange_monthly_commissions_history_retrieve,
      {
        path: { id: String(id), log_id: logId },
      }
    )
  }
}

let _service: LinkedExchangeMonthlyCommissionService | null = null

export function getLinkedExchangeMonthlyCommissionService(): LinkedExchangeMonthlyCommissionService {
  if (!_service) _service = new LinkedExchangeMonthlyCommissionService()
  return _service
}

export function useLinkedExchangeMonthlyCommissions(
  params?: GetLinkedExchangeMonthlyCommissionsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_MONTHLY_COMMISSIONS.LIST(params || {}),
    () => getLinkedExchangeMonthlyCommissionService().getLinkedExchangeMonthlyCommissions(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useLinkedExchangeMonthlyCommission(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_MONTHLY_COMMISSIONS.DETAIL(id),
    () => getLinkedExchangeMonthlyCommissionService().getLinkedExchangeMonthlyCommission(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useLinkedExchangeRevenueLines(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_MONTHLY_COMMISSIONS.REVENUE_LINES(id, {}),
    () => getLinkedExchangeMonthlyCommissionService().getRevenueLines(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useLinkedExchangeStaleness(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_MONTHLY_COMMISSIONS.STALENESS(id),
    () => getLinkedExchangeMonthlyCommissionService().getStaleness(id),
    // No staleTime: this is the freshness signal itself, so a cached "fresh" answer is
    // exactly the thing that would mislead the accountant.
    { enabled: !!id && (options?.enabled ?? true) }
  )
}

export function useReviewLinkedExchangeMonthlyCommission() {
  return useApiMutation((variables: { id: number }) =>
    getLinkedExchangeMonthlyCommissionService().reviewLinkedExchangeMonthlyCommission(variables.id)
  )
}

export function usePostLinkedExchangeMonthlyCommission() {
  return useApiMutation((variables: { id: number }) =>
    getLinkedExchangeMonthlyCommissionService().postLinkedExchangeMonthlyCommission(variables.id)
  )
}

export function useReopenLinkedExchangeMonthlyCommission() {
  return useApiMutation((variables: { id: number }) =>
    getLinkedExchangeMonthlyCommissionService().reopenLinkedExchangeMonthlyCommission(variables.id)
  )
}

export function useMarkPoolProcessed() {
  return useApiMutation((variables: { id: number; data: MarkPoolProcessedRequest }) =>
    getLinkedExchangeMonthlyCommissionService().markPoolProcessed(variables.id, variables.data)
  )
}

export function useComputeLinkedExchangeMonthlyCommission() {
  return useApiMutation((data: LinkedExchangeComputeRequest) =>
    getLinkedExchangeMonthlyCommissionService().computeLinkedExchangeMonthlyCommission(data)
  )
}

export function useSetSourceSplits() {
  return useApiMutation((variables: { id: number; data: SetSourceSplitsRequest }) =>
    getLinkedExchangeMonthlyCommissionService().setSourceSplits(variables.id, variables.data)
  )
}

export function useLinkedExchangeMonthlyCommissionHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_MONTHLY_COMMISSIONS.HISTORIES(id, params || {}),
    () =>
      getLinkedExchangeMonthlyCommissionService().getLinkedExchangeMonthlyCommissionHistories(
        id,
        params
      ),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useLinkedExchangeMonthlyCommissionHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.LINKED_EXCHANGE_MONTHLY_COMMISSIONS.HISTORY_DETAIL(id, logId),
    () =>
      getLinkedExchangeMonthlyCommissionService().getLinkedExchangeMonthlyCommissionHistory(
        id,
        logId
      ),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
