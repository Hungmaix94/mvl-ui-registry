import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'

import { formatCurrencyVND } from '@/utils'

/** Chia mặc định để bóc VAT 10% khỏi giá niêm yết. */
const VAT_DIVISOR = 1.1

type FeeCalcQuickActionsProps = {
  /** Giá niêm yết hiện tại (CurrencyInput emit number). */
  listedPrice: number | string | null | undefined
  /** Ghi kết quả vào field "Giá tạm tính". */
  onApply: (value: number) => void
  disabled?: boolean
}

function toNumber(value: number | string | null | undefined): number {
  if (value == null || value === '') return NaN
  return typeof value === 'string' ? Number(value.replace(/,/g, '')) : Number(value)
}

/** Chỉ cho nhập số, 1 dấu thập phân, tối đa 2 chữ số sau dấu phẩy. */
function sanitizePctInput(raw: string): string {
  const normalized = raw.replace(/,/g, '.').replace(/[^\d.]/g, '')
  const firstDot = normalized.indexOf('.')
  if (firstDot === -1) return normalized
  const intPart = normalized.slice(0, firstDot)
  const decPart = normalized
    .slice(firstDot + 1)
    .replace(/\./g, '')
    .slice(0, 2)
  return `${intPart}.${decPart}`
}

/**
 * Tiện ích tính nhanh "Giá tạm tính" từ "Giá niêm yết":
 * - Giá niêm yết ÷ 1.1 (bóc VAT 10%)
 * - Giá niêm yết × y % (y do người dùng nhập)
 *
 * Chỉ hỗ trợ nhập liệu — không lưu lịch sử/hành vi. Kết quả ghi thẳng vào field.
 */
export function FeeCalcQuickActions({
  listedPrice,
  onApply,
  disabled = false,
}: FeeCalcQuickActionsProps) {
  const [pctInput, setPctInput] = useState('')

  const listed = toNumber(listedPrice)
  const hasListed = Number.isFinite(listed) && listed > 0

  const pct = Number(pctInput.replace(/,/g, '.'))
  const hasPct = Number.isFinite(pct) && pct > 0

  const divideResult = useMemo(
    () => (hasListed ? Math.round(listed / VAT_DIVISOR) : null),
    [hasListed, listed]
  )
  const percentResult = useMemo(
    () => (hasListed && hasPct ? Math.round((listed * pct) / 100) : null),
    [hasListed, hasPct, listed, pct]
  )

  const pillBase =
    'inline-flex items-center gap-1 rounded-full border border-border-1 px-3 py-1 typo-body-sm-medium'

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <span className="typo-body-sm-regular text-content-dark-3">Tính nhanh:</span>

      <button
        type="button"
        disabled={disabled || divideResult == null}
        onClick={() => divideResult != null && onApply(divideResult)}
        className={`${pillBase} text-content-dark-1 hover:border-action-primary-red-default hover:bg-data-red-disabled hover:text-action-primary-red-default transition-colors disabled:cursor-not-allowed disabled:opacity-50`}
        title={
          divideResult != null
            ? `Giá niêm yết ÷ 1.1 = ${formatCurrencyVND(divideResult)} VNĐ`
            : 'Nhập Giá niêm yết trước'
        }
      >
        Giá niêm yết ÷ 1.1
      </button>

      <div
        className={`${pillBase} ${disabled ? 'opacity-50' : ''} text-content-dark-1`}
        title={
          percentResult != null
            ? `Giá niêm yết × ${pct}% = ${formatCurrencyVND(percentResult)} VNĐ`
            : 'Nhập Giá niêm yết và tỷ lệ %'
        }
      >
        <span>Giá niêm yết ×</span>
        <input
          type="text"
          inputMode="decimal"
          aria-label="Tỷ lệ phần trăm giá tạm tính"
          value={pctInput}
          disabled={disabled}
          onChange={(e) => setPctInput(sanitizePctInput(e.target.value))}
          className="border-border-1 text-content-dark-1 focus:border-action-primary-red-default w-12 rounded border bg-white px-1 py-0.5 text-center outline-none"
        />
        <span>%</span>
        <button
          type="button"
          disabled={disabled || percentResult == null}
          onClick={() => percentResult != null && onApply(percentResult)}
          aria-label="Áp dụng tỷ lệ % vào giá tạm tính"
          className="text-content-dark-3 hover:text-action-primary-red-default -mr-1 ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check size={14} />
        </button>
      </div>
    </div>
  )
}

export default FeeCalcQuickActions
