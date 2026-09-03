import * as React from 'react'
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker'
import { Button, buttonVariants } from '../button.tsx'
import { cn } from '@/lib/utils.ts'
import CalendarDayButton from '@/components/ui/calendar/calendar-button.tsx'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  size = 'default',
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
  size?: 'default' | 'compact'
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'bg-background-1 group/calendar [--cell-size:--spacing(10)] [[data-slot=card-content]_&]:bg-transparent',
        // size === 'compact' && '[--cell-size:--spacing(6)]',
        'p-0',
        size === 'compact' && 'p-0',
        'rounded-lg',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        // formatCaption: (date) => {
        //   return (
        //     <div className="flex items-center justify-center gap-1.5 text-sm font-medium">
        //       {date.toLocaleString('default', { month: 'long' })} {date.getFullYear()}
        //     </div>
        //   )
        // },
        formatWeekdayName: (date) => date.toLocaleString('vi', { weekday: 'short' }),
        formatMonthCaption: (date) => {
          return date.toLocaleString('vi', { month: 'long' })
        },
        formatYearCaption: (date) => {
          return date.getFullYear().toString()
        },
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn(
          'flex flex-col md:flex-row relative',
          size === 'compact' ? 'gap-2' : 'gap-4',
          defaultClassNames.months
        ),
        month: cn('flex flex-col w-full gap-4', defaultClassNames.month),
        nav: cn(
          'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between',
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'size-(--cell-size) p-0 aria-disabled:opacity-50 select-none',
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none',
          defaultClassNames.button_next
        ),
        caption_label: cn('select-none font-medium text-sm', defaultClassNames.caption_label),

        head_cell: cn('text-muted-foreground rounded-md flex-1 font-normal select-none text-xs'),
        table: 'w-full border-collapse border-spacing-0',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'text-muted-foreground rounded-md flex-1 font-normal select-none',
          size === 'compact' ? 'text-xs' : 'text-[0.8rem]',
          defaultClassNames.weekday
        ),
        week: cn('flex w-full mt-2', defaultClassNames.week),
        week_number_header: cn('select-none w-(--cell-size)', defaultClassNames.week_number_header),
        week_number: cn(
          'select-none text-muted-foreground',
          size === 'compact' ? 'text-xs' : 'text-[0.8rem]',
          defaultClassNames.week_number
        ),
        day: cn(
          'relative w-full h-full p-0 text-center ',
          // '[&:first-child[data-selected=true]_button]:rounded-l-md ',
          // '[&:last-child[data-selected=true]_button]:rounded-r-md' ,
          ' group/day aspect-square select-none',
          defaultClassNames.day
        ),
        range_start: cn('bg-accent', defaultClassNames.range_start),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('bg-accent', defaultClassNames.range_end),
        today: cn(
          'bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none',
          defaultClassNames.today
        ),
        outside: cn(
          'text-muted-foreground aria-selected:text-muted-foreground',
          defaultClassNames.outside
        ),
        disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
        },

        CaptionLabel: ({ ...props }) => {
          return (
            <div className="flex h-8 w-full items-center justify-center text-sm font-medium">
              {props.children}
            </div>
          )
        },
        DayButton: (props: React.ComponentProps<typeof DayButton>) => (
          <CalendarDayButton {...props} size={size} />
        ),
        ...components,
      }}
      {...props}
    />
  )
}

export { Calendar }
export default Calendar
