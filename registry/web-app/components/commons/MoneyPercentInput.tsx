import { useEffect, useRef, useState, type ChangeEvent } from 'react'

import FullCellNumberInput from '@/components/commons/FullCellNumberInput'
import { cn } from '@/utils'

export type MoneyPercentMode = 'amount' | 'percent'

const MODES: { value: MoneyPercentMode; label: string; title: string }[] = [
  { value: 'amount', label: 'đ', title: 'Số tiền (VND)' },
  { value: 'percent', label: '%', title: 'Tỷ lệ (%)' },
]

export interface MoneyPercentInputProps {
  /** Đơn vị đang chọn — quyết định format (VND có phân tách nghìn) + đơn vị `[đ | %]`. */
  mode: MoneyPercentMode
  /** Giá trị theo `mode` (số tiền VND khi 'amount', tỷ lệ % khi 'percent'). */
  value: number | null
  onValueChange: (value: number | null) => void
  onModeChange: (mode: MoneyPercentMode) => void
  disabled?: boolean
  isError?: boolean
  placeholder?: string
  /** Giới hạn % khi ở mode 'percent'. Mặc định 100. */
  maxPercent?: number
  /**
   * Số chữ số thập phân tối đa của nhánh `%`. Mặc định 10 kể từ 26/08/2026: các ô đi qua đây
   * là tỷ lệ hoa hồng, cột BE là numeric(14,10) vì một tỷ lệ có thể là phân số của tỷ lệ khác.
   * Nhánh `đ` không dùng tới (tiền là số nguyên VND).
   */
  maxPercentFractionDigits?: number
  /** Chỉ %: ẩn nút đ, công tắc chỉ còn 1 nút "%". Cha luôn truyền `mode='percent'`. */
  pctOnly?: boolean
  /**
   * KHOÁ đơn vị: công tắc chỉ còn đúng 1 nút của đơn vị này (tổng quát hoá `pctOnly`,
   * dùng được cả cho 'amount'). Cha truyền `mode` = đơn vị khoá.
   */
  onlyMode?: MoneyPercentMode
  className?: string
  /**
   * `'boxed'` (default) — công tắc `[đ | %]` dạng nút bo góc, nền đặc đỏ khi active, ghim mép phải
   * khung, 2 nút dính liền nhau (thiết kế gốc). `'pill'` — 2 nhãn `[% | VNĐ]` chữ thường (KHÔNG nền,
   * KHÔNG bo tròn), ngăn bởi 1 đường kẻ dọc mảnh: đơn vị đang chọn = chữ ĐỎ, đơn vị còn lại = chữ xám
   * (bấm để đổi) — khớp mockup Đối chiếu 2.0 "Thêm căn".
   */
  variant?: 'boxed' | 'pill'
}

/**
 * Ô nhập **số tiền / tỷ lệ** với bộ chọn đơn vị `[đ | %]` gắn liền **mép phải** của ô (full-height,
 * ngăn bởi 1 đường kẻ mảnh) — KHÔNG bị ảnh hưởng bởi padding chữ của input vì được ghim theo mép khung
 * bao ngoài, input chỉ chừa đúng phần `paddingRight` bằng bề rộng bộ chọn.
 *
 * Controlled: cha giữ `mode` + `value` và tự xử lý quy đổi khi đổi đơn vị (qua `onModeChange`). Tái sử
 * dụng {@link FullCellNumberInput} (format VND phân tách nghìn, clamp min/max, dọn số 0 thừa) — ẩn suffix
 * mặc định, bỏ viền của nó và chuyển viền/bo góc/focus-ring lên khung bao ngoài.
 */
const PILL_LABELS: Record<MoneyPercentMode, string> = { amount: 'VNĐ', percent: '%' }
/** Thứ tự hiển thị cố định cho variant 'pill' (mockup luôn "% trước, VNĐ sau" — không đổi theo mode đang active). */
const PILL_ORDER: MoneyPercentMode[] = ['percent', 'amount']

function MoneyPercentInput({
  mode,
  value,
  onValueChange,
  onModeChange,
  disabled,
  isError,
  placeholder,
  maxPercent = 100,
  maxPercentFractionDigits = 10,
  pctOnly = false,
  onlyMode,
  className,
  variant = 'boxed',
}: MoneyPercentInputProps) {
  const toggleRef = useRef<HTMLDivElement>(null)
  const [toggleWidth, setToggleWidth] = useState(74)
  const lockedMode = onlyMode ?? (pctOnly ? 'percent' : undefined)
  const modes = lockedMode ? MODES.filter((opt) => opt.value === lockedMode) : MODES

  // Chừa padding-right của input đúng bằng bề rộng bộ chọn để giá trị (căn phải) dừng ngay trước nó.
  useEffect(() => {
    if (toggleRef.current) setToggleWidth(toggleRef.current.offsetWidth)
  }, [disabled])

  if (variant === 'pill') {
    return (
      <div
        className={cn(
          'bg-background-1 relative flex min-h-[40px] w-full items-center rounded-sm border-[1px] transition-colors',
          isError ? 'border-semantic-danger-default bg-semantic-danger-subtle' : 'border-border-1',
          disabled && 'opacity-60',
          className
        )}
      >
        <FullCellNumberInput
          value={value ?? ''}
          suffix={mode === 'amount' ? 'vnd' : '%'}
          isHideSuffix
          min={0}
          max={mode === 'percent' ? maxPercent : undefined}
          maxFractionDigits={mode === 'percent' ? maxPercentFractionDigits : undefined}
          placeholder={placeholder}
          disabled={disabled}
          inputWrapperClassName="border-none bg-transparent"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onValueChange(e.target.value === '' ? null : Number(e.target.value))
          }
        />
        <div className="flex shrink-0 items-center gap-1.5 pr-3">
          {[...modes]
            .sort((a, b) => PILL_ORDER.indexOf(a.value) - PILL_ORDER.indexOf(b.value))
            .map((opt, index) => {
              const active = mode === opt.value
              return (
                <div key={opt.value} className="flex shrink-0 items-center gap-1.5">
                  {index > 0 && <span className="bg-border-1 h-4 w-px" />}
                  <button
                    type="button"
                    title={opt.title}
                    aria-label={opt.title}
                    aria-pressed={active}
                    disabled={disabled}
                    onClick={() => onModeChange(opt.value)}
                    className={cn(
                      'typo-body-sm-medium shrink-0 transition-colors disabled:cursor-not-allowed',
                      active
                        ? 'text-action-primary-red-default cursor-default'
                        : 'text-content-dark-3 hover:text-content-dark-1 cursor-pointer'
                    )}
                  >
                    {PILL_LABELS[opt.value]}
                  </button>
                </div>
              )
            })}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-background-1 relative flex min-h-[40px] w-full overflow-hidden rounded-sm border-[1px] transition-colors',
        isError ? 'border-semantic-danger-default bg-semantic-danger-subtle' : 'border-border-1',
        disabled && 'opacity-60',
        className
      )}
    >
      <FullCellNumberInput
        value={value ?? ''}
        suffix={mode === 'amount' ? 'vnd' : '%'}
        isHideSuffix
        min={0}
        max={mode === 'percent' ? maxPercent : undefined}
        maxFractionDigits={mode === 'percent' ? maxPercentFractionDigits : undefined}
        placeholder={placeholder}
        disabled={disabled}
        paddingRight={toggleWidth + 12}
        inputWrapperClassName="border-none bg-transparent"
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onValueChange(e.target.value === '' ? null : Number(e.target.value))
        }
        className="typo-body-sm-medium"
      />

      {/* Bộ chọn đơn vị — full-height, ghim mép phải, ngăn cách bởi 1 đường kẻ. */}
      <div
        ref={toggleRef}
        className="border-border-1 absolute inset-y-0 right-0 flex border-l-[1px]"
      >
        {modes.map((opt, index) => {
          const active = mode === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              title={opt.title}
              aria-label={opt.title}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onModeChange(opt.value)}
              className={cn(
                'typo-body-sm-medium flex w-9 cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed',
                index > 0 && 'border-border-1 border-l-[1px]',
                active
                  ? 'bg-action-primary-red-default text-content-light-1'
                  : 'text-content-dark-3 hover:bg-background-2 hover:text-content-dark-1'
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MoneyPercentInput
