import { DayButton, getDefaultClassNames } from 'react-day-picker'
import { Button } from '@/components/ui/calendar/button.tsx'
import { cn } from '@/lib/utils.ts'
import { ComponentProps, forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

const CalendarDayButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof DayButton> & {
    size?: 'default' | 'compact'
  }
>(({ className, day, modifiers, size = 'compact', ...props }, ref) => {
  const defaultClassNames = getDefaultClassNames()

  const internalRef = useRef<HTMLButtonElement>(null)

  // Use useImperativeHandle to properly handle both external and internal refs
  useImperativeHandle(ref, () => internalRef.current!, [])

  useEffect(() => {
    if (modifiers.focused) internalRef.current?.focus()
  }, [modifiers.focused])

  const isSelectedSingle =
    modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle

  const isInRange = modifiers.range_start || modifiers.range_end || modifiers.range_middle

  return (
    <Button
      ref={internalRef}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={isSelectedSingle}
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      // Only apply today styling when not selected and not in range (range style takes priority)
      data-today={modifiers.today && !isSelectedSingle && !isInRange}
      onClick={(e) => {
        // Call the original onClick if it exists
        if (props.onClick) {
          props.onClick(e)
        }
      }}
      className={cn(
        'rounded-none',
        // Priority 1: Selected single (highest priority)
        'data-[selected-single=true]:bg-content-dark-1',
        'data-[selected-single=true]:text-content-light-1',
        // Priority 2: Range styles (range_start, range_end, range_middle)
        // Range styles take priority over today styling
        'data-[range-middle=true]:bg-background-3',
        'data-[range-middle=true]:text-content-dark-1',
        'data-[range-start=true]:bg-content-dark-1',
        'data-[range-start=true]:text-content-light-1',
        'data-[range-end=true]:bg-content-dark-1',
        'data-[range-end=true]:text-content-light-1',
        // Priority 3: Today styling (red border, white background, black text)
        // Only applied when not selected and not in range
        'data-[today=true]:border',
        'data-[today=true]:border-action-primary-red-default',
        'data-[today=true]:bg-background-1',
        'data-[today=true]:text-content-dark-1',
        // "group-data-[focused=true]/day:border-ring",
        // "group-data-[focused=true]/day:ring-ring/50",
        'dark:hover:text-accent-foreground',
        'flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1',
        'leading-none font-normal',
        'text-sm',
        '[&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className
      )}
      {...(({ onClick, ...rest }) => rest)(props)}
    />
  )
})

CalendarDayButton.displayName = 'CalendarDayButton'

export default CalendarDayButton
