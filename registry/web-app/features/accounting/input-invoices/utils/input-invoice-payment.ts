import type { InputInvoice } from '../services/input-invoice-service'
import {
  InputInvoiceStatus as InputInvoiceStatus,
  PaymentVoucherPayeeType as CounterpartyType,
} from '@/constants/api-schema-aliases'

/**
 * Statuses where the invoice is verified and still owes money. PARTIAL is "verified + paid some",
 * so it belongs here — it is the same pair the payment-voucher wizard filters its picker by.
 */
const PAYABLE_STATUSES: string[] = [InputInvoiceStatus.VERIFIED, InputInvoiceStatus.PARTIAL]

/** Fields both money helpers read — declared once so the two can never drift apart. */
type InputInvoiceMoney = Pick<
  InputInvoice,
  'total_amount_with_vat' | 'total_amount' | 'paid_amount'
>

/**
 * Số tiền gốc của hóa đơn = cột "Tổng cộng" (đã gồm VAT), lùi về "Tiền hàng" khi thiếu.
 *
 * `??` alone is NOT enough here: the API types `total_amount_with_vat` as a required string, but
 * this screen's own "Tổng cộng" column guards it with a truthiness check — i.e. an **empty
 * string** does reach the client. `'' ?? x` keeps `''`, which `Number()` turns into 0, and the
 * derived columns would then read "0%" + a red negative "còn lại" for an invoice whose VAT total
 * simply has not been computed. Treat blank as absent, the same way the neighbouring column does.
 */
function inputInvoiceTotalBase(invoice: InputInvoiceMoney): number {
  const withVat = invoice.total_amount_with_vat
  if (withVat !== null && withVat !== undefined && withVat !== '') return Number(withVat)
  const beforeVat = invoice.total_amount
  if (beforeVat !== null && beforeVat !== undefined && beforeVat !== '') return Number(beforeVat)
  return 0
}

/**
 * Số tiền hóa đơn còn chưa tất toán = tổng đã gồm VAT − đã tất toán.
 *
 * `paid_amount` là **"đã tất toán"**, không phải "đã chi tiền mặt": phần cấn trừ từ phiếu thu cũng
 * chảy vào đây, qua phiếu chi đối ứng BE tự sinh (`auto_generated_from_offset` / `payment_method`
 * `OFFSET`). Hiệu này vì thế là **công nợ còn lại** — KHÔNG phải "còn cấn trừ được", số đó là
 * `gross − paid − reserved` và chỉ tính được ở màn chi tiết, vì `reserved_amount` chỉ nằm trên
 * `InputInvoiceLine`, không có trên `InputInvoice`/`InputInvoiceList`.
 */
export function inputInvoiceRemainingToPay(invoice: InputInvoiceMoney): number {
  return inputInvoiceTotalBase(invoice) - Number(invoice.paid_amount ?? 0)
}

/**
 * Tỷ lệ tiền đi = đã chi / tổng cộng (đã gồm VAT), thang 0–100 (CR STT43).
 *
 * Base is the "Tổng cộng" column, not "Tiền hàng": `paid_amount` is settled at GROSS when the
 * payment voucher is posted (SRS 20.7 §3.1), so dividing by the pre-VAT figure would push a fully
 * paid invoice past 100%.
 *
 * A zero-total invoice reads **0%**, not "—", and the caller rounds HALF-UP to one decimal
 * (0,07% → 0,1%). Both differ from the sales-invoice screen on purpose: that percentage is
 * server-computed with ROUND_DOWN and the UI must not round it back up, whereas this one is
 * derived here and business asked for the plain reading.
 */
export function inputInvoicePaidPct(invoice: InputInvoiceMoney): number {
  const total = inputInvoiceTotalBase(invoice)
  if (!total) return 0
  const pct = (Number(invoice.paid_amount ?? 0) / total) * 100
  // Hóa đơn điều chỉnh có tổng ÂM: 0 chia cho số âm ra **-0** trong IEEE 754, và `Intl` in ra
  // "-0%" (thấy thật trên HDIN000000212 khi verify). Chuẩn hoá về 0 dương — `-0 === 0` nên nhánh
  // này bắt cả hai, và trả về literal 0 thì luôn là +0.
  return pct === 0 ? 0 : pct
}

/**
 * "Số tiền còn lại" for the TỔNG CỘNG row. The `/summary/` endpoint ships money columns only —
 * it has no remaining key — so the row derives it from the two totals it does ship. Returns null
 * when either side is missing so the caller can print "—" instead of a wrong zero.
 */
export function inputInvoiceSummaryRemaining(
  totalWithVat: number | null,
  paid: number | null
): number | null {
  if (totalWithVat === null || paid === null) return null
  return totalWithVat - paid
}

export type DraftHoldingVoucher = {
  id: number
  code: string
}

/**
 * DRAFT payment vouchers already holding part of this invoice, deduped across its lines.
 * `reserved_amount` on a line is money a draft voucher has earmarked but not yet disbursed, so a
 * line can be held by a voucher that has paid nothing — which is exactly the case the accountant
 * needs warned about before creating another one.
 */
export function inputInvoiceDraftHoldingVouchers(
  invoice: Pick<InputInvoice, 'lines'>
): DraftHoldingVoucher[] {
  const byId = new Map<number, DraftHoldingVoucher>()
  for (const line of invoice.lines ?? []) {
    for (const voucher of line.holding_vouchers ?? []) {
      if (!byId.has(voucher.id)) byId.set(voucher.id, { id: voucher.id, code: voucher.code })
    }
  }
  return Array.from(byId.values())
}

/**
 * Whether the "Tạo phiếu chi" action belongs on this invoice (CR STT10).
 *
 * F2 only: the backend action builds the voucher from the exchange's commission/bonus/deduction
 * allocations and 400s on any other counterparty, so showing it for a CTV / supplier / employee
 * invoice would be a button that can only fail.
 *
 * Note this deliberately does NOT check for a holding draft voucher — business asked to keep the
 * button visible in that case and explain the conflict, rather than hide the action silently.
 */
export function canCreatePaymentVoucherForInvoice(
  invoice: Pick<
    InputInvoice,
    'counterparty_type' | 'status' | 'total_amount_with_vat' | 'total_amount' | 'paid_amount'
  > | null
): boolean {
  if (!invoice) return false
  if (invoice.counterparty_type !== CounterpartyType.EXCHANGE) return false
  if (!PAYABLE_STATUSES.includes(invoice.status)) return false
  return inputInvoiceRemainingToPay(invoice) > 0
}
