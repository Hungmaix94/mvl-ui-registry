import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { toSummaryParams } from '@/utils/table/summary'

export type PaymentVoucher = components['schemas']['PaymentVoucher']
/** List-row shape — drops nested `invoices`/`offset_invoices`/`lines`, adds flat `input_invoices` refs. */
export type PaymentVoucherList = components['schemas']['PaymentVoucherList']
export type PaymentVoucherRequest = components['schemas']['PaymentVoucherRequest']
export type PatchedPaymentVoucherRequest = components['schemas']['PatchedPaymentVoucherRequest']
export type GetPaymentVouchersParams = NonNullable<
  paths['/api/accounting/payment-vouchers/']['get']['parameters']['query']
>

/** Column totals over the WHOLE filtered set — served by a sibling endpoint, not the list. */
export type PaymentVoucherSummary = components['schemas']['PaymentVoucherSummary']

export type PaymentVoucherInvoiceLinesOverrideRequest =
  components['schemas']['PaymentVoucherInvoiceLinesOverrideRequest']
export type PaymentVoucherOffsetInvoiceLinesOverrideRequest =
  components['schemas']['PaymentVoucherOffsetInvoiceLinesOverrideRequest']
export type GetPaymentVoucherOffsetCandidatesParams =
  paths['/api/accounting/payment-vouchers/offset-candidates/']['get']['parameters']['query']
export type PaymentVoucherOffsetCandidates = components['schemas']['PaymentVoucherOffsetCandidates']
export type PaymentVoucherOffsetCandidate = components['schemas']['PaymentVoucherOffsetCandidate']
export type CollectF2CommissionsRequest = components['schemas']['CollectF2CommissionsRequest']
export type AppendF2CommissionsRequest = components['schemas']['AppendF2CommissionsRequest']
export type RemoveSettlementTierRequest = components['schemas']['RemoveSettlementTierRequest']
export type F2CommissionsPreview = components['schemas']['F2CommissionsPreview']
export type F2CollectItem = components['schemas']['_F2CollectItem']
export type F2CollectSkipped = components['schemas']['_F2CollectSkipped']
export type GetF2CommissionsPreviewParams = {
  payee_exchange: number
  payee_legal_entity?: number | null
}

class PaymentVoucherService extends BaseApiService {
  async getPaymentVouchers(params?: GetPaymentVouchersParams) {
    return await this.getPaginated(ApiPaths.accounting_payment_vouchers_list, params)
  }

  /**
   * Totals over the whole filtered set. Takes the same filters as the list and ignores
   * page/page_size — pass params through toSummaryParams().
   */
  async getPaymentVoucherSummary(params?: Record<string, unknown>): Promise<PaymentVoucherSummary> {
    return await this.get(ApiPaths.accounting_payment_vouchers_summary_retrieve, {
      query: params as any,
    })
  }

  async createPaymentVoucher(data: PaymentVoucherRequest) {
    return await this.post(ApiPaths.accounting_payment_vouchers_create, data)
  }

  async getPaymentVoucher(id: number) {
    return await this.get(ApiPaths.accounting_payment_vouchers_retrieve, { path: { id } })
  }

  async updatePaymentVoucher(id: number, data: PaymentVoucherRequest) {
    return await this.put(ApiPaths.accounting_payment_vouchers_update, data, { path: { id } })
  }

  async partialUpdatePaymentVoucher(id: number, data: PatchedPaymentVoucherRequest) {
    return await this.patch(ApiPaths.accounting_payment_vouchers_partial_update, data, {
      path: { id },
    })
  }

  async deletePaymentVoucher(id: number) {
    return await this.delete(ApiPaths.accounting_payment_vouchers_destroy, { path: { id } })
  }

  async cancelPaymentVoucher(id: number, data: { reason?: string }) {
    return await this.post(ApiPaths.accounting_payment_vouchers_cancel_create, data, {
      path: { id },
    })
  }

  async postPaymentVoucher(id: number) {
    return await this.post(ApiPaths.accounting_payment_vouchers_post_create, undefined, {
      path: { id },
    })
  }

  async getPaymentVoucherHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_payment_vouchers_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getPaymentVoucherHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_payment_vouchers_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async updatePaymentVoucherInvoiceLines(
    id: number,
    pvInvId: number,
    data: PaymentVoucherInvoiceLinesOverrideRequest
  ) {
    return await this.put(ApiPaths.accounting_payment_vouchers_invoices_lines_update, data, {
      path: { id, pv_inv_id: pvInvId },
    })
  }

  async updatePaymentVoucherOffsetInvoiceLines(
    id: number,
    pvOffId: number,
    data: PaymentVoucherOffsetInvoiceLinesOverrideRequest
  ) {
    return await this.put(ApiPaths.accounting_payment_vouchers_offset_invoices_lines_update, data, {
      path: { id, pv_off_id: pvOffId },
    })
  }

  async getOffsetCandidates(params: GetPaymentVoucherOffsetCandidatesParams) {
    return await this.get(ApiPaths.accounting_payment_vouchers_offset_candidates_retrieve, {
      query: params,
    })
  }

  async getF2CommissionsPreview(params: GetF2CommissionsPreviewParams) {
    return await this.get(
      ApiPaths.accounting_payment_vouchers_collect_f2_commissions_preview_retrieve,
      { query: params }
    )
  }

  async collectF2Commissions(data: CollectF2CommissionsRequest) {
    return await this.post(ApiPaths.accounting_payment_vouchers_collect_f2_commissions_create, data)
  }

  /** Take one settled input invoice back off a DRAFT voucher. */
  async removeSettledInvoice(id: number, invoiceTier: number) {
    return await this.post(
      ApiPaths.accounting_payment_vouchers_remove_settled_invoice_create,
      { invoice_tier: invoiceTier },
      { path: { id } }
    )
  }

  /** Pull the exchange's still-unpaid F2 commission onto a DRAFT voucher already open. */
  async collectMoreF2Commissions(id: number, data: AppendF2CommissionsRequest = {}) {
    return await this.post(
      ApiPaths.accounting_payment_vouchers_collect_more_f2_commissions_create,
      data,
      { path: { id } }
    )
  }
}

let _service: PaymentVoucherService | null = null

export function getPaymentVoucherService(): PaymentVoucherService {
  if (!_service) _service = new PaymentVoucherService()
  return _service
}

export function usePaymentVouchers(
  params?: GetPaymentVouchersParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.LIST(params || {}),
    () => getPaymentVoucherService().getPaymentVouchers(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

/** Sticky summary-row totals. Keyed on filters only, so paging never refetches it. */
export function usePaymentVoucherSummary(
  params?: GetPaymentVouchersParams,
  options?: { enabled?: boolean }
) {
  const summaryParams = toSummaryParams(params)
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.SUMMARY(summaryParams),
    () => getPaymentVoucherService().getPaymentVoucherSummary(summaryParams),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function usePaymentVoucher(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.DETAIL(id),
    () => getPaymentVoucherService().getPaymentVoucher(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreatePaymentVoucher() {
  return useApiMutation((data: PaymentVoucherRequest) =>
    getPaymentVoucherService().createPaymentVoucher(data)
  )
}

export function useUpdatePaymentVoucher() {
  return useApiMutation((variables: { id: number; data: PaymentVoucherRequest }) =>
    getPaymentVoucherService().updatePaymentVoucher(variables.id, variables.data)
  )
}

export function usePartialUpdatePaymentVoucher() {
  return useApiMutation((variables: { id: number; data: PatchedPaymentVoucherRequest }) =>
    getPaymentVoucherService().partialUpdatePaymentVoucher(variables.id, variables.data)
  )
}

export function useDeletePaymentVoucher() {
  return useApiMutation((id: number) => getPaymentVoucherService().deletePaymentVoucher(id))
}

export function useCancelPaymentVoucher() {
  return useApiMutation((variables: { id: number; data: { reason?: string } }) =>
    getPaymentVoucherService().cancelPaymentVoucher(variables.id, variables.data)
  )
}

export function usePostPaymentVoucher() {
  return useApiMutation((id: number) => getPaymentVoucherService().postPaymentVoucher(id))
}

export function usePaymentVoucherHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.HISTORIES(id, params || {}),
    () => getPaymentVoucherService().getPaymentVoucherHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function usePaymentVoucherHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.HISTORY_DETAIL(id, logId),
    () => getPaymentVoucherService().getPaymentVoucherHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useUpdatePaymentVoucherInvoiceLines() {
  return useApiMutation(
    (variables: { id: number; pvInvId: number; data: PaymentVoucherInvoiceLinesOverrideRequest }) =>
      getPaymentVoucherService().updatePaymentVoucherInvoiceLines(
        variables.id,
        variables.pvInvId,
        variables.data
      )
  )
}

export function useUpdatePaymentVoucherOffsetInvoiceLines() {
  return useApiMutation(
    (variables: {
      id: number
      pvOffId: number
      data: PaymentVoucherOffsetInvoiceLinesOverrideRequest
    }) =>
      getPaymentVoucherService().updatePaymentVoucherOffsetInvoiceLines(
        variables.id,
        variables.pvOffId,
        variables.data
      )
  )
}

export function usePaymentVoucherOffsetCandidates(
  params: GetPaymentVoucherOffsetCandidatesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.OFFSET_CANDIDATES(params),
    () => getPaymentVoucherService().getOffsetCandidates(params),
    { enabled: !!params.payee_exchange && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useF2CommissionsPreview(
  params: GetF2CommissionsPreviewParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.F2_COMMISSIONS_PREVIEW(params),
    () => getPaymentVoucherService().getF2CommissionsPreview(params),
    {
      enabled: !!params.payee_exchange && (options?.enabled ?? true),
      // Payout allocations move as receipts post; never serve a stale collect figure.
      staleTime: 0,
    }
  )
}

export function useCollectF2Commissions() {
  return useApiMutation((data: CollectF2CommissionsRequest) =>
    getPaymentVoucherService().collectF2Commissions(data)
  )
}

export function useRemoveSettledInvoice() {
  return useApiMutation((vars: { id: number; invoiceTier: number }) =>
    getPaymentVoucherService().removeSettledInvoice(vars.id, vars.invoiceTier)
  )
}

export function useCollectMoreF2Commissions() {
  return useApiMutation((vars: { id: number; data?: AppendF2CommissionsRequest }) =>
    getPaymentVoucherService().collectMoreF2Commissions(vars.id, vars.data)
  )
}
