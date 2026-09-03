import type { components } from '@/api/schema'
import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import { toAmount } from './amount'

type InputInvoiceLine = components['schemas']['InputInvoiceLine']

/** Cơ sở VAT của một dòng hóa đơn đầu vào — chỉ cần đúng hai mặt để bóc tách. */
export type VatBasisLine = Pick<InputInvoiceLine, 'line_total' | 'line_total_with_vat'>

export type TierVatSplit = {
  /** Số trước VAT của phần phiếu chi này tất toán. */
  net: number
  /** Phần VAT tương ứng; luôn thỏa net + vat === gross (không lệch tròn số). */
  vat: number
  /** `invoice-line` = bóc theo cơ sở VAT của hóa đơn; `tier` = phải dùng số BE gửi kèm. */
  source: 'invoice-line' | 'tier'
}

/**
 * Tìm dòng hóa đơn mà tier này tất toán, trong hóa đơn đã fetch sẵn ở trang chi tiết.
 *
 * Trả về NGUYÊN dòng chứ không chỉ hai mặt VAT: tier không mang id dòng đối chiếu F2 (chỉ có
 * `f2_reconciliation_code`), nên `line.f2_reconciliation` ở đây là nguồn duy nhất để dựng link.
 */
export function findInvoiceLine(
  invoice: InputInvoice | undefined,
  lineId: number | null | undefined
): InputInvoiceLine | undefined {
  if (!invoice || lineId == null) return undefined
  return invoice.lines?.find((line) => line.id === lineId)
}

/**
 * Bóc GROSS của tier thành (trước VAT, VAT) theo cơ sở VAT của chính dòng hóa đơn đầu vào.
 *
 * KHÔNG dùng thẳng `line.vat_amount`: một dòng hóa đơn có thể được tất toán làm nhiều đợt
 * (`_cumulative_ratio` phía BE), nên VAT của đợt này chỉ là phần tương ứng với gross đợt này.
 *
 * Cũng KHÔNG tin `tier.net_amount`: BE tính nó bằng Σ mặt chữ các dòng chia hoa hồng, mà mặt
 * chữ đó không nhất quán là số trước VAT — khi bảng đối chiếu bật `is_commission_include_vat`
 * thì split mang luôn số đã gồm VAT, Σ bằng đúng gross và `vat_amount = gross − net` sập về 0
 * (bug 86eygdrz8, PV000000737). Hóa đơn đầu vào thì luôn chụp đúng `line_total` /
 * `line_total_with_vat` từ dòng đối chiếu, nên nó mới là nguồn đáng tin để tách VAT.
 *
 * VAT lấy phần bù (`gross − net`) thay vì nhân tỷ lệ lần nữa, để hai số luôn cộng khít gross.
 */
export function splitTierByInvoiceLine({
  gross,
  line,
  fallbackNet,
  fallbackVat,
}: {
  gross: number
  line: VatBasisLine | undefined
  fallbackNet: number
  fallbackVat: number
}): TierVatSplit {
  const lineNet = toAmount(line?.line_total)
  const lineGross = toAmount(line?.line_total_with_vat)

  // lineNet > lineGross là dữ liệu hỏng (VAT âm) — thà hiển thị số BE còn hơn bịa ra tỷ lệ.
  if (lineGross > 0 && lineNet > 0 && lineNet <= lineGross) {
    const net = Math.round((gross * lineNet) / lineGross)
    return { net, vat: gross - net, source: 'invoice-line' }
  }

  return { net: fallbackNet, vat: fallbackVat, source: 'tier' }
}
