'use client'

import { format, isValid, parse } from 'date-fns'

import { cn } from '../../../lib/utils.ts'
import { Calendar } from '../../../ui/calendar/date-single-picker/calendar.tsx'
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '../../../ui/popover.tsx'
import { Flex, Text } from '@radix-ui/themes'
import { FormCaption } from '../../../ui/form'
import { IconCalendarblank, IconCaretdown, IconX } from '../../../icons'
import { Button, TextField } from '../../../ui'
import { forwardRef, useState, useCallback, useEffect, useRef } from 'react'
import { DATE_FORMAT, DATE_SERVER_FORMAT } from '../../../constants/date-format.ts'
import { Separator } from '../../../ui/separator.tsx'

interface DatePickerProps {
  label?: string
  required?: boolean
  placeholder?: string
  value?: Date | string | null
  defaultValue?: Date | string | null
  onChange?: (value: string | undefined | null) => void
  disabled?: boolean
  error?: string
  caption?: string
  className?: string
  id?: string
  name?: string
  clearable?: boolean
  toYear?: number
  fromYear?: number
  avoidCollisions?: boolean
  /** When true, user can type date in input (DD/MM/YYYY) and/or open calendar */
  allowManualInput?: boolean
  /** react-day-picker Matchers for disabling days */
  disabledDays?: import('react-day-picker').Matcher | import('react-day-picker').Matcher[]
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  {
    label,
    required,
    placeholder,
    value,
    defaultValue,
    onChange,
    disabled,
    error,
    caption,
    className,
    clearable,
    toYear = 2100,
    fromYear,
    avoidCollisions = true,
    allowManualInput = false,
    disabledDays,
  },
  _ref
) {
  const [isOpen, setIsOpen] = useState(false)
  /** Tránh handleManualBlur ghi đè giá trị vừa chọn từ calendar (blur chạy trước khi setInputText commit). */
  const justSelectedFromCalendarRef = useRef(false)
  /**
   * Bật đúng trong lượt pointerdown vào chính popover lịch. Dùng để nhận ra "blur vì đang bấm vào
   * lịch" và phân biệt với "blur vì rời hẳn field" (bấm nút Lưu, sang field khác) — hai ca cần xử
   * lý ngược nhau mà `onBlur` của TextField không truyền event nên không dò được bằng relatedTarget.
   */
  const pointerInsidePopoverRef = useRef(false)
  /** Giữ nguyên text sai định dạng vừa gõ, không để effect đồng bộ ghi đè bằng giá trị đã commit. */
  const keepManualTextRef = useRef(false)

  // Normalize incoming value (string | Date | null | undefined) to Date for Calendar
  const normalizeToDate = (val: Date | string | null | undefined): Date | undefined => {
    if (val instanceof Date) return isValid(val) ? val : undefined
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (!trimmed) return undefined

      // Try display format first (dd/MM/yyyy)
      let parsed = parse(trimmed, DATE_FORMAT, new Date())
      if (isValid(parsed)) return parsed

      // Fallback: server format (yyyy-MM-dd)
      parsed = parse(trimmed, DATE_SERVER_FORMAT, new Date())
      return isValid(parsed) ? parsed : undefined
    }
    return undefined
  }

  const rawValue = value ?? defaultValue ?? null
  const parsedDate = normalizeToDate(rawValue)

  // If we can parse the value, always display it in DATE_FORMAT (dd/MM/yyyy)
  const committedValue: string =
    parsedDate != null
      ? format(parsedDate, DATE_FORMAT)
      : typeof rawValue === 'string'
        ? rawValue
        : ''

  const [inputText, setInputText] = useState(committedValue)
  const [manualInputError, setManualInputError] = useState<string | null>(null)
  useEffect(() => {
    // `keepManualTextRef` chặn đúng ca: text sai định dạng đã đẩy giá trị form về rỗng, nên
    // committedValue thành '' và nếu đồng bộ thì text người dùng vừa gõ biến mất khỏi ô.
    if (allowManualInput && !keepManualTextRef.current) {
      setInputText(committedValue)
    }
  }, [allowManualInput, committedValue])

  const handleSelectDate = useCallback(
    (date: Date | undefined) => {
      const nextValue = date ? format(date, DATE_FORMAT) : ''
      justSelectedFromCalendarRef.current = true
      keepManualTextRef.current = false
      setManualInputError(null)
      onChange?.(nextValue)
      if (allowManualInput) setInputText(nextValue)
      setIsOpen(false)
    },
    [onChange, allowManualInput]
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      keepManualTextRef.current = false
      setManualInputError(null)
      onChange?.('')
      if (allowManualInput) setInputText('')
      setIsOpen(false)
    },
    [onChange, allowManualInput]
  )

  const fromYearResolved = fromYear ?? 1900
  const toYearResolved = toYear ?? 2100

  /** Text sai định dạng: báo lỗi VÀ đẩy giá trị form về rỗng để field bắt buộc chặn submit. */
  const rejectManualInput = useCallback(
    (message: string) => {
      setManualInputError(message)
      keepManualTextRef.current = true
      onChange?.('')
    },
    [onChange]
  )

  const handleManualBlur = useCallback(() => {
    setManualInputError(null)
    if (justSelectedFromCalendarRef.current) {
      justSelectedFromCalendarRef.current = false
      return
    }
    // Blur khi click vào calendar chạy trước onSelect → bỏ qua để khỏi phải click 2 lần.
    //
    // KHÔNG dò bằng `isOpen`: onFocus tự mở popover, nên mọi lần blur xảy ra TRƯỚC khi popover kịp
    // đóng đều bị nuốt — text vừa gõ không commit và không được validate. Đo trên dev 24/08
    // (86eymkrqu vòng 2): gõ `09/07/2026` rồi Enter → PUT vẫn gửi ngày cũ `2026-08-10` trong khi ô
    // hiện ngày mới; gõ `abc` rồi Enter → không báo lỗi, vẫn submit và trả 200.
    //
    // Enter là đường dính chắc nhất vì `onKeyDown` dưới đây gọi blur() mà không đóng popover. Bấm
    // CHUỘT ra ngoài thì tình cờ thoát: Radix dismiss ở pointerdown, React xả `isOpen=false` xong
    // mới tới blur. Chính chỗ "tình cờ" đó làm bug trông lúc có lúc không — nên guard phải hỏi
    // "có đang bấm vào lịch không", chứ không hỏi "popover có mở không".
    if (pointerInsidePopoverRef.current) return
    const trimmed = inputText.trim()
    if (!trimmed) {
      keepManualTextRef.current = false
      onChange?.('')
      return
    }
    const parsed = parse(trimmed, DATE_FORMAT, new Date())
    if (!isValid(parsed)) {
      rejectManualInput('Ngày không hợp lệ. Định dạng: DD/MM/YYYY')
      return
    }
    const year = parsed.getFullYear()
    if (year < 1000 || year > 9999) {
      rejectManualInput('Ngày không hợp lệ. Định dạng: DD/MM/YYYY (năm 4 chữ số)')
      return
    }
    if (year < fromYearResolved || year > toYearResolved) {
      rejectManualInput(`Năm phải từ ${fromYearResolved} đến ${toYearResolved}`)
      return
    }
    keepManualTextRef.current = false
    const formatted = format(parsed, DATE_FORMAT)
    onChange?.(formatted)
    setInputText(formatted)
  }, [inputText, onChange, rejectManualInput, fromYearResolved, toYearResolved])

  const showClear = clearable && (allowManualInput ? inputText : committedValue) && !disabled

  if (allowManualInput) {
    return (
      <Flex direction="column" gap="2" className={cn('flex-1', className)}>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverAnchor asChild>
            <Flex gap="2" align="end" className="w-full">
              <TextField
                label={label}
                required={required}
                placeholder={placeholder || 'DD/MM/YYYY'}
                value={inputText}
                onChange={(val) => {
                  keepManualTextRef.current = false
                  setInputText(val)
                  setManualInputError(null)
                }}
                onFocus={() => {
                  if (disabled) return
                  // Chọn ngày trên lịch bật `justSelectedFromCalendarRef` nhưng KHÔNG sinh blur nào
                  // ngay sau đó để hạ cờ (input đã blur từ lúc pointerdown). Cờ vì thế tồn lưu, và
                  // lần gõ tay KẾ TIẾP bị nó nuốt mất — đo trên dev 24/08: chọn 20/08 trên lịch rồi
                  // gõ 09/07/2026, ô hiện 09/07 mà PUT vẫn gửi 2026-08-20. Mỗi lần focus là một lượt
                  // tương tác mới, không còn dính lượt chọn lịch trước đó.
                  justSelectedFromCalendarRef.current = false
                  setTimeout(() => setIsOpen(true), 0)
                }}
                onBlur={handleManualBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.stopPropagation()
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                disabled={disabled}
                error={manualInputError ?? error}
                caption={caption}
                className="min-w-0 flex-1"
                suffix={
                  <div className="flex shrink-0 items-center gap-1">
                    {showClear && (
                      <>
                        <IconX
                          className="text-content-dark-3 hover:text-content-dark-1 h-5 w-5 cursor-pointer"
                          onClick={handleClear}
                        />
                        <Separator orientation="vertical" className="h-5" />
                      </>
                    )}
                    <button
                      type="button"
                      aria-label="Chọn ngày"
                      disabled={disabled}
                      onClick={() => setIsOpen(true)}
                      className="text-content-dark-2 hover:text-content-dark-1 inline-flex cursor-pointer items-center justify-center border-none bg-transparent p-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <IconCalendarblank className="h-5 w-5" />
                    </button>
                  </div>
                }
              />
            </Flex>
          </PopoverAnchor>
          <PopoverContent
            className="bg-background-1 w-auto min-w-[325px] border-none p-0 shadow"
            align="start"
            side="bottom"
            avoidCollisions={avoidCollisions}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onPointerDownCapture={() => {
              // Blur do đổi focus chạy đồng bộ ngay trong lượt pointerdown/mousedown này, nên cờ
              // còn bật lúc handleManualBlur đọc. Hạ ở macrotask kế để lần blur SAU (bấm nút Lưu,
              // sang field khác) không bị nuốt oan — pointerdown vào vùng không focus được thì
              // không có blur nào để tự hạ cờ.
              pointerInsidePopoverRef.current = true
              setTimeout(() => {
                pointerInsidePopoverRef.current = false
              }, 0)
            }}
          >
            <div className={cn('flex items-center justify-center')}>
              <Calendar
                data-slot="card-content"
                mode="single"
                captionLayout="dropdown"
                selected={parsedDate}
                defaultMonth={parsedDate || new Date()}
                onSelect={handleSelectDate}
                disabled={disabledDays || disabled}
                autoFocus={false}
                className={cn('flex-1', 'rounded-lg', 'border-none')}
                toYear={toYear}
                fromYear={fromYear}
              />
            </div>
          </PopoverContent>
        </Popover>
      </Flex>
    )
  }

  return (
    <Flex direction="column" gap="2" className={cn('flex-1', className)}>
      {label && (
        <Text className="typo-body-base-semibold text-content-dark-2">
          {label}
          {required && <span className="text-action-primary-red-default"> *</span>}
        </Text>
      )}
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen((prev) => (prev === open ? prev : open))
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="secondary-border"
            role="combobox"
            aria-expanded={isOpen}
            disabled={disabled}
            leftIcon={<IconCalendarblank />}
            rightIcon={
              <div className="flex items-center gap-1">
                <IconX
                  className={cn(
                    !showClear && 'hidden',
                    `text-content-dark-3 hover:text-content-dark-1 h-5 w-5 cursor-pointer`
                  )}
                  onClick={handleClear}
                />
                <Separator
                  orientation={'vertical'}
                  className={cn(!showClear && 'hidden', 'h-5')}
                ></Separator>
                <IconCaretdown className="h-5 w-5" />
              </div>
            }
            className={cn(
              'w-full items-center text-left font-normal',
              'border-border-1',
              disabled &&
                'border-neutral-60 bg-data-light-grey-disabled hover:border-neutral-60 cursor-not-allowed opacity-100'
            )}
          >
            {committedValue ? (
              <span className={cn(disabled && 'text-content-dark-4')}>{committedValue}</span>
            ) : (
              <span className={cn(disabled ? 'text-content-dark-4' : 'text-neutral-80')}>
                {placeholder || 'DD/MM/YYYY'}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="bg-background-1 w-auto min-w-[325px] border-none p-0 shadow"
          align={'start'}
          avoidCollisions={avoidCollisions}
        >
          <div className={cn('flex items-center justify-center')}>
            <Calendar
              data-slot="card-content"
              mode="single"
              captionLayout="dropdown"
              selected={parsedDate}
              defaultMonth={parsedDate || new Date()}
              onSelect={handleSelectDate}
              disabled={disabledDays || disabled}
              autoFocus={false}
              className={cn('flex-1', 'rounded-lg', 'border-none')}
              toYear={toYear}
              fromYear={fromYear}
            />
          </div>
        </PopoverContent>
      </Popover>
      <FormCaption caption={caption} error={error} disabled={disabled} />
    </Flex>
  )
})

DatePicker.displayName = 'DatePicker'
