'use client'

import { format, isValid, parse } from 'date-fns'
import { forwardRef, useState, useCallback, useEffect, useRef } from 'react'
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover'
import { IconCalendarblank } from '@/assets/icons'
import { cn } from '@/utils'
import { Calendar } from '@/components/ui/calendar/date-single-picker/calendar'
import { DATE_FORMAT, DATETIME_FORMAT, TIME_FORMAT } from '@/constants/date-format'
import { TextField } from '@/components/ui'

interface DateTimePickerProps {
  label?: string
  required?: boolean
  placeholder?: string
  value?: string | null
  onChange?: (value: string | undefined) => void
  disabled?: boolean
  error?: string
  caption?: string
  className?: string
  toYear?: number
  fromYear?: number
}

/** Parse 'dd/MM/yyyy HH:mm' string to a Date, or undefined if invalid */
function parseDisplayDatetime(val: string | null | undefined): Date | undefined {
  if (!val) return undefined
  const d = parse(val, DATETIME_FORMAT, new Date())
  return isValid(d) ? d : undefined
}

/** Convert 24h HH:mm string to 12h components */
function to12h(time24: string): { hour12: number; minute: number; period: string } {
  const [hh, mm] = time24.split(':').map(Number)
  const hour24 = isNaN(hh) ? 23 : hh
  const minute = isNaN(mm) ? 59 : mm
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24
  return { hour12, minute, period }
}

/** Convert 12h components to 24h HH:mm string */
function to24h(hour12: number, minute: number, period: string): string {
  let h = hour12
  if (period === 'PM' && hour12 !== 12) h = hour12 + 12
  else if (period === 'AM' && hour12 === 12) h = 0
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i)

export const DateTimePicker = forwardRef<HTMLDivElement, DateTimePickerProps>(
  function DateTimePicker(
    {
      label,
      required,
      placeholder,
      value,
      onChange,
      disabled,
      error,
      caption,
      className,
      toYear = 2100,
      fromYear,
    },
    ref
  ) {
    const [isOpen, setIsOpen] = useState(false)
    const [inputText, setInputText] = useState('')
    const [manualInputError, setManualInputError] = useState<string | null>(null)
    /** Prevent blur handler from overwriting a value just committed from the picker */
    const justSelectedFromPickerRef = useRef(false)
    const hourRef = useRef<HTMLDivElement>(null)
    const minuteRef = useRef<HTMLDivElement>(null)
    const periodRef = useRef<HTMLDivElement>(null)

    // Committed display value derived from external `value` prop
    const parsedCommitted = parseDisplayDatetime(value)
    const committedValue = parsedCommitted
      ? format(parsedCommitted, DATETIME_FORMAT)
      : typeof value === 'string'
        ? value
        : ''

    // Sync input text whenever external value changes
    useEffect(() => {
      setInputText(committedValue)
    }, [committedValue])

    // Derive date/time parts from current inputText for the picker UI
    const parsedInput = parseDisplayDatetime(inputText)
    const dateStr = parsedInput ? format(parsedInput, DATE_FORMAT) : ''
    const time24Str = parsedInput ? format(parsedInput, TIME_FORMAT) : '23:59'
    const { hour12, minute, period } = to12h(time24Str)

    /** Commit a new datetime — updates inputText and notifies parent */
    const commit = useCallback(
      (newDateStr: string, newTime24: string) => {
        justSelectedFromPickerRef.current = true
        if (!newDateStr) {
          onChange?.(undefined)
          setInputText('')
          return
        }
        const combined = `${newDateStr} ${newTime24}`
        onChange?.(combined)
        setInputText(combined)
      },
      [onChange]
    )

    const handleSelectDate = useCallback(
      (date: Date | undefined) => {
        commit(date ? format(date, DATE_FORMAT) : '', time24Str)
      },
      [commit, time24Str]
    )

    const handleHourChange = useCallback(
      (newHour12: number) =>
        commit(dateStr || format(new Date(), DATE_FORMAT), to24h(newHour12, minute, period)),
      [commit, dateStr, minute, period]
    )

    const handleMinuteChange = useCallback(
      (newMinute: number) =>
        commit(dateStr || format(new Date(), DATE_FORMAT), to24h(hour12, newMinute, period)),
      [commit, dateStr, hour12, period]
    )

    const handlePeriodChange = useCallback(
      (newPeriod: string) =>
        commit(dateStr || format(new Date(), DATE_FORMAT), to24h(hour12, minute, newPeriod)),
      [commit, dateStr, hour12, minute]
    )

    const handleBlur = useCallback(() => {
      setManualInputError(null)
      if (justSelectedFromPickerRef.current) {
        justSelectedFromPickerRef.current = false
        return
      }
      // Click vào popover khiến input blur trong khi popover vẫn mở → bỏ qua
      if (isOpen) return
      const trimmed = inputText.trim()
      if (!trimmed) {
        onChange?.(undefined)
        return
      }
      const parsed = parse(trimmed, DATETIME_FORMAT, new Date())
      if (!isValid(parsed)) {
        setManualInputError('Ngày giờ không hợp lệ. Định dạng: DD/MM/YYYY HH:mm')
        setInputText(committedValue)
        return
      }
      const formatted = format(parsed, DATETIME_FORMAT)
      onChange?.(formatted)
      setInputText(formatted)
    }, [isOpen, inputText, committedValue, onChange])

    const handleWheel = useCallback(
      (e: React.WheelEvent, r: React.RefObject<HTMLDivElement | null>) => {
        if (r.current) {
          e.preventDefault()
          r.current.scrollBy({ top: e.deltaY * 3, behavior: 'instant' })
        }
      },
      []
    )

    // Auto-scroll time selector columns when popover opens
    useEffect(() => {
      if (!isOpen) return
      const timer = setTimeout(() => {
        hourRef.current
          ?.querySelector<HTMLElement>(`[data-hour="${hour12}"]`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        minuteRef.current
          ?.querySelector<HTMLElement>(`[data-minute="${minute}"]`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        periodRef.current
          ?.querySelector<HTMLElement>(`[data-period="${period}"]`)
          ?.scrollIntoView({ block: 'center', behavior: 'instant' })
      }, 100)
      return () => clearTimeout(timer)
    }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <div ref={ref} className={cn('flex w-full flex-col', className)}>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverAnchor asChild>
            <TextField
              label={label}
              required={required}
              placeholder={placeholder || 'DD/MM/YYYY HH:mm'}
              value={inputText}
              onChange={(val) => {
                setInputText(val)
                setManualInputError(null)
              }}
              onFocus={() => {
                if (disabled) return
                setTimeout(() => setIsOpen(true), 0)
              }}
              onBlur={handleBlur}
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
              suffix={
                <button
                  type="button"
                  aria-label="Chọn ngày giờ"
                  disabled={disabled}
                  onClick={() => setIsOpen((prev) => !prev)}
                  className="text-content-dark-2 hover:text-content-dark-1 inline-flex cursor-pointer items-center justify-center border-none bg-transparent p-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconCalendarblank className="h-5 w-5" />
                </button>
              }
            />
          </PopoverAnchor>

          <PopoverContent
            className={cn('bg-background-1', 'w-auto', 'border-none shadow', 'p-0', 'flex')}
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {/* Date selector */}
            <Calendar
              mode="single"
              captionLayout="dropdown"
              selected={parsedInput}
              defaultMonth={parsedInput || new Date()}
              onSelect={handleSelectDate}
              disabled={disabled}
              autoFocus={false}
              className="flex-1 rounded-lg border-none"
              toYear={toYear}
              fromYear={fromYear}
            />

            {/* Time selector */}
            <div className="border-border-1 border-l px-3 pt-2 pb-3">
              <p className="typo-body-sm-semibold text-content-dark-3 mb-2">Giờ / Phút</p>
              <div className="border-border-1 flex max-h-[160px] rounded-sm border">
                {/* Hour */}
                <div
                  ref={hourRef}
                  className="scrollbar-thin scrollbar-thumb-border-2 scrollbar-track-transparent flex max-h-[160px] flex-col overflow-y-auto"
                  style={{ scrollbarWidth: 'thin' }}
                  onWheel={(e) => handleWheel(e, hourRef)}
                >
                  {HOUR_OPTIONS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      data-hour={h}
                      className={cn(
                        'flex h-10 w-14 shrink-0 items-center justify-center',
                        'hover:bg-background-2 cursor-pointer border-0 bg-transparent',
                        hour12 === h &&
                          'bg-action-primary-red-activated border-action-primary-red-default border'
                      )}
                      onClick={() => handleHourChange(h)}
                    >
                      <span
                        className={cn(
                          'text-sm leading-[1.5]',
                          hour12 === h ? 'text-action-primary-red-default' : 'text-content-dark-1'
                        )}
                      >
                        {h.toString().padStart(2, '0')}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="bg-border-1 w-px" />

                {/* Minute */}
                <div
                  ref={minuteRef}
                  className="scrollbar-thin scrollbar-thumb-border-2 scrollbar-track-transparent flex max-h-[160px] flex-col overflow-y-auto"
                  style={{ scrollbarWidth: 'thin' }}
                  onWheel={(e) => handleWheel(e, minuteRef)}
                >
                  {MINUTE_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      data-minute={m}
                      className={cn(
                        'flex h-10 w-14 shrink-0 items-center justify-center',
                        'hover:bg-background-2 cursor-pointer border-0 bg-transparent',
                        minute === m &&
                          'bg-action-primary-red-activated border-action-primary-red-default border'
                      )}
                      onClick={() => handleMinuteChange(m)}
                    >
                      <span
                        className={cn(
                          'text-sm leading-[1.5]',
                          minute === m ? 'text-action-primary-red-default' : 'text-content-dark-1'
                        )}
                      >
                        {m.toString().padStart(2, '0')}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="bg-border-1 w-px" />

                {/* AM/PM */}
                <div
                  ref={periodRef}
                  className="scrollbar-thin scrollbar-thumb-border-2 scrollbar-track-transparent flex max-h-[160px] flex-col overflow-y-auto"
                  style={{ scrollbarWidth: 'thin' }}
                  onWheel={(e) => handleWheel(e, periodRef)}
                >
                  {['AM', 'PM'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      data-period={p}
                      className={cn(
                        'flex h-10 w-14 shrink-0 items-center justify-center',
                        'hover:bg-background-2 cursor-pointer border-0 bg-transparent',
                        period === p &&
                          'bg-action-primary-red-activated border-action-primary-red-default border'
                      )}
                      onClick={() => handlePeriodChange(p)}
                    >
                      <span
                        className={cn(
                          'text-sm leading-[1.5]',
                          period === p ? 'text-action-primary-red-default' : 'text-content-dark-1'
                        )}
                      >
                        {p}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)

DateTimePicker.displayName = 'DateTimePicker'
