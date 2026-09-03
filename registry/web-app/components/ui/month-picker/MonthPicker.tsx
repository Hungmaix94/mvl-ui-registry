import React, { forwardRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Popover, PopoverContentPrimitive, PopoverTrigger } from '@/components/ui/popover'
import { IconCalendarblank, IconCaretdown, IconX } from '@/assets/icons'
import { cn } from '@/utils'
import { Flex, Separator, Text } from '@radix-ui/themes'

type MonthPickerProps = {
  value?: Date | string | null
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  label?: string
  required?: boolean
  showYear?: boolean
  disabled?: boolean
  className?: string
  buttonType?: 'button' | 'submit' | 'reset'
  error?: string
}

const ensureDate = (val: Date | string | null | undefined): Date | undefined => {
  if (!val) return undefined
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? undefined : val
  }
  if (typeof val === 'string') {
    const parsed = new Date(val)
    return isNaN(parsed.getTime()) ? undefined : parsed
  }
  return undefined
}

const MonthPicker = forwardRef<HTMLButtonElement, MonthPickerProps>(
  (
    {
      value,
      onChange,
      label,
      placeholder = 'Chọn tháng',
      showYear = true,
      disabled = false,
      required = false,
      className,
      buttonType = 'button',
      error,
    },
    ref
  ) => {
    const normalizedValue = ensureDate(value)
    const [isOpen, setIsOpen] = useState(false)
    const [committedValue, setCommittedValue] = useState<Date | undefined>(normalizedValue)
    const [workingValue, setWorkingValue] = useState<Date | undefined>(normalizedValue)
    const [selectedYear, setSelectedYear] = useState(
      normalizedValue?.getFullYear() || new Date().getFullYear()
    )
    const [selectedMonth, setSelectedMonth] = useState(
      normalizedValue?.getMonth() || new Date().getMonth()
    )
    const isClearingRef = React.useRef(false)

    const months = [
      'Tháng 1',
      'Tháng 2',
      'Tháng 3',
      'Tháng 4',
      'Tháng 5',
      'Tháng 6',
      'Tháng 7',
      'Tháng 8',
      'Tháng 9',
      'Tháng 10',
      'Tháng 11',
      'Tháng 12',
    ]

    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i)

    // Sync with external value changes
    useEffect(() => {
      // If value prop has been updated to undefined/null while clearing, reset the flag and sync
      if (isClearingRef.current) {
        if (normalizedValue === undefined) {
          isClearingRef.current = false
          // Continue to sync the cleared value
        } else {
          // Still clearing, skip sync to prevent restoring old value from prop
          return
        }
      }

      // Prevent syncing from value prop if committedValue is undefined (was cleared)
      // This prevents restoring cleared values when value prop hasn't been updated yet
      if (committedValue === undefined && normalizedValue !== undefined) {
        // Don't sync from value prop if we've cleared the committedValue
        // Wait for value prop to be updated to undefined/null by the form
        return
      }

      // Only sync if value actually changed
      const valueChanged =
        (normalizedValue === undefined && committedValue !== undefined) ||
        (normalizedValue !== undefined && committedValue === undefined) ||
        (normalizedValue !== undefined &&
          committedValue !== undefined &&
          normalizedValue.getTime() !== committedValue.getTime())

      if (!valueChanged) {
        return
      }

      setCommittedValue(normalizedValue)
      if (!isOpen) {
        setWorkingValue(normalizedValue)
        if (normalizedValue) {
          setSelectedYear(normalizedValue.getFullYear())
          setSelectedMonth(normalizedValue.getMonth())
        } else {
          // Reset to current month/year when value is cleared
          const now = new Date()
          setSelectedYear(now.getFullYear())
          setSelectedMonth(now.getMonth())
        }
      }
    }, [normalizedValue, isOpen, committedValue, workingValue])

    // When popover opens/closes
    const handleOpenChange = (open: boolean) => {
      setIsOpen(open)
      if (open) {
        // Reset working state to committed state
        // Prefer committedValue, but fallback to value prop if committedValue is undefined
        // This handles the case when form opens with initialValues but committedValue hasn't synced yet
        // However, if we're clearing (isClearingRef.current), don't use value prop to avoid restoring cleared values
        const valueToUse = committedValue ?? (!isClearingRef.current ? normalizedValue : undefined)
        if (valueToUse) {
          setWorkingValue(valueToUse)
          setSelectedYear(valueToUse.getFullYear())
          setSelectedMonth(valueToUse.getMonth())
        } else {
          // If no value, initialize workingValue from selectedMonth/selectedYear
          // This ensures the "Áp dụng" button is enabled when user opens the picker
          // Only do this if not clearing, to avoid restoring cleared values
          if (!isClearingRef.current) {
            const now = new Date()
            const currentYear = now.getFullYear()
            const currentMonth = now.getMonth()
            // Use existing selectedYear/Month if they're set, otherwise use current
            const yearToUse = selectedYear ?? currentYear
            const monthToUse = selectedMonth ?? currentMonth
            // Initialize workingValue so "Áp dụng" button is enabled
            const initialDate = showYear
              ? new Date(yearToUse, monthToUse, 1)
              : new Date(currentYear, monthToUse, 1)
            setWorkingValue(initialDate)
            setSelectedYear(yearToUse)
            setSelectedMonth(monthToUse)
          } else {
            // If clearing, don't set workingValue
            setWorkingValue(undefined)
            const now = new Date()
            setSelectedYear(now.getFullYear())
            setSelectedMonth(now.getMonth())
          }
        }
      } else {
        // When closing popover without applying, reset workingValue to committedValue
        // This prevents accidentally committing a value when closing
        // Only reset if we're not in the middle of clearing
        if (!isClearingRef.current) {
          if (committedValue) {
            setWorkingValue(committedValue)
            setSelectedYear(committedValue.getFullYear())
            setSelectedMonth(committedValue.getMonth())
          } else {
            // If no committed value, ensure workingValue is also undefined
            setWorkingValue(undefined)
          }
        }
      }
    }

    // When cancel or click outside
    const handleCancel = () => {
      setWorkingValue(committedValue)
      if (committedValue) {
        setSelectedYear(committedValue.getFullYear())
        setSelectedMonth(committedValue.getMonth())
      }
      setIsOpen(false)
    }

    // When apply
    const handleApply = () => {
      // Only commit if workingValue is defined (user has selected a month)
      if (workingValue) {
        setCommittedValue(workingValue)
        onChange?.(workingValue)
      }
      setIsOpen(false)
    }

    const handleMonthSelect = (month: number) => {
      setSelectedMonth(month)

      if (showYear) {
        // Emit full date with year
        const newDate = new Date(selectedYear, month, 1)
        setWorkingValue(newDate)
      } else {
        // Emit only month (set year to current year for consistency)
        const newDate = new Date(new Date().getFullYear(), month, 1)
        setWorkingValue(newDate)
      }
    }

    const handleYearChange = (year: number) => {
      setSelectedYear(year)
      // Update working value with new year
      if (workingValue) {
        const newDate = new Date(year, workingValue.getMonth(), 1)
        setWorkingValue(newDate)
      }
    }

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      // Set flag to prevent sync from overwriting our clear
      isClearingRef.current = true
      const now = new Date()
      setWorkingValue(undefined)
      setCommittedValue(undefined)
      setSelectedYear(now.getFullYear())
      setSelectedMonth(now.getMonth())
      onChange?.(undefined)
      setIsOpen(false)
      // Reset flag after a delay to allow form to update
      // The useEffect will also reset it when value prop becomes undefined
      setTimeout(() => {
        if (isClearingRef.current) {
          isClearingRef.current = false
        }
      }, 200)
    }

    const displayValue = committedValue
      ? showYear
        ? `${months[committedValue.getMonth()]} ${committedValue.getFullYear()}`
        : months[committedValue.getMonth()]
      : ''

    return (
      <Popover open={isOpen} onOpenChange={handleOpenChange} modal={true}>
        <PopoverTrigger asChild>
          <Flex direction={'column'} gap={'2'}>
            {label && (
              <Flex gap={'1'}>
                <Text className={'typo-body-base-semibold text-content-dark-2'}>{label}</Text>
                {required && (
                  <span className={cn('typo-body-base-semibold text-action-primary-red-default')}>
                    *
                  </span>
                )}
              </Flex>
            )}
            <Button
              ref={ref}
              type={buttonType}
              variant="secondary-border"
              role="combobox"
              aria-expanded={isOpen}
              disabled={disabled}
              leftIcon={<IconCalendarblank />}
              rightIcon={
                <div className="flex items-center gap-1">
                  {committedValue && (
                    <>
                      <IconX
                        className={cn(
                          'hover:text-content-dark-3',
                          disabled
                            ? 'text-content-dark-3 cursor-not-allowed'
                            : 'text-content-dark-1 cursor-pointer',
                          'h-5 w-5'
                        )}
                        onClick={handleClear}
                      />
                      <Separator orientation={'vertical'} />
                    </>
                  )}
                  <IconCaretdown size={20} />
                </div>
              }
              className={cn(
                'border-border-1 w-full items-center text-left font-normal',
                error && 'border-action-primary-red-default',
                className
              )}
            >
              {displayValue || <span className="text-content-dark-3">{placeholder}</span>}
            </Button>
            {error && <Text className="text-data-red-default mt-1 text-xs">{error}</Text>}
          </Flex>
        </PopoverTrigger>

        <PopoverContentPrimitive
          align="start"
          className={cn('bg-content-light-1', 'border-border-1', 'w-80', 'p-0', 'z-60')}
        >
          <div className="flex flex-col">
            {/* Content */}
            <div className="p-4">
              <div className="flex flex-col gap-4">
                {/* Year Selector - Only show if showYear is true */}
                {showYear && (
                  <div className="space-y-2">
                    <Text className="typo-body-base-medium text-content-dark-1">Năm</Text>
                    <select
                      value={selectedYear}
                      onChange={(e) => handleYearChange(Number(e.target.value))}
                      className="border-border-1 focus:ring-action-primary-red-default w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Month Grid */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {months.map((month, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleMonthSelect(index)}
                        className={cn(
                          'rounded-md border px-3 py-2 text-sm transition-colors',
                          'hover:bg-data-red-hover',
                          selectedMonth === index &&
                            (showYear ? selectedYear === workingValue?.getFullYear() : true)
                            ? 'bg-action-primary-red-default border-action-primary-red-default text-white'
                            : 'border-border-1 text-content-dark-1 hover:text-content-light-1'
                        )}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Action Buttons */}
            <div
              className={cn(
                'border-border-1 border-t border-solid',
                'flex items-center justify-between px-4 py-3'
              )}
            >
              <Button
                type={buttonType}
                variant="text"
                size="small"
                onClick={handleCancel}
                className="text-action-primary-red-default hover:text-action-primary-red-hover p-0"
              >
                Huỷ
              </Button>
              <Button
                type={buttonType}
                size="small"
                onClick={handleApply}
                disabled={!workingValue}
                className="bg-action-primary-red-default hover:bg-action-primary-red-hover min-w-[128px] text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Áp dụng
              </Button>
            </div>
          </div>
        </PopoverContentPrimitive>
      </Popover>
    )
  }
)

MonthPicker.displayName = 'MonthPicker'

export default MonthPicker
