import type { UseQueryOptions } from '@tanstack/react-query'
import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { toSummaryParams } from '@/utils/table/summary'
import { ReceiptVoucherStatus, VoucherPaymentMethod } from '@/constants/api-schema-aliases'

export { ReceiptVoucherStatus }
export { VoucherPaymentMethod as ReceiptVoucherPaymentMethod }
export type ReceiptVoucher = components['schemas']['ReceiptVoucher']
/** List-row shape — drops nested `invoices`/`offset_invoices`, adds flat `sales_invoices` refs. */
export type ReceiptVoucherList = components['schemas']['ReceiptVoucherList']
export type ReceiptVoucherRequest = components['schemas']['ReceiptVoucherRequest']
export type PatchedReceiptVoucherRequest = components['schemas']['PatchedReceiptVoucherRequest']
export type GetReceiptVouchersParams =
  paths['/api/accounting/receipt-vouchers/']['get']['parameters']['query'] & {
    payer_tax_code?: string
  }
export type ReceiptVoucherInvoiceLinesOverrideRequest =
  components['schemas']['ReceiptVoucherInvoiceLinesOverrideRequest']
export type ReceiptVoucherOffsetInvoiceLinesOverrideRequest =
  components['schemas']['ReceiptVoucherOffsetInvoiceLinesOverrideRequest']
export type GetSuggestAllocationParams =
  paths['/api/accounting/receipt-vouchers/suggest-allocation/']['get']['parameters']['query']
export type GetReceiptVoucherOffsetCandidatesParams =
  paths['/api/accounting/receipt-vouchers/offset-candidates/']['get']['parameters']['query'] & {
    payer_collaborator?: number
  }
export type ReceiptVoucherOffsetCandidates = components['schemas']['ReceiptVoucherOffsetCandidates']
export type ReceiptVoucherOffsetCandidate = components['schemas']['ReceiptVoucherOffsetCandidate']

/** Column totals over the WHOLE filtered set — served by a sibling endpoint, not the list. */
export type ReceiptVoucherSummary = components['schemas']['ReceiptVoucherSummary']

class ReceiptVoucherService extends BaseApiService {
  async getReceiptVouchers(params?: GetReceiptVouchersParams) {
    return await this.getPaginated(ApiPaths.accounting_receipt_vouchers_list, params)
  }

  /**
   * Totals over the whole filtered set. Takes the same filters as the list and ignores
   * page/page_size — pass params through toSummaryParams().
   */
  async getReceiptVoucherSummary(params?: Record<string, unknown>): Promise<ReceiptVoucherSummary> {
    return await this.get(ApiPaths.accounting_receipt_vouchers_summary_retrieve, {
      query: params as any,
    })
  }

  async createReceiptVoucher(data: ReceiptVoucherRequest) {
    return await this.post(ApiPaths.accounting_receipt_vouchers_create, data)
  }

  async getReceiptVoucher(id: number) {
    return await this.get(ApiPaths.accounting_receipt_vouchers_retrieve, { path: { id } })
  }

  async updateReceiptVoucher(id: number, data: ReceiptVoucherRequest) {
    return await this.put(ApiPaths.accounting_receipt_vouchers_update, data, { path: { id } })
  }

  async partialUpdateReceiptVoucher(id: number, data: PatchedReceiptVoucherRequest) {
    return await this.patch(ApiPaths.accounting_receipt_vouchers_partial_update, data, {
      path: { id },
    })
  }

  async deleteReceiptVoucher(id: number) {
    return await this.delete(ApiPaths.accounting_receipt_vouchers_destroy, { path: { id } })
  }

  async cancelReceiptVoucher(id: number, data: { reason: string }) {
    return await this.post(ApiPaths.accounting_receipt_vouchers_cancel_create, data, {
      path: { id },
    })
  }

  async postReceiptVoucher(id: number, data?: { acknowledge_large_variance?: boolean }) {
    // BE khai `acknowledge_large_variance` là BẮT BUỘC trong body — gửi tường minh `false` ở lần
    // ghi sổ đầu, chỉ `true` khi kế toán đã xác nhận chênh lệch (lần bấm thứ hai).
    return await this.post(
      ApiPaths.accounting_receipt_vouchers_post_create,
      { acknowledge_large_variance: data?.acknowledge_large_variance ?? false },
      { path: { id } }
    )
  }

  async getReceiptVoucherHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_receipt_vouchers_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getReceiptVoucherHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_receipt_vouchers_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async suggestAllocation(data: { invoice_ids: number[]; total_amount: string }) {
    return await this.post(ApiPaths.accounting_receipt_vouchers_suggest_allocation_create, data)
  }

  async getSuggestAllocation(params?: GetSuggestAllocationParams) {
    return await this.get(ApiPaths.accounting_receipt_vouchers_suggest_allocation_retrieve, {
      query: params,
    })
  }

  async updateReceiptVoucherInvoiceLines(
    id: number,
    rvInvId: number,
    data: ReceiptVoucherInvoiceLinesOverrideRequest
  ) {
    return await this.put(ApiPaths.accounting_receipt_vouchers_invoices_lines_update, data, {
      path: { id, rv_inv_id: rvInvId },
    })
  }

  async updateReceiptVoucherOffsetInvoiceLines(
    id: number,
    rvOffId: number,
    data: ReceiptVoucherOffsetInvoiceLinesOverrideRequest
  ) {
    return await this.put(ApiPaths.accounting_receipt_vouchers_offset_invoices_lines_update, data, {
      path: { id, rv_off_id: rvOffId },
    })
  }
  async getOffsetCandidates(params?: GetReceiptVoucherOffsetCandidatesParams) {
    return await this.get(ApiPaths.accounting_receipt_vouchers_offset_candidates_retrieve, {
      query: params,
    })
  }
}

let _service: ReceiptVoucherService | null = null

export function getReceiptVoucherService(): ReceiptVoucherService {
  if (!_service) _service = new ReceiptVoucherService()
  return _service
}

export function useReceiptVouchers(
  params?: GetReceiptVouchersParams,
  options?: Omit<UseQueryOptions<any, any>, 'queryKey' | 'queryFn'>
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.RECEIPT_VOUCHERS.LIST(params || {}),
    () => getReceiptVoucherService().getReceiptVouchers(params),
    {
      staleTime: 1000 * 60 * 5,
      ...options,
    }
  )
}

/**
 * Sticky summary-row totals. Keyed on filters only, so paging never refetches it.
 */
export function useReceiptVoucherSummary(
  params?: GetReceiptVouchersParams,
  options?: { enabled?: boolean }
) {
  const summaryParams = toSummaryParams(params)
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.RECEIPT_VOUCHERS.SUMMARY(summaryParams),
    () => getReceiptVoucherService().getReceiptVoucherSummary(summaryParams),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useReceiptVoucher(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.RECEIPT_VOUCHERS.DETAIL(id),
    () => getReceiptVoucherService().getReceiptVoucher(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateReceiptVoucher() {
  return useApiMutation((data: ReceiptVoucherRequest) =>
    getReceiptVoucherService().createReceiptVoucher(data)
  )
}

export function useUpdateReceiptVoucher() {
  return useApiMutation((variables: { id: number; data: ReceiptVoucherRequest }) =>
    getReceiptVoucherService().updateReceiptVoucher(variables.id, variables.data)
  )
}

export function usePartialUpdateReceiptVoucher() {
  return useApiMutation((variables: { id: number; data: PatchedReceiptVoucherRequest }) =>
    getReceiptVoucherService().partialUpdateReceiptVoucher(variables.id, variables.data)
  )
}

export function useDeleteReceiptVoucher() {
  return useApiMutation((id: number) => getReceiptVoucherService().deleteReceiptVoucher(id))
}

export function useCancelReceiptVoucher() {
  return useApiMutation((variables: { id: number; data: { reason: string } }) =>
    getReceiptVoucherService().cancelReceiptVoucher(variables.id, variables.data)
  )
}

/** Ghi sổ nhận thêm cờ xác nhận chênh lệch thu lớn — số ở dạng number vẫn dùng được. */
export type PostReceiptVoucherVariables = {
  id: number
  data?: { acknowledge_large_variance?: boolean }
}

export function usePostReceiptVoucher() {
  return useApiMutation((variables: number | PostReceiptVoucherVariables) => {
    const { id, data } =
      typeof variables === 'number' ? { id: variables, data: undefined } : variables
    return getReceiptVoucherService().postReceiptVoucher(id, data)
  })
}

export function useReceiptVoucherHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.RECEIPT_VOUCHERS.HISTORIES(id, params || {}),
    () => getReceiptVoucherService().getReceiptVoucherHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useSuggestAllocation() {
  return useApiMutation((data: { invoice_ids: number[]; total_amount: string }) =>
    getReceiptVoucherService().suggestAllocation(data)
  )
}

export function useReceiptVoucherHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.RECEIPT_VOUCHERS.HISTORY_DETAIL(id, logId),
    () => getReceiptVoucherService().getReceiptVoucherHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useSuggestAllocationQuery(
  params?: GetSuggestAllocationParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.RECEIPT_VOUCHERS.SUGGEST_ALLOCATION(params || {}),
    () => getReceiptVoucherService().getSuggestAllocation(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdateReceiptVoucherInvoiceLines() {
  return useApiMutation(
    (variables: { id: number; rvInvId: number; data: ReceiptVoucherInvoiceLinesOverrideRequest }) =>
      getReceiptVoucherService().updateReceiptVoucherInvoiceLines(
        variables.id,
        variables.rvInvId,
        variables.data
      )
  )
}

export function useUpdateReceiptVoucherOffsetInvoiceLines() {
  return useApiMutation(
    (variables: {
      id: number
      rvOffId: number
      data: ReceiptVoucherOffsetInvoiceLinesOverrideRequest
    }) =>
      getReceiptVoucherService().updateReceiptVoucherOffsetInvoiceLines(
        variables.id,
        variables.rvOffId,
        variables.data
      )
  )
}

export function useOffsetCandidates(
  params?: GetReceiptVoucherOffsetCandidatesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery<ReceiptVoucherOffsetCandidates, Error>(
    ['receipt-vouchers', 'offset-candidates', params ? JSON.stringify(params) : ''],
    () => getReceiptVoucherService().getOffsetCandidates(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}
