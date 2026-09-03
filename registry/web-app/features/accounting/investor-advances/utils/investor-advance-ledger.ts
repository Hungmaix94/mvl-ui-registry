import { formatCurrencyVND } from '@/utils/common'

/**
 * Cột "Số tiền" của sổ quỹ tạm ứng CĐT.
 *
 * `amount` từ BE là số CÓ DẤU: âm là tiền rời quỹ (`ADVANCE_PAY` chi tạm ứng,
 * `DRAWDOWN` trích quỹ trả hoá đơn), dương là tiền vào quỹ (`DEPOSIT`, `REFUND`).
 * Bảng trước đây in mọi dòng cùng một tông nên không đọc được chiều tiền; ba helper
 * dưới đây là nguồn DUY NHẤT quyết định dấu và màu của cột đó.
 *
 * Màu bắt buộc lấy từ token `data-*` trong `tailwind-colors.css`. Không dùng
 * `semantic-*`: họ token đó chưa từng được định nghĩa nên class ra rỗng, chữ
 * rơi về màu inherit — đúng lỗi đã khiến ô "Chưa đối chiếu ghi nhận" mất màu đỏ.
 */

/** Chiều tiền của một dòng sổ quỹ. Tách riêng `zero` để dòng 0 đồng không bị tô màu. */
export type LedgerAmountDirection = 'in' | 'out' | 'zero'

export function getLedgerAmountDirection(
  amount: string | number | null | undefined
): LedgerAmountDirection {
  const value = Number(amount ?? 0)
  if (!Number.isFinite(value) || value === 0) {
    return 'zero'
  }
  return value > 0 ? 'in' : 'out'
}

const DIRECTION_TONE: Record<LedgerAmountDirection, string> = {
  in: 'text-data-green-default',
  out: 'text-data-red-default',
  zero: 'text-content-dark-1',
}

export function getLedgerAmountTone(amount: string | number | null | undefined): string {
  return DIRECTION_TONE[getLedgerAmountDirection(amount)]
}

/**
 * Tiền vào quỹ hiện dấu `+` tường minh; tiền ra đã mang sẵn dấu `-` trong giá trị.
 * Giá trị hỏng (rỗng, `null`, không phải số) quy về `0 đ` thay vì `NaN`/`-`.
 */
export function formatLedgerAmount(amount: string | number | null | undefined): string {
  const value = Number(amount ?? 0)
  const safeValue = Number.isFinite(value) ? value : 0
  const formatted = `${formatCurrencyVND(safeValue, { maximumFractionDigits: 0 })} đ`
  return getLedgerAmountDirection(amount) === 'in' ? `+${formatted}` : formatted
}
