export interface InvoiceLine {
  id: string | number
  description: string
  totalAmount: number
  paidAmount: number
}

export interface SuggestedAllocation {
  lineId: string | number
  allocatedAmount: number
  remainingUnpaid: number
}

/**
 * Auto-suggest phân bổ số tiền thu (totalReceived) vào các dòng hoá đơn (lines)
 * Ưu tiên lấp đầy (thanh toán hết) các dòng từ trên xuống dưới.
 * Nếu số tiền còn dư sau khi phân bổ hết, dòng cuối cùng có thể nhận thêm hoặc giữ lại số dư.
 * Theo yêu cầu: "last line absorbs rounding" hoặc phân bổ cho đến khi hết.
 *
 * @param lines Danh sách các dòng hoá đơn cần thu
 * @param totalReceived Tổng số tiền khách hàng nộp
 * @returns Danh sách phân bổ chi tiết cho từng dòng
 */
export function autoSuggestAllocation(
  lines: InvoiceLine[],
  totalReceived: number
): SuggestedAllocation[] {
  if (totalReceived < 0) {
    throw new Error('Số tiền thu không được âm')
  }

  let remainingToAllocate = totalReceived
  const suggestions: SuggestedAllocation[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const unpaidAmount = Math.max(0, line.totalAmount - line.paidAmount)

    if (unpaidAmount === 0) {
      // Dòng này đã thanh toán xong, bỏ qua hoặc ghi nhận 0
      suggestions.push({
        lineId: line.id,
        allocatedAmount: 0,
        remainingUnpaid: 0,
      })
      continue
    }

    if (remainingToAllocate <= 0) {
      // Đã phân bổ hết tiền
      suggestions.push({
        lineId: line.id,
        allocatedAmount: 0,
        remainingUnpaid: unpaidAmount,
      })
      continue
    }

    // Nếu đây là dòng cuối cùng và vẫn còn tiền dư, dòng cuối sẽ nhận toàn bộ số dư
    // (absorbs rounding or overpayment if needed, tùy business rule).
    // Tuy nhiên theo logic chuẩn, ta chỉ phân bổ tối đa bằng unpaidAmount,
    // trừ khi yêu cầu cho phép nộp dư (overpayment).
    // Tạm thời giới hạn allocatedAmount <= unpaidAmount,
    // Nếu có nộp dư sẽ đẩy vào balance của khách hàng, chứ không overpay line.
    const allocate = Math.min(remainingToAllocate, unpaidAmount)

    suggestions.push({
      lineId: line.id,
      allocatedAmount: allocate,
      remainingUnpaid: unpaidAmount - allocate,
    })

    remainingToAllocate -= allocate
  }

  return suggestions
}
