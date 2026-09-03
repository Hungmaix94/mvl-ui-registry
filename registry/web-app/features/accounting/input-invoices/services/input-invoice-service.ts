import type { QueryClient } from '@tanstack/react-query'

import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { toSummaryParams } from '@/utils/table/summary'

/**
 * Gốc chung của mọi query Hóa đơn đầu vào — danh sách, dòng tổng, chi tiết, preview phiếu chi
 * đều nằm dưới prefix này (xem `QUERY_KEYS.ACCOUNTING.INPUT_INVOICES`).
 */
const INPUT_INVOICE_QUERY_ROOT = ['accounting', 'input-invoices'] as const

/**
 * Làm mới TOÀN BỘ dữ liệu Hóa đơn đầu vào sau một thao tác đổi trạng thái
 * (Nhận hóa đơn / Xác nhận / Từ chối / Mở lại / Hủy).
 *
 * Vì sao invalidate cả cụm thay vì liệt kê từng query: nút thao tác trên **cả hai màn** đều suy
 * ra từ `record.status`, nên chỉ cần một query bị bỏ sót là màn đó vẽ lại bằng bản chụp cũ và
 * nút biến mất/còn lại sai — đúng lỗi ClickUp `86eyhvka8`. Trước đây mỗi chỗ gọi tự liệt kê một
 * kiểu (chi tiết chỉ invalidate DETAIL; hai dialog invalidate list + detail nhưng bỏ SUMMARY),
 * nên dòng tổng cuối bảng và danh sách đứng yên sau khi thao tác từ màn chi tiết.
 *
 * **Phải `await`**: đóng hộp thoại trước khi dữ liệu mới về là quay lại đúng cảnh nút vẽ theo
 * trạng thái cũ. Promise chỉ resolve khi các query đang hiển thị đã tải xong.
 */
export function refreshInputInvoiceQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: [...INPUT_INVOICE_QUERY_ROOT] })
}

export type InputInvoice = Omit<components['schemas']['InputInvoice'], 'lines'> & {
  lines?: components['schemas']['InputInvoiceLine'][]
  expected_amount?: string | number
  attachment_file?: components['schemas']['File'] | components['schemas']['File'][] | null
  attachment?: components['schemas']['File'] | components['schemas']['File'][] | null
  lines_write?: {
    id?: number
    deal?: number | null
    line_total?: string | number
    description?: string
  }[]
}
export type InputInvoiceRequest = components['schemas']['InputInvoiceRequest']
export type PatchedInputInvoiceRequest = components['schemas']['PatchedInputInvoiceRequest']

export type InputInvoiceMarkReceivedRequest =
  components['schemas']['InputInvoiceMarkReceivedRequest'] & {
    attachment_file?: string | null
  }
export type InputInvoiceReasonRequest = components['schemas']['InputInvoiceReasonRequest']

export interface VerifyInputInvoiceRequest {
  external_invoice_no: string
}

export type GetInputInvoicesParams =
  paths['/api/accounting/input-invoices/']['get']['parameters']['query']

/** Column totals over the WHOLE filtered set — served by a sibling endpoint, not the list. */
export type InputInvoiceSummary = components['schemas']['InputInvoiceSummary']

export type InputInvoicePaymentPreview = components['schemas']['InputInvoicePaymentPreview']
export type InputInvoicePaymentItemPreview = components['schemas']['InputInvoicePaymentItemPreview']
export type InputInvoicePaymentSkipped = components['schemas']['InputInvoicePaymentSkipped']
export type InputInvoicePaymentVoucherCreateRequest =
  components['schemas']['InputInvoicePaymentVoucherCreateRequest']

class InputInvoiceService extends BaseApiService {
  async getInputInvoices(params?: GetInputInvoicesParams) {
    return await this.getPaginated(ApiPaths.accounting_input_invoices_list, params)
  }

  /**
   * Totals over the whole filtered set. Takes the same filters as the list and ignores
   * page/page_size — pass params through toSummaryParams().
   */
  async getInputInvoiceSummary(params?: Record<string, unknown>): Promise<InputInvoiceSummary> {
    return await this.get(ApiPaths.accounting_input_invoices_summary_retrieve, {
      query: params,
    })
  }

  async createInputInvoice(data: InputInvoiceRequest) {
    return await this.post(ApiPaths.accounting_input_invoices_create, data)
  }

  async getInputInvoice(id: number): Promise<InputInvoice> {
    return (await this.get(ApiPaths.accounting_input_invoices_retrieve, {
      path: { id },
    })) as InputInvoice
  }

  async updateInputInvoice(id: number, data: InputInvoiceRequest) {
    return await this.put(ApiPaths.accounting_input_invoices_update, data, { path: { id } })
  }

  async partialUpdateInputInvoice(id: number, data: PatchedInputInvoiceRequest) {
    return await this.patch(ApiPaths.accounting_input_invoices_partial_update, data, {
      path: { id },
    })
  }

  async deleteInputInvoice(id: number) {
    return await this.delete(ApiPaths.accounting_input_invoices_destroy, { path: { id } })
  }

  /**
   * ⚠️ Lệch spec: OpenAPI khai action này `requestBody?: never`, nhưng API thật **bắt buộc** nhận
   * `{ external_invoice_no }` (xem `VerifyInputInvoiceDialog` + SRS 20.7 §4.1). Cast hẹp đúng ô
   * body để đường dẫn và kiểu trả về vẫn được kiểm — KHÔNG cast cả `this.post` như trước, vì làm
   * vậy là tắt luôn type-check của path lẫn response. Bỏ cast khi BE bổ sung body vào spec.
   */
  async verifyInputInvoice(id: number, data: VerifyInputInvoiceRequest) {
    return await this.post(ApiPaths.accounting_input_invoices_verify_create, data as never, {
      path: { id },
    })
  }

  async markReceivedInputInvoice(id: number, data: InputInvoiceMarkReceivedRequest) {
    return await this.post(ApiPaths.accounting_input_invoices_mark_received_create, data, {
      path: { id },
    })
  }

  async rejectInputInvoice(id: number, data: InputInvoiceReasonRequest) {
    return await this.post(ApiPaths.accounting_input_invoices_reject_create, data, {
      path: { id },
    })
  }

  async reopenInputInvoice(id: number) {
    return await this.post(ApiPaths.accounting_input_invoices_reopen_create, undefined, {
      path: { id },
    })
  }

  async voidInputInvoice(id: number, data: InputInvoiceReasonRequest) {
    return await this.post(ApiPaths.accounting_input_invoices_void_create, data, {
      path: { id },
    })
  }

  /**
   * What a payment voucher for this invoice WOULD collect — the accountant sees this before
   * committing. `items` are the payout allocations that already have cash behind them; `skipped`
   * carries the lines left out plus the reason, so "vì sao ít hơn tôi tưởng" is answerable in the
   * dialog instead of after the fact.
   */
  async getPaymentVoucherPreview(id: number): Promise<InputInvoicePaymentPreview> {
    return await this.get(ApiPaths.accounting_input_invoices_payment_voucher_preview_retrieve, {
      path: { id },
    })
  }

  /**
   * Create the DRAFT payment voucher for this invoice. The amount is NOT a caller input — the BE
   * derives it from the same allocations the preview shows. Only the cash-side fields are ours.
   * Responds 409 when this invoice already has a draft voucher (one draft per invoice).
   */
  async createPaymentVoucher(id: number, data: InputInvoicePaymentVoucherCreateRequest) {
    return await this.post(ApiPaths.accounting_input_invoices_create_payment_voucher_create, data, {
      path: { id },
    })
  }

  async getInputInvoiceHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_input_invoices_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getInputInvoiceHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_input_invoices_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: InputInvoiceService | null = null

export function getInputInvoiceService(): InputInvoiceService {
  if (!_service) _service = new InputInvoiceService()
  return _service
}

export function useInputInvoices(params?: GetInputInvoicesParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.INPUT_INVOICES.LIST(params || {}),
    () => getInputInvoiceService().getInputInvoices(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

/** Sticky summary-row totals. Keyed on filters only, so paging never refetches it. */
export function useInputInvoiceSummary(
  params?: GetInputInvoicesParams,
  options?: { enabled?: boolean }
) {
  const summaryParams = toSummaryParams(params)
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.INPUT_INVOICES.SUMMARY(summaryParams),
    () => getInputInvoiceService().getInputInvoiceSummary(summaryParams),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useInputInvoice(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.INPUT_INVOICES.DETAIL(id),
    () => getInputInvoiceService().getInputInvoice(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

/**
 * Preview for the "Tạo phiếu chi" dialog. Kept `staleTime: 0` on purpose — the eligible amount
 * moves as cash lands against the F2's deals, so a cached figure could send the accountant to
 * confirm a total the BE no longer agrees with.
 */
export function useInputInvoicePaymentVoucherPreview(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.INPUT_INVOICES.PAYMENT_VOUCHER_PREVIEW(id),
    () => getInputInvoiceService().getPaymentVoucherPreview(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 0 }
  )
}

export function useCreateInputInvoicePaymentVoucher() {
  return useApiMutation(
    (variables: { id: number; data: InputInvoicePaymentVoucherCreateRequest }) =>
      getInputInvoiceService().createPaymentVoucher(variables.id, variables.data)
  )
}

export function useCreateInputInvoice() {
  return useApiMutation((data: InputInvoiceRequest) =>
    getInputInvoiceService().createInputInvoice(data)
  )
}

export function useUpdateInputInvoice() {
  return useApiMutation((variables: { id: number; data: InputInvoiceRequest }) =>
    getInputInvoiceService().updateInputInvoice(variables.id, variables.data)
  )
}

export function usePartialUpdateInputInvoice() {
  return useApiMutation((variables: { id: number; data: PatchedInputInvoiceRequest }) =>
    getInputInvoiceService().partialUpdateInputInvoice(variables.id, variables.data)
  )
}

export function useDeleteInputInvoice() {
  return useApiMutation((id: number) => getInputInvoiceService().deleteInputInvoice(id))
}

export function useVerifyInputInvoice() {
  return useApiMutation((variables: { id: number; data: VerifyInputInvoiceRequest }) =>
    getInputInvoiceService().verifyInputInvoice(variables.id, variables.data)
  )
}

export function useMarkReceivedInputInvoice() {
  return useApiMutation((variables: { id: number; data: InputInvoiceMarkReceivedRequest }) =>
    getInputInvoiceService().markReceivedInputInvoice(variables.id, variables.data)
  )
}

export function useRejectInputInvoice() {
  return useApiMutation((variables: { id: number; reason: string }) =>
    getInputInvoiceService().rejectInputInvoice(variables.id, { reason: variables.reason })
  )
}

export function useReopenInputInvoice() {
  return useApiMutation((id: number) => getInputInvoiceService().reopenInputInvoice(id))
}

export function useVoidInputInvoice() {
  return useApiMutation((variables: { id: number; reason: string }) =>
    getInputInvoiceService().voidInputInvoice(variables.id, { reason: variables.reason })
  )
}

export function useInputInvoiceHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.INPUT_INVOICES.HISTORIES(id, params || {}),
    () => getInputInvoiceService().getInputInvoiceHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useInputInvoiceHistory(id: number, logId: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.INPUT_INVOICES.HISTORY_DETAIL(id, logId),
    () => getInputInvoiceService().getInputInvoiceHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}
