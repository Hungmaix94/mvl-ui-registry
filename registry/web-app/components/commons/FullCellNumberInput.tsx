import { PenLine } from 'lucide-react'
import {
  forwardRef,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  type ComponentPropsWithoutRef,
  useMemo,
} from 'react'
import { cn } from '@/utils'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import { removeLeadingZeros } from '@/utils/string-utils'

type FullCellNumberInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'prefix'> & {
  suffix?: string

  isHideSuffix?: boolean
  spanSuffixPosition?: string
  paddingRight?: number
  min?: number
  max?: number
  /**
   * Cho phép gõ số ÂM. Mặc định suy ra từ `min < 0` để không đổi hành vi caller cũ.
   *
   * Cần cho các ô tiền của bảng chia hoa hồng kể từ khi BE đòi lại phần chi dư
   * (2026-08-06): một dòng phí/thưởng có thể mang số âm, và mức trần dưới mặc định 0
   * vừa chặn phím `-` vừa ép giá trị âm sẵn có về 0 ngay khi ô được gõ vào.
   */
  allowNegative?: boolean
  /**
   * Bỏ mức trần mặc định 100 của ô có suffix `%`.
   * Dùng cho các tỷ lệ nghiệp vụ có thể vượt 100% (vd: tỷ lệ hoàn thành KPI).
   * Không ảnh hưởng khi caller truyền `max` tường minh.
   */
  allowPercentOverHundred?: boolean
  /**
   * Số chữ số thập phân tối đa mà ô này CHẤP NHẬN và hiển thị.
   *
   * Mặc định 3, đúng hành vi cũ của mọi ô tiền và ô tỷ lệ cụm F2. Các ô nhập tỷ lệ TBC lõi
   * (tỷ lệ doanh thu, phí trả sale, phí đại lý) truyền 10 kể từ 26/08/2026: cột BE là
   * numeric(14,10) vì một tỷ lệ có thể là PHÂN SỐ của tỷ lệ khác, và trần 3 ở đây vừa cắt
   * lúc gõ vừa GHI ĐÈ giá trị 10 chữ số có sẵn ngay khi người dùng focus vào ô.
   */
  maxFractionDigits?: number
  variant?: 'ghost' | 'editable' | string
  onSuffixClick?: () => void
  suffixTitle?: string
  inputWrapperClassName?: string
  isError?: boolean
  prefix?: React.ReactNode
  prefixClassName?: string
}

function normalizeSuffix(rawSuffix: string) {
  // Normalize Vietnamese diacritics (VNĐ -> VND, đ -> D) so suffix matching is reliable.
  return rawSuffix
    .trim()
    .toUpperCase()
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parseVndNumber(value: unknown, allowNegative?: boolean): number | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const isNegative = !!allowNegative && value.trim().startsWith('-')
    const digitsOnly = value.replace(/\D/g, '')
    if (!digitsOnly) return null
    const parsed = Number(digitsOnly) * (isNegative ? -1 : 1)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function formatVndNumericString(val: string, allowNegative?: boolean): string {
  const isNegative = !!allowNegative && val.trim().startsWith('-')
  const digits = val.replace(/\D/g, '')
  if (!digits) {
    return isNegative ? '-' : ''
  }

  const parts = []
  let i = digits.length
  while (i > 0) {
    parts.unshift(digits.slice(Math.max(0, i - 3), i))
    i -= 3
  }
  return (isNegative ? '-' : '') + parts.join('.')
}

/** Số chữ số thập phân tối đa MẶC ĐỊNH — caller nới bằng prop `maxFractionDigits`. */
const DEFAULT_MAX_FRACTION_DIGITS = 3

/**
 * Chuỗi số dùng để CHỈNH SỬA (lúc focus) — dựng từ giá trị SỐ, không lấy chuỗi thô của `value`.
 *
 * Backend trả DecimalField dạng `"60.0000"`; lấy thẳng chuỗi đó ra thì lúc blur hiện `60` (vì đi
 * qua `formatNumber(numericValue)`) mà focus vào lại hoá `60,0000`.
 *
 * Dùng CHÍNH formatter của lúc blur rồi mới bỏ dấu phân cách nghìn, chứ không tự làm tròn lại:
 * `toFixed` và `Intl` lệch nhau ở biên (60.1235 → `Intl` cho `60,124`, `toFixed` cho `60,123`),
 * lệch một chữ số cuối là lại đúng lỗi "nhìn một đằng, focus vào một nẻo".
 *
 * Bỏ dấu phân cách nghìn là bắt buộc: `onChange` chỉ nhận `/^-?\d*\.?\d*$/`, nên để nguyên
 * `"1.234,5"` thì người dùng gõ tiếp không được.
 */
function toEditableNumberString(num: number | null, maxFractionDigits: number): string {
  if (num === null || !Number.isFinite(num)) return ''
  // vi-VN: nghìn là ".", thập phân là ",". Giữ lại đúng chữ số + "," + dấu âm để không phụ thuộc
  // vào việc ICU dùng "." hay khoảng trắng hẹp làm dấu phân cách nghìn.
  return formatNumber(num, { maximumFractionDigits: maxFractionDigits }).replace(/[^\d,-]/g, '')
}

function removeLeadingZerosVnd(val: string): string {
  const digits = val.replace(/\D/g, '')
  if (/^0+$/.test(digits)) {
    return val
  }
  return removeLeadingZeros(val)
}

const FullCellNumberInput = forwardRef<HTMLInputElement, FullCellNumberInputProps>(
  (
    {
      inputWrapperClassName,
      className,
      suffix = '%',
      spanSuffixPosition = 'right-3',
      paddingRight = undefined,
      isHideSuffix = false,
      allowPercentOverHundred = false,
      maxFractionDigits = DEFAULT_MAX_FRACTION_DIGITS,
      allowNegative: allowNegativeProp,
      min: minProp,
      max = suffix === '%' && !allowPercentOverHundred ? 100 : undefined,
      onChange,
      onFocus,
      onBlur,
      value,
      onSuffixClick,
      suffixTitle,
      isError,
      disabled,
      variant,
      prefix,
      prefixClassName,
      ...props
    },
    ref
  ) => {
    // `allowNegative` mặc định suy ra từ `min < 0` (hành vi cũ). Khi caller bật tường minh
    // mà không truyền `min`, KHÔNG áp trần dưới 0 — nếu không thì số âm vẫn bị ép về 0.
    const allowNegative = allowNegativeProp ?? (minProp !== undefined && minProp < 0)
    const min = minProp ?? (allowNegative ? undefined : 0)

    const suffixRef = useRef<HTMLButtonElement>(null)
    const localInputRef = useRef<HTMLInputElement>(null)
    const cursorStateRef = useRef<{ countBefore: number; regex: RegExp } | null>(null)

    const [suffixWidth, setSuffixWidth] = useState(0)
    const [isFocused, setIsFocused] = useState(false)
    const [draftValue, setDraftValue] = useState('')

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        localInputRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ;(ref as React.MutableRefObject<HTMLInputElement | null>).current = node
        }
      },
      [ref]
    )

    useEffect(() => {
      if (suffixRef.current && paddingRight === undefined) {
        setSuffixWidth(suffixRef.current.offsetWidth)
      }
    }, [suffix])

    const isVnd = useMemo(() => {
      const normalizedSuffix = normalizeSuffix(String(suffix ?? ''))

      return normalizedSuffix.includes('VND') || normalizedSuffix.includes('vnd')
    }, [suffix])

    const numericValue = useMemo(() => {
      if (isVnd) return parseVndNumber(value, allowNegative)

      return isNaN(Number(value)) ? null : Number(value)
    }, [isVnd, value, allowNegative])

    useLayoutEffect(() => {
      const state = cursorStateRef.current
      const input = localInputRef.current
      if (state && input) {
        let newCursorPos = 0
        if (state.countBefore > 0) {
          let matchedCount = 0
          for (let i = 0; i < input.value.length; i++) {
            const testRegex = new RegExp(state.regex.source)
            if (testRegex.test(input.value[i])) {
              matchedCount++
            }
            if (matchedCount === state.countBefore) {
              newCursorPos = i + 1
              break
            }
          }
        }
        input.setSelectionRange(newCursorPos, newCursorPos)
        cursorStateRef.current = null
      }
    }, [draftValue])

    const prevValueRef = useRef(value)
    useEffect(() => {
      if (isFocused && value !== prevValueRef.current) {
        const currentParsed = isVnd
          ? parseVndNumber(draftValue, allowNegative)
          : (() => {
              const cleaned = String(draftValue).replace(/,/g, '.')
              return isNaN(Number(cleaned)) ? null : Number(cleaned)
            })()

        const incomingParsed = numericValue

        const bothEmpty =
          (value === undefined || value === null || value === '') && draftValue === ''

        if (incomingParsed !== currentParsed && !bothEmpty) {
          const rawVal = isVnd
            ? numericValue !== null && Number.isFinite(numericValue)
              ? formatCurrencyVND(numericValue)
              : ''
            : toEditableNumberString(numericValue, maxFractionDigits)
          setDraftValue(rawVal)
        }
      }
      prevValueRef.current = value
    }, [value, isFocused, isVnd, numericValue, draftValue, allowNegative])

    useEffect(() => {
      if (!isFocused) {
        if (isVnd) {
          if (numericValue === null || !Number.isFinite(numericValue)) {
            setDraftValue('')
          } else {
            setDraftValue(formatCurrencyVND(numericValue))
          }
        } else {
          if (numericValue === null || !Number.isFinite(numericValue)) {
            setDraftValue('')
          } else {
            setDraftValue(formatNumber(numericValue, { maximumFractionDigits: maxFractionDigits }))
          }
        }
      }
    }, [isFocused, isVnd, numericValue])

    const displayValue = isFocused
      ? draftValue
      : isVnd
        ? numericValue === null || !Number.isFinite(numericValue)
          ? ''
          : formatCurrencyVND(numericValue)
        : numericValue === null || !Number.isFinite(numericValue)
          ? ''
          : formatNumber(numericValue, { maximumFractionDigits: maxFractionDigits })

    return (
      <div
        className={cn(
          'relative',
          'flex items-center',
          'h-full w-full',
          variant === 'editable'
            ? 'group/edit hover:bg-action-primary-red-default/5 cursor-pointer transition-colors focus-within:bg-[#FFF6F2]'
            : '',
          inputWrapperClassName
        )}
      >
        {variant === 'editable' && (
          <div className="group-hover/edit:border-action-primary-red-default/30 group-focus-within/edit:border-action-primary-red-default pointer-events-none absolute inset-0 z-10 border border-dashed border-transparent transition-colors group-focus-within/edit:border-solid" />
        )}
        <input
          ref={setRefs}
          type="text"
          disabled={disabled}
          inputMode={isVnd ? 'numeric' : 'decimal'}
          value={displayValue}
          onFocus={(e) => {
            setIsFocused(true)
            const rawVal = isVnd
              ? numericValue !== null && Number.isFinite(numericValue)
                ? formatCurrencyVND(numericValue)
                : ''
              : toEditableNumberString(numericValue, maxFractionDigits)
            setDraftValue(rawVal)
            const input = e.target
            requestAnimationFrame(() => {
              input.select()
            })
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            onBlur?.(e)
          }}
          className={cn(
            'h-full w-full [appearance:textfield] border-none bg-transparent py-0 pr-3 pl-3 text-right transition-colors outline-none ring-inset [&::-webkit-inner-spin-button]:appearance-none',
            variant === 'editable' ? 'min-h-[38px]' : 'min-h-[44px]',
            prefix ? 'pl-8' : '',
            disabled
              ? 'text-content-dark-4 cursor-not-allowed'
              : isError
                ? 'ring-semantic-danger-default bg-semantic-danger-subtle hover:ring-semantic-danger-default focus:ring-semantic-danger-default ring-1'
                : variant === 'ghost' || variant === 'editable'
                  ? ''
                  : '',
            variant === 'editable' ? 'relative z-20 focus:ring-0' : '',
            className
          )}
          style={{
            // Giữ tối thiểu 12px để số không dính sát mép phải ô
            paddingRight:
              suffix && !isHideSuffix
                ? suffixWidth + 16
                : paddingRight !== undefined
                  ? Math.max(paddingRight, 12)
                  : 12,
          }}
          onChange={(e) => {
            const input = e.target
            const valBeforeChange = input.value
            const selectionStart = input.selectionStart

            let val = valBeforeChange
            val = isVnd ? removeLeadingZerosVnd(val) : removeLeadingZeros(val)

            const significantRegex = isVnd ? (allowNegative ? /[0-9-]/g : /[0-9]/g) : /[0-9.,-]/g

            if (selectionStart !== null) {
              const beforeCursor = valBeforeChange.substring(0, selectionStart)
              const countBefore = (beforeCursor.match(significantRegex) || []).length
              cursorStateRef.current = {
                countBefore,
                regex: isVnd ? (allowNegative ? /[0-9-]/ : /[0-9]/) : /[0-9.,-]/,
              }
            } else {
              cursorStateRef.current = null
            }

            let formattedVal = val
            if (isVnd) {
              formattedVal = formatVndNumericString(val, allowNegative)
              const isNeg = allowNegative && val.startsWith('-')
              val = val.replace(/\D/g, '')
              if (isNeg) val = '-' + val
            } else {
              val = val.replace(/,/g, '.')
              if (!/^-?\d*\.?\d*$/.test(val)) return
              if (val.includes('.')) {
                const parts = val.split('.')
                if (parts[1].length > maxFractionDigits) {
                  val = parts[0] + '.' + parts[1].slice(0, maxFractionDigits)
                }
              }
              formattedVal = val.replace(/\./g, ',')
            }

            if (val !== '' && val !== '-' && val !== '.' && !val.endsWith('.')) {
              const numVal = Number(val)
              if (!Number.isFinite(numVal)) return
              if (max !== undefined && numVal > max) {
                val = String(max)
                formattedVal = isVnd
                  ? formatVndNumericString(val, allowNegative)
                  : val.replace(/\./g, ',')
              } else if (min !== undefined && numVal < min) {
                val = String(min)
                formattedVal = isVnd
                  ? formatVndNumericString(val, allowNegative)
                  : val.replace(/\./g, ',')
              }
            }

            setDraftValue(formattedVal)
            e.target.value = val
            onChange?.(e)
          }}
          onKeyDown={(e) => {
            if (!allowNegative && (e.key === '-' || e.key === 'e')) {
              e.preventDefault()
            }
            props.onKeyDown?.(e)
          }}
          {...props}
        />
        {variant === 'editable' && !disabled && (
          <PenLine className="text-content-dark-4 group-hover/edit:text-action-primary-red-default pointer-events-none absolute top-1.5 right-1.5 z-30 hidden h-3.5 w-3.5 group-hover/edit:block" />
        )}
        {prefix && (
          <div
            className={cn(
              'text-content-dark-3 absolute left-2 z-20 flex items-center justify-center',
              prefixClassName
            )}
          >
            {prefix}
          </div>
        )}
        {!isHideSuffix &&
          suffix &&
          (onSuffixClick && !disabled ? (
            <button
              type="button"
              ref={suffixRef}
              onClick={onSuffixClick}
              title={suffixTitle}
              className={cn(
                'absolute right-2',
                'typo-body-base-regular text-brand-primary',
                'hover:bg-brand-primary/10',
                'rounded px-1 py-0.5',
                'transition-colors'
              )}
            >
              {suffix}
            </button>
          ) : (
            <span
              ref={suffixRef}
              className={cn(
                'typo-body-base-regular pointer-events-none absolute',
                disabled ? 'text-content-dark-4' : 'text-content-dark-3',
                spanSuffixPosition
              )}
            >
              {suffix}
            </span>
          ))}
      </div>
    )
  }
)

FullCellNumberInput.displayName = 'FullCellNumberInput'

export default FullCellNumberInput
