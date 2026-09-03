import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { IconCaretdown } from '@/assets/icons/arrows'
import { IconCalendarblank } from '@/assets/icons'
import { cn } from '@/utils'
import { FormCaption } from '@/components/ui/form'

export type TimePickerProps = {
  label?: string
  required?: boolean
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  className?: string
  wrapperClassName?: string
  disabled?: boolean
  error?: string
  title?: string
  contentClassName: string
}

const TimePicker = React.forwardRef<HTMLDivElement, TimePickerProps>(
  (
    {
      label,
      required,
      placeholder = 'HH:MM',
      value,
      onChange,
      className,
      wrapperClassName,
      disabled = false,
      error,
      title,
      contentClassName,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    const hourRef = useRef<HTMLDivElement>(null)
    const minuteRef = useRef<HTMLDivElement>(null)
    const periodRef = useRef<HTMLDivElement>(null)

    // Parse time from HH:MM format
    const parseTime = (timeStr: string) => {
      if (!timeStr) return { hour: 8, minute: 0, period: 'AM' } // Default to 8:00 AM
      const [hour, minute] = timeStr.split(':').map(Number)
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      return { hour: displayHour, minute: minute || 0, period }
    }

    // Format time to HH:MM
    const formatTime = (hour: number, minute: number, period: string) => {
      let displayHour = hour
      if (period === 'PM' && hour !== 12) {
        displayHour = hour + 12
      } else if (period === 'AM' && hour === 12) {
        displayHour = 0
      }
      return `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }

    const { hour, minute, period } = parseTime(value || '')

    const handleHourChange = useCallback(
      (newHour: number) => {
        onChange?.(formatTime(newHour, minute, period))
      },
      [minute, period, onChange]
    )

    const handleMinuteChange = useCallback(
      (newMinute: number) => {
        onChange?.(formatTime(hour, newMinute, period))
      },
      [hour, period, onChange]
    )

    const handlePeriodChange = useCallback(
      (newPeriod: string) => {
        onChange?.(formatTime(hour, minute, newPeriod))
      },
      [hour, minute, onChange]
    )

    // Generate hour options (1-12)
    const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1)

    // Generate minute options (5-minute intervals)
    const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

    // Auto-scroll to selected values when popover opens
    useEffect(() => {
      if (isOpen) {
        // Use setTimeout to ensure DOM is fully rendered
        const timeoutId = setTimeout(() => {
          // Scroll to selected hour
          if (hourRef.current) {
            const selectedHourButton = hourRef.current.querySelector(
              `[data-hour="${hour}"]`
            ) as HTMLElement
            if (selectedHourButton) {
              selectedHourButton.scrollIntoView({ block: 'center', behavior: 'smooth' })
            }
          }

          // Scroll to selected minute
          if (minuteRef.current) {
            const selectedMinuteButton = minuteRef.current.querySelector(
              `[data-minute="${minute}"]`
            ) as HTMLElement
            if (selectedMinuteButton) {
              selectedMinuteButton.scrollIntoView({ block: 'center', behavior: 'smooth' })
            }
          }

          // Scroll to selected period
          if (periodRef.current) {
            const selectedPeriodButton = periodRef.current.querySelector(
              `[data-period="${period}"]`
            ) as HTMLElement
            if (selectedPeriodButton) {
              selectedPeriodButton.scrollIntoView({ block: 'center', behavior: 'instant' })
            }
          }
        }, 50) // Small delay to ensure DOM is ready

        return () => clearTimeout(timeoutId)
      }
    }, [isOpen, hour, minute, period])

    // Additional effect to handle scroll when popover opens (regardless of value changes)
    useEffect(() => {
      if (isOpen) {
        const timeoutId = setTimeout(() => {
          // Force scroll to current values when popover opens
          setTimeout(() => {
            if (hourRef.current) {
              const selectedHourButton = hourRef.current.querySelector(
                `[data-hour="${hour}"]`
              ) as HTMLElement
              if (selectedHourButton) {
                selectedHourButton.scrollIntoView({ block: 'center', behavior: 'smooth' })
              }
            }
          }, 400)

          // Add small delay for minute scroll to make it slower and smoother
          setTimeout(() => {
            if (minuteRef.current) {
              const selectedMinuteButton = minuteRef.current.querySelector(
                `[data-minute="${minute}"]`
              ) as HTMLElement
              if (selectedMinuteButton) {
                selectedMinuteButton.scrollIntoView({ block: 'center', behavior: 'smooth' })
              }
            }
          }, 200) // 200ms delay for minute scroll
        }, 100) // Slightly longer delay to ensure popover is fully rendered

        return () => clearTimeout(timeoutId)
      }
    }, [isOpen]) // Only depend on isOpen, not on values

    // Trigger onChange when popover closes to ensure form gets updated
    useEffect(() => {
      if (!isOpen && value) {
        // Ensure the current value is passed to parent when popover closes
        onChange?.(value)
      }
    }, [isOpen, value, onChange])

    // Set default value when popover opens if current value is empty
    useEffect(() => {
      if (isOpen && (!value || value === '')) {
        // Set default value to 08:00 when opening with empty value
        const defaultValue = '08:00'
        onChange?.(defaultValue)
      }
    }, [isOpen, value, onChange])

    // Handle wheel events for better scrolling
    const handleWheel = useCallback(
      (e: React.WheelEvent, ref: React.RefObject<HTMLDivElement | null>) => {
        if (ref.current) {
          e.preventDefault()
          // Increase scroll speed by multiplying deltaY by 5
          const scrollSpeed = e.deltaY * 3
          ref.current.scrollBy({
            top: scrollSpeed,
            behavior: 'instant',
          })
        }
      },
      []
    )

    const renderTimeSelector = () => (
      <div className="bg-background-1 border-border-1 flex max-h-[200px] gap-0 rounded-sm border p-0">
        {/* Hour selector (1-12) */}
        <div
          ref={hourRef}
          className="scrollbar-thin scrollbar-thumb-border-2 scrollbar-track-transparent hover:scrollbar-thumb-border-3 flex max-h-[200px] flex-col overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
          onWheel={(e) => handleWheel(e, hourRef)}
        >
          {hourOptions.map((h) => (
            <button
              key={h}
              data-hour={h}
              className={cn(
                'flex h-[40px] w-[64px] flex-col items-center justify-center gap-[12px] p-[16px]',
                'cursor-pointer border-0 bg-transparent',
                'hover:bg-background-2',
                hour === h &&
                  'bg-action-primary-red-activated border-action-primary-red-default border'
              )}
              onClick={() => handleHourChange(h)}
            >
              <span
                className={cn(
                  'text-sm leading-[1.5]',
                  hour === h ? 'text-action-primary-red-default' : 'text-content-dark-1'
                )}
              >
                {h.toString().padStart(2, '0')}
              </span>
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="bg-border-1 w-px" />

        {/* Minute selector (5-minute intervals) */}
        <div
          ref={minuteRef}
          className="scrollbar-thin scrollbar-thumb-border-2 scrollbar-track-transparent hover:scrollbar-thumb-border-3 flex max-h-[200px] flex-col overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
          onWheel={(e) => handleWheel(e, minuteRef)}
        >
          {minuteOptions.map((m) => (
            <button
              key={m}
              data-minute={m}
              className={cn(
                'flex h-10 w-16 flex-col items-center justify-center gap-3 p-4',
                'cursor-pointer border-0 bg-transparent',
                'hover:bg-background-2',
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

        {/* Separator */}
        <div className="bg-border-1 w-px" />

        {/* AM/PM selector */}
        <div
          ref={periodRef}
          className="scrollbar-thin scrollbar-thumb-border-2 scrollbar-track-transparent hover:scrollbar-thumb-border-3 flex max-h-[200px] flex-col overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
          onWheel={(e) => handleWheel(e, periodRef)}
        >
          {['AM', 'PM'].map((p) => (
            <button
              key={p}
              data-period={p}
              className={cn(
                'flex h-[40px] w-[64px] flex-col items-center justify-center gap-[12px] p-[16px]',
                'cursor-pointer border-0 bg-transparent',
                'hover:bg-background-2',
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
    )

    return (
      <div ref={ref} className={cn('flex w-full flex-col gap-2', wrapperClassName)}>
        {label && (
          <div className="flex items-center gap-0.5">
            <label className="typo-body-base-semibold text-content-dark-2">{label}</label>
            {required && (
              <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
            )}
          </div>
        )}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary-border"
              role="combobox"
              aria-expanded={isOpen}
              disabled={disabled}
              rightIcon={<IconCaretdown />}
              leftIcon={<IconCalendarblank />}
              className={cn(
                'w-full justify-between text-left font-normal',
                'border-border-1',
                !value && 'text-content-light-4',
                className
              )}
              title={title}
              childrenClassName={contentClassName}
            >
              {value || placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className={cn('bg-content-light-1', 'border-border-1', 'w-auto p-0', 'z-60')}
          >
            {renderTimeSelector()}
          </PopoverContent>
        </Popover>
        <FormCaption error={error} disabled={disabled} />
      </div>
    )
  }
)

TimePicker.displayName = 'TimePicker'

export default TimePicker
