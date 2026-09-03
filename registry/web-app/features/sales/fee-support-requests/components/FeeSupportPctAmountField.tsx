import { useState } from 'react'

import MoneyPercentInput, { type MoneyPercentMode } from '@/components/commons/MoneyPercentInput'

export interface FeeSupportPctAmountFieldProps {
  /** Tỷ lệ % (XOR với `amt`). */
  pct: number | null
  /** Số tiền cố định (XOR với `pct`). */
  amt: number | null
  /**
   * KHOÁ đơn vị theo đơn vị của MỨC HIỆN TẠI trên deal (D9/D16 — support phải
   * khớp mode): công tắc chỉ còn 1 nút, không đổi được. undefined = tự do.
   */
  lockedMode?: MoneyPercentMode
  disabled?: boolean
  /** Thông báo lỗi validate của kênh (pct hoặc amt) — hiển thị dưới ô. */
  error?: string
  /** Ghi cặp XOR về form (một giá trị luôn null). */
  onChange: (next: { pct: number | null; amt: number | null }) => void
  className?: string
}

/**
 * Ô nhập %/₫ XOR cho một kênh hỗ trợ phí — học `ReconPctAmountInline` (một ô
 * {@link MoneyPercentInput} với công tắc `[đ | %]` ngay trong ô). Khác bản recon:
 * KHÔNG quy đổi giữa hai đơn vị khi toggle (D9/D16 cấm quy đổi %↔tiền và form
 * không có giá tính phí làm base) — đổi đơn vị chỉ khôi phục giá trị user đã
 * nhập trước đó ở đơn vị đó (cache), chưa có thì để trống.
 *
 * Trần tổng % (D14) do BE validate — FE không clamp/không tự chặn, chỉ hiển thị
 * lỗi BE trả về qua `error`.
 */
function FeeSupportPctAmountField({
  pct,
  amt,
  lockedMode,
  disabled,
  error,
  onChange,
  className,
}: FeeSupportPctAmountFieldProps) {
  // Mode bám dữ liệu khi đã có giá trị; khi cả hai null giữ lựa chọn cuối của
  // user (pendingMode) để bấm "đ" được ngay cả khi ô trống. lockedMode thắng tất.
  const dataMode: MoneyPercentMode | null = amt != null ? 'amount' : pct != null ? 'percent' : null
  const [pendingMode, setPendingMode] = useState<MoneyPercentMode>('percent')
  const [cachedAmount, setCachedAmount] = useState<number | null>(null)
  const [cachedPercent, setCachedPercent] = useState<number | null>(null)

  const mode: MoneyPercentMode = lockedMode ?? dataMode ?? pendingMode
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
    if (lockedMode || next === mode) return
    setPendingMode(next)
    // Lưu giá trị đơn vị hiện tại trước khi rời để lần sau quay lại khôi phục y nguyên.
    if (mode === 'amount') setCachedAmount(amt)
    else setCachedPercent(pct)

    if (next === 'amount') onChange({ pct: null, amt: cachedAmount })
    else onChange({ pct: cachedPercent, amt: null })
  }

  return (
    <div className={className}>
      <MoneyPercentInput
        mode={mode}
        value={value}
        disabled={disabled}
        isError={!!error}
        placeholder={mode === 'amount' ? 'Nhập số tiền' : 'Nhập tỷ lệ'}
        onlyMode={lockedMode}
        onValueChange={handleValueChange}
        onModeChange={handleModeChange}
      />
      {error && <p className="text-data-red-default typo-body-sm-regular mt-1">{error}</p>}
    </div>
  )
}

export default FeeSupportPctAmountField
