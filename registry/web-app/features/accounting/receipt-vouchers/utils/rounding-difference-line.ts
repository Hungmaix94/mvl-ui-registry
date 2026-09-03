/**
 * "Chênh lệch làm tròn" — dòng hoá đơn KHÔNG thuộc căn nào.
 *
 * Bối cảnh: hoá đơn sinh từ phiếu đối chiếu CĐT hiển thị số đã làm tròn TỪNG CĂN, còn tổng phiếu là
 * `round(Σ chính xác)`; khe hở giữa hai vế nay được BE ghi thẳng thành một dòng hoá đơn riêng
 * (BE PR #3239) thay vì im lặng biến mất. Dòng đó thuộc về CHỨNG TỪ, không thuộc căn nào — nên nó
 * mang `product_inventory = null`, `deal = null`, `unit_number = null` và **được phép âm**.
 *
 * Quyết định nghiệp vụ đã chốt (2026-08-19): **hiện đúng như BE trả** — không ẩn, không gộp vào
 * dòng khác, không làm tròn cho mất. Kể cả ba hình dạng khó chịu của nó:
 *   1. âm;
 *   2. `line_total = 0` mà chỉ có `vat_amount`;
 *   3. `line_total` và `vat_amount` NGƯỢC DẤU nhau.
 *
 * ⚠️ Nhận dạng bằng CẤU TRÚC (không có căn / không có giao dịch), **không** bằng chuỗi
 * `description`. BE chưa có cờ `line_kind` riêng, mà bắt theo chữ "làm tròn" thì đổi câu chữ một cái
 * là dòng lại mở khoá cho user sửa tay — im lặng. Ngược lại, mọi dòng cấp-chứng-từ (hiện tại chỉ có
 * chênh lệch làm tròn) đều KHÔNG được sửa tay ở màn phân bổ, nên phủ rộng hơn là an toàn hơn.
 * TODO(schema): đổi sang cờ `line_kind` của BE ngay khi có.
 */

/** Phần hình dạng của một dòng hoá đơn bán ra mà màn phân bổ thực sự đọc. */
export type AllocatableInvoiceLine = {
  id?: number
  product_inventory?: number | null
  deal?: number | null
  unit_number?: string | null
  description?: string | null
  line_total?: string | number | null
  vat_amount?: string | number | null
  line_total_with_vat?: string | number | null
  /** Chỉ có trên dòng giả lập khi hoá đơn chưa trả `lines[]` — xem `ReceiptVoucherAllocationTab`. */
  total_amount?: string | number | null
}

/** Nhãn mặc định khi BE không gửi `description`. */
export const ROUNDING_DIFFERENCE_LABEL = 'Chênh lệch làm tròn'

/** Giải thích hiện trong tooltip của dòng — vì sao nó tồn tại và vì sao không sửa được. */
export const ROUNDING_DIFFERENCE_TOOLTIP =
  'Chênh lệch giữa tổng trên bảng kê của chủ đầu tư và tổng các dòng căn của chính bảng kê đó. ' +
  'Khoản này thuộc về chứng từ, không thuộc căn nào, nên không sửa tay được — muốn đổi thì sửa ' +
  'phiếu đối chiếu rồi phát hành lại hoá đơn.'

const num = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'string' ? Number(v) : v
  return Number.isFinite(n) ? n : 0
}

const isBlank = (v: string | null | undefined): boolean => v === null || v === undefined || v === ''

/**
 * Dòng cấp CHỨNG TỪ: không gắn căn, không gắn giao dịch, không có mã căn.
 *
 * Không dùng `!line.product_inventory` — id `0` là giá trị hợp lệ về mặt kiểu và falsy, sẽ bị đọc
 * nhầm thành "không có căn".
 */
export function isRoundingDifferenceLine(line: AllocatableInvoiceLine | null | undefined): boolean {
  if (!line) return false
  return (
    (line.product_inventory === null || line.product_inventory === undefined) &&
    (line.deal === null || line.deal === undefined) &&
    isBlank(line.unit_number)
  )
}

/**
 * Giá trị CÓ DẤU của một dòng hoá đơn (gồm VAT khi BE có gửi).
 *
 * Thay cho phiên bản cũ gác bằng `> 0`: dòng âm rơi hết xuống nhánh cuối và trả `0`, nên chênh lệch
 * làm tròn âm hiện `—` ở cột "HH gốc" và biến mất khỏi mọi phép cộng. Đây đúng là bẫy dấu đã ghi ở
 * `reference.md` § "Tiền ÂM (giảm trừ)" — so sánh phải là `!= 0`, không phải `> 0`.
 *
 * Thứ tự ưu tiên giữ nguyên như cũ (`line_total_with_vat` → `line_total` → `total_amount`) nhưng có
 * thêm nhánh cộng tay `line_total + vat_amount`: dòng chênh lệch làm tròn có thể có
 * `line_total = 0` mà chỉ có VAT, hoặc hai vế ngược dấu — khi ấy `line_total` một mình là số SAI.
 */
export function lineSignedTotal(line: AllocatableInvoiceLine | null | undefined): number {
  if (!line) return 0

  const withVat = num(line.line_total_with_vat)
  if (withVat !== 0) return withVat

  const total = num(line.line_total)
  const vat = num(line.vat_amount)
  // goods = 0 nhưng có thuế, hoặc goods và thuế ngược dấu ⇒ tổng thật là tổng hai vế.
  if (total !== 0 || vat !== 0) return total + vat

  return num(line.total_amount)
}

/** Nhãn hiển thị của dòng chênh lệch làm tròn — ưu tiên `description` do BE ghi. */
export function roundingDifferenceLabel(line: AllocatableInvoiceLine | null | undefined): string {
  const description = line?.description
  return isBlank(description) ? ROUNDING_DIFFERENCE_LABEL : (description as string)
}

export type LineAllocationSplit = {
  /** Khoá dòng do màn phân bổ đặt (`${salesInvoiceId}-${index}`). */
  rowKey: string
  allocatedAmount: number
}

/**
 * Chia số tiền đã phân bổ cho MỘT hoá đơn xuống từng dòng của nó ("Gợi ý chia theo HH").
 *
 * Giữ nguyên thuật toán cũ cho các dòng CĂN (chia theo tỷ trọng giá trị dòng, dòng căn cuối cùng
 * nhận phần dư để tổng luôn khớp tuyệt đối). Chỉ thêm một bước trước đó: **dòng cấp chứng từ nhận
 * đúng giá trị của chính nó** rồi bị loại khỏi mẫu số. Số đó là số BE đã chốt, không phải một tỷ lệ
 * — pro-rate nó sẽ vừa sai vừa mâu thuẫn với việc ô đó không cho sửa tay.
 */
export function splitInvoiceAllocationAcrossLines(
  invoiceId: number,
  lines: AllocatableInvoiceLine[],
  invoiceAllocatedAmount: number
): LineAllocationSplit[] {
  const keyed = lines.map((line, index) => ({
    line,
    rowKey: `${invoiceId}-${index}`,
    isDocumentLevel: isRoundingDifferenceLine(line),
  }))

  const documentLevelTotal = keyed
    .filter((entry) => entry.isDocumentLevel)
    .reduce((sum, entry) => sum + lineSignedTotal(entry.line), 0)

  const unitEntries = keyed.filter((entry) => !entry.isDocumentLevel)
  const remainderToSpread = invoiceAllocatedAmount - documentLevelTotal
  const unitWeightTotal = unitEntries.reduce((sum, entry) => sum + lineSignedTotal(entry.line), 0)

  let spreadSoFar = 0
  const byRowKey = new Map<string, number>()

  unitEntries.forEach((entry, index) => {
    const isLastUnit = index === unitEntries.length - 1
    let amount: number
    if (isLastUnit) {
      // Dòng căn cuối hấp thụ phần dư ⇒ Σ luôn bằng số đã phân bổ cho hoá đơn.
      amount = remainderToSpread - spreadSoFar
    } else if (unitWeightTotal !== 0) {
      amount = Math.round((lineSignedTotal(entry.line) / unitWeightTotal) * remainderToSpread)
    } else {
      amount = Math.round(remainderToSpread / unitEntries.length)
    }
    spreadSoFar += amount
    byRowKey.set(entry.rowKey, amount)
  })

  return keyed.map((entry) => ({
    rowKey: entry.rowKey,
    allocatedAmount: entry.isDocumentLevel
      ? lineSignedTotal(entry.line)
      : (byRowKey.get(entry.rowKey) ?? 0),
  }))
}
