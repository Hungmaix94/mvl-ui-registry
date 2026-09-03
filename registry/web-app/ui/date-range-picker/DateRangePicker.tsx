import { type DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar/date-range-picker/calendar.tsx'
import { Button } from '@/components/ui'
import { TextField } from '@/components/ui/text-field/TextField'
import { IconCalendarblank, IconCaretdown, IconX } from '@/assets/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@radix-ui/themes'
import { cn } from '@/lib/utils.ts'
import { getOutOfBoundsError } from './date-range-bounds'
import React, { useEffect, useState } from 'react'
import {
  endOfMonth,
  endOfQuarter,
  isSameDay,
  startOfMonth,
  startOfQuarter,
  subMonths,
} from 'date-fns'

type TDateRangePicker = {
  label?: string
  subtitle?: string
  required?: boolean
  id?: string
  disabled?: boolean
  className?: string
  value?: DateRange | undefined | null
  onChange?: (range: DateRange | undefined | null) => void
  // New props
  showQuickSelect?: boolean // Default: false
  disableFutureDates?: boolean // Default: false
  /** Earliest selectable day (inclusive). Blocks the calendar AND typed input. */
  minDate?: Date
  /** Latest selectable day (inclusive). Blocks the calendar AND typed input. */
  maxDate?: Date
  onApply?: (range: DateRange | undefined) => void
  onCancel?: () => void
  error?: string
}

// Input-field formatter: empty string for a missing date, unlike `formatDate` from date-utils
// which renders "-" for display. Both inputs must go blank, not show a dash.
const formatDate = (date?: Date): string => {
  if (!date) return ''
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Parse DD/MM/YYYY string to Date
function parseDateString(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') {
    return null
  }

  const parts = dateStr.split('/')

  if (parts.length !== 3) {
    return null
  }

  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)

  // Validate ranges
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null
  }
  if (month < 1 || month > 12) {
    return null
  }
  if (day < 1 || day > 31) {
    return null
  }
  if (year < 1000 || year > 9999) {
    return null
  }

  const date = new Date(year, month - 1, day)

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return null
  }
  if (date.getDate() !== day || date.getMonth() !== month - 1) {
    return null
  }

  return date
}

// Validate date inputs
function validateDateInputs(
  fromStr: string,
  toStr: string,
  disableFutureDates?: boolean,
  minDate?: Date,
  maxDate?: Date
): {
  from?: string
  to?: string
} {
  const errors: { from?: string; to?: string } = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Validate "Từ" if not empty
  if (fromStr && fromStr.trim() !== '') {
    const fromDate = parseDateString(fromStr)
    if (!fromDate) {
      errors.from = 'Ngày không hợp lệ. Định dạng: DD/MM/YYYY'
    } else if (disableFutureDates && fromDate > today) {
      errors.from = 'Không thể chọn ngày trong tương lai'
    } else {
      const boundError = getOutOfBoundsError(fromDate, minDate, maxDate)
      if (boundError) errors.from = boundError
    }
  }

  // Validate "Đến" if not empty
  if (toStr && toStr.trim() !== '') {
    const toDate = parseDateString(toStr)
    if (!toDate) {
      errors.to = 'Ngày không hợp lệ. Định dạng: DD/MM/YYYY'
    } else if (disableFutureDates && toDate > today) {
      errors.to = 'Không thể chọn ngày trong tương lai'
    } else {
      const boundError = getOutOfBoundsError(toDate, minDate, maxDate)
      if (boundError) errors.to = boundError
    }
  }

  return errors
}

// Helper function to normalize empty input values
function normalizeInputValue(value: string): string {
  if (!value || value.trim() === '') {
    return ''
  }
  return value.trim()
}

const DateRangePicker = React.forwardRef<HTMLButtonElement, TDateRangePicker>(
  (
    {
      label,
      subtitle,
      required = false,
      id,
      disabled = false,
      className,
      value,
      onChange,
      showQuickSelect = false,
      disableFutureDates = false,
      minDate,
      maxDate,
      onApply,
      onCancel,
      error,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [committedDateRange, setCommittedDateRange] = useState<DateRange | undefined | null>(
      value
    )
    const [workingDateRange, setWorkingDateRange] = useState<DateRange | undefined | null>(value)
    const [inputErrors, setInputErrors] = useState<{ from?: string; to?: string }>({})
    const [fromInputValue, setFromInputValue] = useState('')
    const [toInputValue, setToInputValue] = useState('')
    const [clickCounter, setClickCounter] = useState<number>(0)
    // Falls back to the first allowed month, else a bounded picker opens on today's month with
    // every day greyed out and the user has to page back to reach the window.
    const [displayMonth, setDisplayMonth] = useState<Date | undefined>(
      value?.from ?? minDate ?? maxDate
    )

    const _id = React.useMemo(() => id || `date-range-picker_${Date.now()}`, [id])

    // Sync with external value changes
    useEffect(() => {
      setCommittedDateRange(value)
      if (!isOpen) {
        setWorkingDateRange(value)
        setDisplayMonth(value?.from ?? minDate ?? maxDate)
      }
    }, [value, isOpen, minDate, maxDate])

    // Sync input values with workingDateRange when popover opens or dateRange changes from calendar
    useEffect(() => {
      if (isOpen) {
        setFromInputValue(formatDate(workingDateRange?.from))
        setToInputValue(formatDate(workingDateRange?.to))
      }
    }, [workingDateRange, isOpen])

    // Scroll trigger button into view when popover opens (if label is present)
    // This ensures there's enough space below for the popover to display correctly
    useEffect(() => {
      if (isOpen && _id) {
        // Delay to ensure popover is rendered
        const timeoutId = setTimeout(() => {
          const triggerButton = document.getElementById(_id)
          if (triggerButton) {
            // Scroll trigger button into view, positioning it near top of viewport
            // to ensure space below for popover content
            triggerButton.scrollIntoView({ block: 'start', behavior: 'smooth' })
          }
        }, 100)

        return () => clearTimeout(timeoutId)
      }
    }, [isOpen, _id])

    // When popover opens
    const handleOpenChange = (open: boolean) => {
      setIsOpen(open)
      if (open) {
        // Reset working state to committed state
        setWorkingDateRange(committedDateRange)
        setFromInputValue(formatDate(committedDateRange?.from))
        setToInputValue(formatDate(committedDateRange?.to))
        setDisplayMonth(committedDateRange?.from ?? minDate ?? maxDate)
        setInputErrors({})
        setClickCounter(0) // Reset click counter when opening
      }
    }

    // When cancel or click outside
    const handleCancel = () => {
      setWorkingDateRange(committedDateRange)
      setFromInputValue(formatDate(committedDateRange?.from))
      setToInputValue(formatDate(committedDateRange?.to))
      setInputErrors({})
      setClickCounter(0) // Reset click counter when canceling
      onCancel?.()
      setIsOpen(false)
    }

    // Handle clear value
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      const clearedRange: DateRange | undefined = undefined
      setCommittedDateRange(clearedRange)
      setWorkingDateRange(clearedRange)
      setFromInputValue('')
      setToInputValue('')
      setInputErrors({})
      setClickCounter(0)
      onChange?.(clearedRange)
      setIsOpen(false)
    }

    // When apply
    const handleApply = () => {
      const errors = validateDateInputs(
        fromInputValue,
        toInputValue,
        disableFutureDates,
        minDate,
        maxDate
      )
      if (Object.keys(errors).length > 0) {
        setInputErrors(errors)
        return // Keep popover open
      }

      const fromDate = fromInputValue ? parseDateString(fromInputValue) || undefined : undefined
      const toDate = toInputValue ? parseDateString(toInputValue) || undefined : undefined

      const newRange: DateRange = { from: fromDate, to: toDate }
      if (fromDate && toDate && fromDate > toDate) {
        setInputErrors({
          from: 'Ngày bắt đầu không được lớn hơn ngày kết thúc',
          to: 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu',
        })
        return
      }

      setCommittedDateRange(newRange)
      setWorkingDateRange(newRange)
      setInputErrors({})
      setClickCounter(0) // Reset click counter when applying

      // Always call onChange to update form state
      onChange?.(newRange)

      // Also call onApply if provided
      if (onApply) {
        onApply(newRange)
      }

      setIsOpen(false)
    }

    // Custom handler to capture the actual clicked date
    const handleDateClick = (clickedDate: Date) => {
      // Increment click counter
      const newClickCounter = clickCounter + 1
      setClickCounter(newClickCounter)

      // Determine if this is an odd or even click
      const isOddClick = newClickCounter % 2 === 1

      let updatedRange: DateRange | undefined

      if (isOddClick) {
        // Odd click (1st, 3rd, 5th...) - Set start date to the clicked date, clear end date
        updatedRange = {
          from: clickedDate,
          to: undefined,
        }
      } else {
        // Even click (2nd, 4th, 6th...) - Keep start date, set end date to clicked date
        // Ensure from is always before to
        if (workingDateRange?.from && clickedDate) {
          if (clickedDate < workingDateRange.from) {
            // If clicked date is before from, swap them
            updatedRange = {
              from: clickedDate,
              to: workingDateRange.from,
            }
          } else {
            // Normal case: from stays, to is clicked date
            updatedRange = {
              from: workingDateRange.from,
              to: clickedDate,
            }
          }
        } else {
          // Fallback
          updatedRange = {
            from: workingDateRange?.from,
            to: clickedDate,
          }
        }
      }

      setWorkingDateRange(updatedRange)

      // Sync với input values
      const fromFormatted = formatDate(updatedRange?.from)
      const toFormatted = formatDate(updatedRange?.to)

      setFromInputValue(fromFormatted)
      setToInputValue(toFormatted)
      setInputErrors({}) // Clear errors khi chọn từ calendar
    }

    // Handle blur validation for "Từ" input
    const handleFromBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      try {
        // Check if focus is moving to a calendar button - if so, don't process blur
        const relatedTarget = e.relatedTarget as Element
        if (
          relatedTarget &&
          (relatedTarget.classList.contains('rdp-day_button') ||
            relatedTarget.closest('.rdp-day_button') ||
            relatedTarget.closest('[data-slot="calendar"]'))
        ) {
          return
        }

        const normalizedValue = normalizeInputValue(fromInputValue)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (normalizedValue === '') {
          // Clear error if input is empty
          setFromInputValue(normalizedValue)
          setInputErrors((prev) => ({ ...prev, from: undefined }))
          setWorkingDateRange((prev) => ({ from: undefined, to: prev?.to }))
        } else {
          // Validate if input has value
          const date = parseDateString(normalizedValue)
          if (!date) {
            // DON'T update input value if invalid - keep original value
            setInputErrors((prev) => ({
              ...prev,
              from: 'Ngày không hợp lệ. Định dạng: DD/MM/YYYY',
            }))
          } else if (disableFutureDates && date > today) {
            setInputErrors((prev) => ({
              ...prev,
              from: 'Không thể chọn ngày trong tương lai',
            }))
          } else {
            // Only update if valid
            setFromInputValue(normalizedValue)
            setInputErrors((prev) => ({ ...prev, from: undefined }))
            setWorkingDateRange((prev) => ({ from: date, to: prev?.to }))
          }
          if (date && workingDateRange?.to && date > workingDateRange.to) {
            setInputErrors((prev) => ({
              ...prev,
              from: 'Ngày bắt đầu không được lớn hơn ngày kết thúc',
            }))
          }
        }
      } catch (e) {
        //
      }
    }

    // Handle blur validation for "Đến" input
    const handleToBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      try {
        // Check if focus is moving to a calendar button - if so, don't process blur
        const relatedTarget = e.relatedTarget as Element
        if (
          relatedTarget &&
          (relatedTarget.classList.contains('rdp-day_button') ||
            relatedTarget.closest('.rdp-day_button') ||
            relatedTarget.closest('[data-slot="calendar"]'))
        ) {
          return
        }

        const normalizedValue = normalizeInputValue(toInputValue)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (normalizedValue === '') {
          // Clear error if input is empty
          setToInputValue(normalizedValue)
          setInputErrors((prev) => ({ ...prev, to: undefined }))
          setWorkingDateRange((prev) => ({ from: prev?.from, to: undefined }))
        } else {
          // Validate if input has value
          const date = parseDateString(normalizedValue)
          if (!date) {
            // DON'T update input value if invalid - keep original value
            setInputErrors((prev) => ({ ...prev, to: 'Ngày không hợp lệ. Định dạng: DD/MM/YYYY' }))
          } else if (disableFutureDates && date > today) {
            setInputErrors((prev) => ({
              ...prev,
              to: 'Không thể chọn ngày trong tương lai',
            }))
          } else {
            // Only update if valid
            setToInputValue(normalizedValue)
            setInputErrors((prev) => ({ ...prev, to: undefined }))
            setWorkingDateRange((prev) => ({ from: prev?.from, to: date }))
          }
          if (date && workingDateRange?.from && date < workingDateRange.from) {
            setInputErrors((prev) => ({
              ...prev,
              to: 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu',
            }))
          }
        }
      } catch (e) {
        //
      }
    }

    // Custom suffix for TextField
    const DateInputSuffix = ({
      onClear,
      disabled: suffixDisabled,
    }: {
      onClear: () => void
      disabled?: boolean
    }) => (
      <>
        <IconX
          className={cn(
            'h-4 w-4',
            suffixDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-70'
          )}
          onClick={onClear}
        />
      </>
    )

    // Quick select button click handler
    const handleQuickSelect = (range: DateRange) => {
      setWorkingDateRange(range)
      setFromInputValue(formatDate(range.from))
      setToInputValue(formatDate(range.to))
      setDisplayMonth(range.from)
      setInputErrors({})
      setClickCounter(0) // Reset click counter when using quick select
    }

    // Check if quick select button is active
    const isQuickSelectActive = (range: DateRange) => {
      if (!workingDateRange) return false
      const fromMatch =
        workingDateRange.from && range.from
          ? isSameDay(workingDateRange.from, range.from)
          : !workingDateRange.from && !range.from
      const toMatch =
        workingDateRange.to && range.to
          ? isSameDay(workingDateRange.to, range.to)
          : !workingDateRange.to && !range.to
      return fromMatch && toMatch
    }

    // Get quick select ranges
    const today = new Date()
    const quickSelectOptions = [
      {
        label: 'Tháng này',
        range: { from: startOfMonth(today), to: endOfMonth(today) },
      },
      {
        label: 'Tháng trước',
        range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) },
      },
      {
        label: 'Quý này',
        range: { from: startOfQuarter(today), to: endOfQuarter(today) },
      },
      {
        label: 'Quý trước',
        range: { from: startOfQuarter(subMonths(today, 3)), to: endOfQuarter(subMonths(today, 3)) },
      },
    ]

    return (
      <div className={cn('relative flex w-full flex-col gap-2')}>
        {/* Label */}
        {(label || subtitle) && (
          <div className="flex flex-col gap-1">
            {label && (
              <div className="flex items-center gap-0.5">
                <label htmlFor={_id} className={cn('typo-body-base-semibold text-neutral-90')}>
                  {label}
                </label>
                {required && (
                  <span className={cn('typo-body-base-semibold text-action-primary-red-default')}>
                    *
                  </span>
                )}
              </div>
            )}
            {subtitle && (
              <span className={cn('typo-body-base-regular text-neutral-80')}>{subtitle}</span>
            )}
          </div>
        )}

        <Popover open={isOpen} onOpenChange={handleOpenChange} modal={false}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              id={_id}
              variant="secondary-border"
              role="combobox"
              aria-expanded={isOpen}
              disabled={disabled}
              leftIcon={<IconCalendarblank />}
              rightIcon={
                <div className="flex items-center gap-1">
                  {committedDateRange && (
                    <>
                      <IconX
                        className="text-content-dark-3 hover:text-content-dark-1 h-5 w-5 cursor-pointer"
                        onClick={handleClear}
                      />
                      <Separator orientation={'vertical'} />
                    </>
                  )}
                  <IconCaretdown size={20} />
                </div>
              }
              className={cn(
                'w-full items-center text-left font-normal',
                'border-border-1',
                error && 'border-action-primary-red-default text-action-primary-red-default',
                className
              )}
              childrenClassName={'flex-1'}
            >
              {committedDateRange ? (
                <>
                  <span>
                    {committedDateRange.from ? formatDate(committedDateRange.from) : 'DD/MM/YYYY'}
                  </span>
                  <span>-</span>
                  <span>
                    {committedDateRange.to ? formatDate(committedDateRange.to) : 'DD/MM/YYYY'}
                  </span>
                </>
              ) : (
                <span className={'text-muted-foreground'}>DD/MM/YYYY - DD/MM/YYYY</span>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="center"
            side="bottom"
            // Keep the 2-month calendar inside the viewport: shift/flip only when it would
            // otherwise overflow (near the viewport bottom or beside a fixed sidebar). When there
            // is room at side="bottom" the position is unchanged — so existing usages are unaffected.
            avoidCollisions
            collisionPadding={8}
            className={cn(
              'bg-content-light-1',
              'border-border-1',
              'p-0',
              'z-60',
              'w-auto',
              // Cap height to the space Radix measured as available (set because avoidCollisions
              // is on) and scroll internally, so a tall 2-month calendar near the viewport edge
              // never clips its footer/actions. No effect when the calendar already fits.
              'grid max-h-[var(--radix-popover-content-available-height)] place-items-start overflow-auto'
            )}
          >
            <div className="flex flex-col">
              {/* Header with TextField inputs */}
              <div className={cn('flex items-start gap-3', 'px-4 pt-4 pb-0')}>
                {/* TextField "Từ" */}
                <TextField
                  label="Từ"
                  type="text"
                  value={fromInputValue}
                  onChange={(value) => {
                    // If we have an error and the new value is empty, don't update
                    // This prevents clearing the input when user focuses back after error
                    if (inputErrors.from && value === '') {
                      return
                    }

                    setFromInputValue(value)

                    // Clear error when user starts typing (if there was an error)
                    if (inputErrors.from && value !== '') {
                      setInputErrors((prev) => ({ ...prev, from: undefined }))
                    }

                    // Try to parse and update workingDateRange if valid
                    const date = parseDateString(value)
                    if (date) {
                      setWorkingDateRange((prev) => ({ from: date, to: prev?.to }))
                    }
                  }}
                  onBlur={handleFromBlur}
                  placeholder="DD/MM/YYYY"
                  prefix={<IconCalendarblank className="h-4 w-4" />}
                  suffix={
                    fromInputValue && (
                      <DateInputSuffix
                        onClear={() => {
                          setFromInputValue('')
                          setWorkingDateRange((prev) => ({ from: undefined, to: prev?.to }))
                          setInputErrors((prev) => ({ ...prev, from: undefined }))
                          setClickCounter(0) // Reset click counter when clearing input
                        }}
                        disabled={disabled}
                      />
                    )
                  }
                  error={inputErrors.from}
                  disabled={disabled}
                  size="compact"
                  className="flex-1"
                />

                {/* TextField "Đến" */}
                <TextField
                  label="Đến"
                  type="text"
                  value={toInputValue}
                  onChange={(value) => {
                    // If we have an error and the new value is empty, don't update
                    // This prevents clearing the input when user focuses back after error
                    if (inputErrors.to && value === '') {
                      return
                    }

                    setToInputValue(value)

                    // Clear error when user starts typing (if there was an error)
                    if (inputErrors.to && value !== '') {
                      setInputErrors((prev) => ({ ...prev, to: undefined }))
                    }

                    // Try to parse and update workingDateRange if valid
                    const date = parseDateString(value)
                    if (date) {
                      setWorkingDateRange((prev) => ({ from: prev?.from, to: date }))
                    }
                  }}
                  onBlur={handleToBlur}
                  placeholder="DD/MM/YYYY"
                  prefix={<IconCalendarblank className="h-4 w-4" />}
                  suffix={
                    toInputValue && (
                      <DateInputSuffix
                        onClear={() => {
                          setToInputValue('')
                          setWorkingDateRange((prev) => ({ from: prev?.from, to: undefined }))
                          setInputErrors((prev) => ({ ...prev, to: undefined }))
                          setClickCounter(0) // Reset click counter when clearing input
                        }}
                        disabled={disabled}
                      />
                    )
                  }
                  error={inputErrors.to}
                  disabled={disabled}
                  size="compact"
                  className="flex-1"
                />
              </div>

              {/* Calendar */}
              <div className={cn('flex items-center justify-center', 'p-0 px-4')}>
                <Calendar
                  mode="range"
                  month={displayMonth}
                  onMonthChange={setDisplayMonth}
                  selected={workingDateRange ?? undefined}
                  disabled={
                    disableFutureDates || minDate || maxDate
                      ? (date) => {
                          if (disableFutureDates) {
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            if (date > today) return true
                          }
                          return Boolean(getOutOfBoundsError(date, minDate, maxDate))
                        }
                      : undefined
                  }
                  onSelect={(newRange) => {
                    // Determine the actual clicked date
                    let clickedDate: Date | undefined

                    if (newRange?.from && newRange?.to) {
                      // Both from and to are set
                      // Check if this is the first click (no current workingDateRange)
                      if (!workingDateRange?.from && !workingDateRange?.to) {
                        // Some versions of react-day-picker return {from: d, to: d} on first click.
                        // Normalize first click to a single start date and skip handleDateClick to avoid races.
                        const normalizedRange = {
                          from: newRange.from,
                          to: undefined as Date | undefined,
                        }
                        setWorkingDateRange(normalizedRange)
                        const fromFormatted = formatDate(newRange.from)
                        setFromInputValue(fromFormatted)
                        setToInputValue('')
                        setInputErrors({})
                        setClickCounter(1)
                        return
                      } else if (workingDateRange?.from && newRange.from < workingDateRange.from) {
                        // User clicked before current from date - this is a new start
                        clickedDate = newRange.from
                      } else {
                        // User clicked to complete the range - use the to date
                        clickedDate = newRange.to
                      }
                    } else if (newRange?.from && !newRange?.to) {
                      // Only from is set - this means user clicked to start a new range
                      clickedDate = newRange.from
                    } else if (!newRange?.from && newRange?.to) {
                      // Only to is set - this shouldn't happen in range mode, but handle it
                      clickedDate = newRange.to
                    }

                    if (clickedDate) {
                      // Call our custom handler with the actual clicked date
                      handleDateClick(clickedDate)
                    } else {
                      // Fallback: update visual state only
                      setWorkingDateRange(newRange)
                    }
                  }}
                  numberOfMonths={2}
                  toYear={2100}
                  // size="compact"
                  showOutsideDays={false}
                  className={cn('flex-1', 'rounded-lg', 'border-none')}
                />
              </div>

              {/* Quick Select Buttons */}
              {showQuickSelect && (
                <div className={cn('flex items-start gap-2', 'px-4 py-4')}>
                  {quickSelectOptions.map((option) => (
                    <Button
                      key={option.label}
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => handleQuickSelect(option.range)}
                      className={cn(
                        isQuickSelectActive(option.range)
                          ? 'bg-action-primary-red-activated border-action-primary-red-default text-action-primary-red-default hover:bg-action-primary-red-activated hover:border-action-primary-red-hover hover:text-action-primary-red-hover border'
                          : 'bg-data-light-grey-default border-content-light-2 text-content-dark-3 border'
                      )}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Footer with Action Buttons */}
              <div
                className={cn(
                  'border-border-1 border-t border-solid',
                  'flex items-center justify-between px-4 py-3'
                )}
              >
                <Button
                  type="button"
                  variant="text"
                  size="small"
                  onClick={handleCancel}
                  className="text-action-primary-red-default hover:text-action-primary-red-hover p-0"
                >
                  Huỷ
                </Button>
                <Button
                  type="button"
                  size="small"
                  onClick={handleApply}
                  className="bg-action-primary-red-default hover:bg-action-primary-red-hover min-w-[128px] text-white"
                >
                  Áp dụng
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {error && (
          <span className="typo-body-sm text-action-primary-red-default mt-1">{error}</span>
        )}
      </div>
    )
  }
)

DateRangePicker.displayName = 'DateRangePicker'

export { DateRangePicker }
export default DateRangePicker
