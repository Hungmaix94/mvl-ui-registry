import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import type { GetInputInvoicesParams } from '@/features/accounting/input-invoices/services/input-invoice-service'
import { PayeeType } from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants'

/**
 * Xây query params lấy hóa đơn đầu vào theo đối tác nhận tiền.
 * API gap: input-invoices chỉ filter được theo `collaborator` / `exchange` /
 * `counterparty_type` — KHÔNG filter được theo nhân viên / nhà cung cấp cụ thể.
 */
export function buildPayeeInputInvoiceParams(
  payeeType: PayeeType | undefined,
  payeeEmployeeId?: number | null,
  payeeCollaboratorId?: number | null,
  payeeExchangeId?: number | null
): { params: GetInputInvoicesParams; enabled: boolean } {
  const params: GetInputInvoicesParams = { page_size: 50 }

  if (payeeType === PayeeType.COLLABORATOR) {
    if (payeeCollaboratorId) params.collaborator = payeeCollaboratorId
    return { params, enabled: !!payeeCollaboratorId }
  }
  if (payeeType === PayeeType.EXCHANGE) {
    if (payeeExchangeId) params.exchange = payeeExchangeId
    return { params, enabled: !!payeeExchangeId }
  }
  if (payeeType === PayeeType.EMPLOYEE) {
    params.counterparty_type = PayeeType.EMPLOYEE
    return { params, enabled: !!payeeEmployeeId }
  }
  if (payeeType === PayeeType.SUPPLIER) {
    params.counterparty_type = PayeeType.SUPPLIER
    return { params, enabled: true }
  }
  return { params, enabled: false }
}

/** Tổng tiền hóa đơn đầu vào dùng để phân bổ (ưu tiên tổng đã gồm VAT). */
export function inputInvoiceTotal(
  inv: Pick<InputInvoice, 'total_amount_with_vat' | 'total_amount'>
) {
  return Number(inv.total_amount_with_vat ?? inv.total_amount ?? 0)
}

/** Tên đối tác hiển thị cho hóa đơn đầu vào (người bán / CTV / sàn / NCC). */
export function inputInvoiceCounterpartyName(inv: InputInvoice) {
  return (
    inv.seller_name ||
    inv.collaborator_detail?.name ||
    inv.exchange_detail?.name ||
    inv.supplier_name ||
    '—'
  )
}
