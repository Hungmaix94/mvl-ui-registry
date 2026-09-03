import React, { useCallback } from 'react'
import { TextField, TextFieldProps } from '@/components/ui/text-field/TextField'
import { formatCurrencyVND, parseCurrencyVND } from '@/utils/common'

export interface CurrencyInputProps extends Omit<TextFieldProps, 'onChange' | 'value' | 'type'> {
  value?: number | string
  onChange?: (value: number | undefined) => void
  /** If true, treats 0 as empty input (does not display '0') */
  hideZero?: boolean
  /**
   * Cho phép gõ dấu trừ. MẶC ĐỊNH TẮT: gần như mọi chỗ dùng component này là tiền chỉ chạy
   * một chiều (tạm ứng, đặt cọc, thưởng), ở đó dấu '-' là lỗi gõ mà BE phải đi từ chối. Bật
   * cho ô nào thật sự nhận số âm — hoá đơn điều chỉnh giảm là ca đầu tiên.
   *
   * Chỉ mở PHÍM. Việc hiển thị và parse số âm thì `formatNumericString` + `parseCurrencyVND`
   * đã làm được từ trước — `handleKeyDown` là chỗ duy nhất nuốt phím, nên số âm xưa nay
   * hiện ra được mà không gõ vào được.
   */
  allowNegative?: boolean
}

const formatNumericString = (val: string): string => {
  const isNegative = val.startsWith('-')
  const digits = val.replace(/[^\d]/g, '')
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

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, hideZero = false, allowNegative = false, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null)
    const setRefs = useCallback(
      (node: HTMLInputElement) => {
        internalRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ;(ref as React.MutableRefObject<HTMLInputElement | null>).current = node
        }
      },
      [ref]
    )

    const [inputValue, setInputValue] = React.useState(() => {
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (hideZero && Number(value) === 0)
      ) {
        return ''
      }
      return formatCurrencyVND(value)
    })

    const [prevValue, setPrevValue] = React.useState(value)

    if (value !== prevValue) {
      setPrevValue(value)
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (hideZero && Number(value) === 0)
      ) {
        setInputValue('')
      } else {
        const parsedCurrent = parseCurrencyVND(inputValue)
        if (Number(value) !== parsedCurrent) {
          setInputValue(formatCurrencyVND(value))
        }
      }
    }

    const cursorState = React.useRef<{ digitsBefore: number } | null>(null)

    React.useLayoutEffect(() => {
      const state = cursorState.current
      const input = internalRef.current
      if (state && input) {
        let newCursorPos = 0
        if (state.digitsBefore > 0) {
          let digitCount = 0
          for (let i = 0; i < input.value.length; i++) {
            if (/[0-9]/.test(input.value[i])) {
              digitCount++
            }
            if (digitCount === state.digitsBefore) {
              newCursorPos = i + 1
              break
            }
          }
        }
        input.setSelectionRange(newCursorPos, newCursorPos)
        cursorState.current = null
      }
    }, [inputValue])

    const handleChange = useCallback(
      (textValue: string) => {
        const input = internalRef.current
        if (input && input.selectionStart !== null) {
          const beforeCursor = textValue.substring(0, input.selectionStart)
          cursorState.current = { digitsBefore: beforeCursor.replace(/[^\d]/g, '').length }
        } else {
          cursorState.current = null
        }

        if (!textValue || (hideZero && textValue.replace(/[^\d]/g, '') === '0')) {
          setInputValue('')
          onChange?.(undefined)
          return
        }
        const formattedText = formatNumericString(textValue)
        setInputValue(formattedText)
        const numericValue = parseCurrencyVND(formattedText)
        onChange?.(numericValue)
      },
      [onChange, hideZero]
    )

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Prevent typing non-numeric characters (except navigation and modifiers)
        const allowedKeys = [
          'Backspace',
          'Tab',
          'Enter',
          'Escape',
          'Delete',
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          'Home',
          'End',
          '.',
          ',',
        ]
        const isNumber = /^[0-9]$/.test(e.key)
        // Chỉ mở phím; VỊ TRÍ để `formatNumericString` quyết định — nó chỉ công nhận dấu trừ
        // ở đầu chuỗi, nên '5-0' tự rụng dấu thành '50' mà không cần chặn thêm ở đây.
        const isMinus = allowNegative && e.key === '-'
        const isModifier = e.ctrlKey || e.metaKey || e.altKey

        if (!isNumber && !isMinus && !allowedKeys.includes(e.key) && !isModifier) {
          e.preventDefault()
        }

        props.onKeyDown?.(e)
      },
      [value, onChange, allowNegative, props.onKeyDown]
    )

    return (
      <TextField
        ref={setRefs}
        {...props}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        type="text"
        suffix={props.suffix ?? 'VND'}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
