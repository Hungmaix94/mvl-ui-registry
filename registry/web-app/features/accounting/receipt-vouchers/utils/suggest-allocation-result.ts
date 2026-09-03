import { extractErrorMessage } from '@/utils/error-utils'

/**
 * Kết quả của `POST/GET /api/accounting/receipt-vouchers/suggest-allocation/` và cách phiếu thu đọc nó.
 *
 * Tách khỏi `ReceiptVoucherWizard.tsx` để test được mà không phải dựng cả wizard + react-hook-form.
 */

/** Một gợi ý — BE trả theo DÒNG hoá đơn (`ReceiptVoucherAllocationSuggestion`), không theo hoá đơn. */
export type AllocationSuggestion = {
  invoice_id: number
  sales_invoice_line_id?: number
  allocated_amount?: string | number | null
  allocation_pct?: string | number | null
}

export type SuggestAllocationResult = {
  suggestions?: AllocationSuggestion[] | null
} | null

/** Dòng của form `invoices[]` trong wizard (một dòng cho mỗi HOÁ ĐƠN). */
export type SuggestedInvoiceAllocation = {
  sales_invoice: number
  allocated_amount: string
  allocation_pct: string
}

const num = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'string' ? Number(v) : v
  return Number.isFinite(n) ? n : 0
}

/**
 * Gộp gợi ý theo HOÁ ĐƠN.
 *
 * BE trả một gợi ý cho mỗi DÒNG, còn form của wizard chỉ có một ô tiền cho mỗi HOÁ ĐƠN. Bản cũ
 * `map()` thẳng 1-1 nên hoá đơn nhiều dòng sinh ra nhiều bản ghi trùng `sales_invoice`, và mọi chỗ
 * đọc sau đó (`invoicesForm.find(...)`) chỉ thấy dòng ĐẦU TIÊN — ô tiền hiện thiếu, còn tổng phân bổ
 * lại cộng đủ. Với hoá đơn có dòng "Chênh lệch làm tròn" ÂM thì lỗi này lộ ra rõ nhất: nếu dòng âm
 * đứng đầu, ô tiền hiện đúng một số âm nhỏ thay cho cả hoá đơn.
 *
 * Gộp bằng phép CỘNG CÓ DẤU nên phần chênh lệch âm tự trừ vào tổng của hoá đơn — đúng số tiền thực
 * thu. `allocation_pct` cũng cộng dồn vì BE tính nó theo phần còn phải thu của từng dòng và các dòng
 * của một hoá đơn không chồng lấn nhau.
 */
export function aggregateSuggestionsByInvoice(
  suggestions: AllocationSuggestion[]
): SuggestedInvoiceAllocation[] {
  const order: number[] = []
  const totals = new Map<number, { amount: number; pct: number }>()

  suggestions.forEach((suggestion) => {
    const invoiceId = Number(suggestion.invoice_id)
    if (!Number.isFinite(invoiceId)) return
    if (!totals.has(invoiceId)) {
      order.push(invoiceId)
      totals.set(invoiceId, { amount: 0, pct: 0 })
    }
    const bucket = totals.get(invoiceId)!
    bucket.amount += num(suggestion.allocated_amount)
    bucket.pct += num(suggestion.allocation_pct)
  })

  return order.map((invoiceId) => {
    const bucket = totals.get(invoiceId)!
    return {
      sales_invoice: invoiceId,
      allocated_amount: String(bucket.amount),
      allocation_pct: String(Math.round(bucket.pct * 100) / 100),
    }
  })
}

export type SuggestAllocationOutcome =
  | { kind: 'applied'; invoices: SuggestedInvoiceAllocation[] }
  | { kind: 'empty'; message: string }

/** Không có gợi ý nào: BE trả 200 nhưng danh sách rỗng (vẫn có thể xảy ra ngoài ca 400 dưới đây). */
export const SUGGEST_ALLOCATION_EMPTY_MESSAGE = 'Không có gợi ý phân bổ từ máy chủ'

export function resolveSuggestAllocation(
  result: SuggestAllocationResult
): SuggestAllocationOutcome {
  const suggestions = result?.suggestions ?? []
  if (suggestions.length === 0) {
    return { kind: 'empty', message: SUGGEST_ALLOCATION_EMPTY_MESSAGE }
  }
  return { kind: 'applied', invoices: aggregateSuggestionsByInvoice(suggestions) }
}

/**
 * Dùng khi máy chủ TỪ CHỐI gợi ý phân bổ và không kèm câu chữ nào đọc được.
 *
 * Ca 400 chính (BE PR #3267): các hoá đơn được chọn cộng lại ra số ÂM — user chỉ tick đúng một hoá
 * đơn điều chỉnh giảm. Trước đó BE trả 200 kèm danh sách rỗng và bước phân bổ hiện trắng trơn, không
 * một lời giải thích. Câu chữ thật do BE gửi (đã dịch sẵn tiếng Việt) nên KHÔNG dựng lại ở FE — chỉ
 * giữ một câu dự phòng ở đây.
 */
export const SUGGEST_ALLOCATION_FALLBACK_MESSAGE =
  'Không gợi ý phân bổ được cho các hoá đơn đang chọn. Vui lòng kiểm tra lại danh sách hoá đơn.'

/** Câu chữ hiển thị cho một lỗi từ endpoint gợi ý phân bổ (400 hoặc bất kỳ). */
export function suggestAllocationErrorMessage(error: unknown): string {
  return extractErrorMessage(error, SUGGEST_ALLOCATION_FALLBACK_MESSAGE)
}
