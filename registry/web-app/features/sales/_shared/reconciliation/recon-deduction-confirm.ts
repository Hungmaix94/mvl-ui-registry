import { formatCurrencyVND } from '@/utils/common'

/**
 * Pure gating + copy cho dialog "Xác nhận giảm trừ kỳ này" — tách khỏi hook `.tsx`
 * (useReconDeductionConfirm) để test trực tiếp không kéo chuỗi UI/store (xem note import-async trong
 * accounting-reconciliation.md).
 */
export interface ReconDeductionConfirmPayload {
  /** Nhãn căn (mã căn / mã HĐ) hiển thị trong phần mô tả dialog. */
  unitLabel: string
  /** "Giảm trừ khác" kỳ này (X₁). */
  feeDeduction: number
  /** "Trong đó Sale / F2 phải chịu" kỳ này (Y₁) — null = không trừ vào lương Sale (ẩn cặp dòng Sale). */
  feeDeductionToSale: number | null
  /** Lũy kế các kỳ ĐÃ DUYỆT trước (X₀ / Y₀) — basis PRE-VAT, khớp `prior_*` BE. */
  prior: { total: number; toSale: number }
}

/** Chỉ hỏi xác nhận khi kỳ này THỰC SỰ có giảm trừ (feeDeduction > 0); còn lại lưu thẳng. */
export function shouldConfirmReconDeduction(payload: ReconDeductionConfirmPayload): boolean {
  return payload.feeDeduction > 0
}

function money(value: number): string {
  return `${formatCurrencyVND(value, { maximumFractionDigits: 0 })} đ`
}

/** Các dòng body của dialog xác nhận — cặp "kỳ này · lũy kế" + dòng tổng sau kỳ này (thêm cặp Sale khi có). */
export function buildReconDeductionConfirmLines(payload: ReconDeductionConfirmPayload): string[] {
  const { feeDeduction, feeDeductionToSale, prior } = payload
  const lines = [
    `Giảm trừ khác — kỳ này: ${money(feeDeduction)} · lũy kế các kỳ đã duyệt trước: ${money(prior.total)}`,
    `→ Tổng giảm trừ của deal sau kỳ này: ${money(prior.total + feeDeduction)}`,
  ]
  if (feeDeductionToSale != null) {
    lines.push(
      `Trong đó Sale / F2 phải chịu — kỳ này: ${money(feeDeductionToSale)} · lũy kế các kỳ đã duyệt trước: ${money(prior.toSale)}`,
      `→ Tổng trừ từ lương Sale của deal sau kỳ này: ${money(prior.toSale + feeDeductionToSale)}`
    )
  }
  return lines
}
