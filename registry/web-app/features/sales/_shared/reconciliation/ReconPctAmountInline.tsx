import { useState } from 'react'

import MoneyPercentInput, { type MoneyPercentMode } from '@/components/commons/MoneyPercentInput'

export interface ReconPctAmountInlineProps {
  /** Tỷ lệ % (XOR with `amt`). */
  pct: number | null
  /** Số tiền cố định (XOR with `pct`). */
  amt: number | null
  /** Base for converting between % and amount when switching modes. */
  feeCalculationPrice: number
  disabled?: boolean
  /** Writes the XOR pair back to the form (one is always null). */
  onChange: (next: { pct: number | null; amt: number | null }) => void
  /** Lớp bọc ngoài (mặc định `w-[250px]`). */
  wrapperClassname?: string
  /** Xem {@link MoneyPercentInput}'s `variant` — `'boxed'` (default, giữ nguyên) hoặc `'pill'`. */
  variant?: 'boxed' | 'pill'
}

/**
 * Inline %/₫ control (mockup `RateOrFlatV5` / `ExtraTotalV6`): một ô {@link MoneyPercentInput} với công
 * tắc đơn vị `[đ | %]` nằm NGAY TRONG ô (vị trí suffix). Đây là lớp mỏng riêng cho đối chiếu — giữ cặp
 * `pct`/`amt` ở dạng XOR (một cái luôn null) và quy đổi qua giá tính phí khi đổi đơn vị; phần input +
 * công tắc tái sử dụng component dùng chung `MoneyPercentInput`.
 */
function ReconPctAmountInline({
  pct,
  amt,
  feeCalculationPrice,
  disabled,
  onChange,
  wrapperClassname,
  variant,
}: ReconPctAmountInlineProps) {
  // Mode bám dữ liệu khi đã có giá trị (amt → ₫, pct → %). Khi cả hai null (ô trống) thì giữ lựa chọn
  // đơn vị cuối của user (`pendingMode`) — nhờ vậy user bấm "đ" được NGAY cả khi chưa nhập gì (trước
  // đây mode suy thẳng từ `amt != null` nên toggle "đ" bật rồi bật lại '%' tức thì khi ô trống).
  const [pendingMode, setPendingMode] = useState<MoneyPercentMode>('percent')
  // Một số field (VD `shared_bonus_amount`) KHÔNG nullable — cha luôn ghi lại `amt ?? 0` nên trường
  // này không bao giờ thật sự về null. Khi cả `amt` và `pct` cùng "có giá trị" (0 vẫn là non-null) thì
  // suy mode từ `amt != null` luôn thắng, khiến toggle "%" không bao giờ nhận — tin `pendingMode` (lựa
  // chọn bấm gần nhất) trong tình huống mập mờ này thay vì ưu tiên cứng `amt`.
  const dataMode: MoneyPercentMode | null =
    amt != null && pct != null
      ? pendingMode
      : amt != null
        ? 'amount'
        : pct != null
          ? 'percent'
          : null
  // Nhớ giá trị thô user đã nhập theo TỪNG đơn vị. Form chỉ giữ XOR (pct hoặc amt) nên đổi đơn vị buộc
  // phải quy đổi — vốn mất số khi giá tính phí = 0 và lệch do làm tròn 2 chiều. Cache giúp toggle qua
  // lại khôi phục ĐÚNG số đã nhập. Khi user sửa ở mode hiện tại ⇒ cache đơn vị KIA cũ ⇒ xoá để lần đổi
  // sau quy đổi lại theo số mới (không trả về số cũ stale).
  const [cachedAmount, setCachedAmount] = useState<number | null>(null)
  const [cachedPercent, setCachedPercent] = useState<number | null>(null)

  const mode: MoneyPercentMode = dataMode ?? pendingMode
  const value = mode === 'amount' ? amt : pct

  const handleValueChange = (num: number | null) => {
    if (mode === 'amount') {
      setCachedPercent(null)
      onChange({ pct: null, amt: num })
    } else {
      setCachedAmount(null)
      onChange({ pct: num, amt: null })
    }
  }

  const handleModeChange = (next: MoneyPercentMode) => {
    if (next === mode) return
    setPendingMode(next)
    // Lưu giá trị đơn vị HIỆN TẠI trước khi rời để lần sau quay lại khôi phục y nguyên.
    if (mode === 'amount') setCachedAmount(amt)
    else setCachedPercent(pct)

    if (next === 'amount') {
      // Ưu tiên số ₫ đã nhập (cache); chưa có thì quy đổi từ % hiện tại; ô đang trống hẳn (chưa cache,
      // chưa có % để quy đổi) ⇒ về 0 (không để trống — tránh cảm giác "mất giá trị" khi đổi đơn vị).
      const restored =
        cachedAmount ?? (pct != null ? Math.round((feeCalculationPrice * pct) / 100) : 0)
      onChange({ pct: null, amt: restored })
    } else {
      const restored =
        cachedPercent ??
        (amt != null && feeCalculationPrice > 0
          ? Math.round((amt / feeCalculationPrice) * 10000) / 100
          : 0)
      onChange({ pct: restored, amt: null })
    }
  }

  return (
    <div className={wrapperClassname ?? 'w-[250px]'}>
      <MoneyPercentInput
        mode={mode}
        value={value}
        disabled={disabled}
        onValueChange={handleValueChange}
        onModeChange={handleModeChange}
        variant={variant}
      />
    </div>
  )
}

export default ReconPctAmountInline
