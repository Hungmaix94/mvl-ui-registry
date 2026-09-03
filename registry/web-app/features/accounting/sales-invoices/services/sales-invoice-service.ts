import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { toSummaryParams } from '@/utils/table/summary'

export type SalesInvoice = Omit<components['schemas']['SalesInvoice'], 'lines'> & {
  lines?: components['schemas']['SalesInvoiceLine'][]
}
export type SalesInvoiceRequest = components['schemas']['SalesInvoiceRequest']
export type PatchedSalesInvoiceRequest = components['schemas']['PatchedSalesInvoiceRequest']
export type SalesInvoiceAdjustRequest = components['schemas']['SalesInvoiceAdjustRequest']
export type SalesInvoiceIssueRequest = components['schemas']['SalesInvoiceIssueRequest']
export type GetSalesInvoicesParams =
  paths['/api/accounting/sales-invoices/']['get']['parameters']['query']

/** Column totals over the WHOLE filtered set — served by a sibling endpoint, not the list. */
export type SalesInvoiceSummary = components['schemas']['SalesInvoiceSummary']

class SalesInvoiceService extends BaseApiService {
  async getSalesInvoices(params?: GetSalesInvoicesParams) {
    return await this.getPaginated(ApiPaths.accounting_sales_invoices_list, params)
  }

  /**
   * Totals over the whole filtered set. Takes the same filters as the list and ignores
   * page/page_size — pass params through toSummaryParams().
   */
  async getSalesInvoiceSummary(params?: Record<string, unknown>): Promise<SalesInvoiceSummary> {
    return await this.get(ApiPaths.accounting_sales_invoices_summary_retrieve, {
      query: params as any,
    })
  }

  async createSalesInvoice(data: SalesInvoiceRequest) {
    return await this.post(ApiPaths.accounting_sales_invoices_create, data)
  }

  async getSalesInvoice(id: number) {
    return await this.get(ApiPaths.accounting_sales_invoices_retrieve, { path: { id } })
  }

  async updateSalesInvoice(id: number, data: SalesInvoiceRequest) {
    return await this.put(ApiPaths.accounting_sales_invoices_update, data, { path: { id } })
  }

  async partialUpdateSalesInvoice(id: number, data: PatchedSalesInvoiceRequest) {
    return await this.patch(ApiPaths.accounting_sales_invoices_partial_update, data, {
      path: { id },
    })
  }

  async deleteSalesInvoice(id: number) {
    return await this.delete(ApiPaths.accounting_sales_invoices_destroy, { path: { id } })
  }

  async voidSalesInvoice(id: number, data: { reason?: string }) {
    return await this.post(ApiPaths.accounting_sales_invoices_void_create, data, { path: { id } })
  }

  async adjustSalesInvoice(id: number, data: SalesInvoiceAdjustRequest) {
    return await this.post(ApiPaths.accounting_sales_invoices_adjust_create, data, { path: { id } })
  }

  async issueSalesInvoice(id: number, data: SalesInvoiceIssueRequest) {
    return await this.post(ApiPaths.accounting_sales_invoices_issue_create, data, { path: { id } })
  }

  async createSalesInvoiceFromReconciliation(
    data: components['schemas']['SalesInvoiceFromReconciliationRequestRequest']
  ) {
    return await this.post(ApiPaths.accounting_sales_invoices_from_reconciliation_create, data)
  }

  async getSalesInvoiceHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_sales_invoices_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getSalesInvoiceHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_sales_invoices_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: SalesInvoiceService | null = null

export function getSalesInvoiceService(): SalesInvoiceService {
  if (!_service) _service = new SalesInvoiceService()
  return _service
}

export function useSalesInvoices(params?: GetSalesInvoicesParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.SALES_INVOICES.LIST(params || {}),
    () => getSalesInvoiceService().getSalesInvoices(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

/** Sticky summary-row totals. Keyed on filters only, so paging never refetches it. */
export function useSalesInvoiceSummary(
  params?: GetSalesInvoicesParams,
  options?: { enabled?: boolean }
) {
  const summaryParams = toSummaryParams(params)
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.SALES_INVOICES.SUMMARY(summaryParams),
    () => getSalesInvoiceService().getSalesInvoiceSummary(summaryParams),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useSalesInvoice(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.SALES_INVOICES.DETAIL(id),
    () => getSalesInvoiceService().getSalesInvoice(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateSalesInvoice() {
  return useApiMutation((data: SalesInvoiceRequest) =>
    getSalesInvoiceService().createSalesInvoice(data)
  )
}

export function useUpdateSalesInvoice() {
  return useApiMutation((variables: { id: number; data: SalesInvoiceRequest }) =>
    getSalesInvoiceService().updateSalesInvoice(variables.id, variables.data)
  )
}

export function usePartialUpdateSalesInvoice() {
  return useApiMutation((variables: { id: number; data: PatchedSalesInvoiceRequest }) =>
    getSalesInvoiceService().partialUpdateSalesInvoice(variables.id, variables.data)
  )
}

export function useDeleteSalesInvoice() {
  return useApiMutation((id: number) => getSalesInvoiceService().deleteSalesInvoice(id))
}

export function useVoidSalesInvoice() {
  return useApiMutation((variables: { id: number; data: { reason?: string } }) =>
    getSalesInvoiceService().voidSalesInvoice(variables.id, variables.data)
  )
}

export function useSalesInvoiceHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.SALES_INVOICES.HISTORIES(id, params || {}),
    () => getSalesInvoiceService().getSalesInvoiceHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useSalesInvoiceHistory(id: number, logId: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.SALES_INVOICES.HISTORY_DETAIL(id, logId),
    () => getSalesInvoiceService().getSalesInvoiceHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useAdjustSalesInvoice() {
  return useApiMutation((variables: { id: number; data: SalesInvoiceAdjustRequest }) =>
    getSalesInvoiceService().adjustSalesInvoice(variables.id, variables.data)
  )
}

export function useIssueSalesInvoice() {
  return useApiMutation((variables: { id: number; data: SalesInvoiceIssueRequest }) =>
    getSalesInvoiceService().issueSalesInvoice(variables.id, variables.data)
  )
}

export function useCreateSalesInvoiceFromReconciliation() {
  return useApiMutation(
    (data: components['schemas']['SalesInvoiceFromReconciliationRequestRequest']) =>
      getSalesInvoiceService().createSalesInvoiceFromReconciliation(data)
  )
}
