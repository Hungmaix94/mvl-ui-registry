import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Button } from '../../ui/button'
import { Popover, PopoverContentPrimitive, PopoverTrigger } from '../../ui/popover'
import { IconDotsthreeoutline } from '../../icons/system-devices'
import { TableAction } from '@/types/table'
import { cn } from '@/utils'

interface TableActionMenuProps<TData> {
  row: TData
  actions: TableAction<TData>[]
  onRefReady?: (ref: TableActionMenuRef) => void
  wrapperClassName?: string
}

export interface TableActionMenuRef {
  trigger: () => void
}

function TableActionMenuInner<TData>(
  { row, actions, onRefReady, wrapperClassName }: TableActionMenuProps<TData>,
  ref: React.Ref<TableActionMenuRef>
) {
  const [isOpen, setIsOpen] = useState(false)

  const actionMenuRef = useRef<TableActionMenuRef>({
    trigger: () => {
      setIsOpen(true)
    },
  })

  // Filter actions based on show condition
  const visibleActions = actions.filter((action: TableAction<TData>) =>
    action.show ? action.show(row) : true
  )

  useImperativeHandle(ref, () => actionMenuRef.current, [])

  // Notify parent when ref is ready
  useEffect(() => {
    if (onRefReady) {
      onRefReady(actionMenuRef.current)
    }
  }, [onRefReady])

  if (visibleActions.length === 0) {
    return null
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="text"
          size="small"
          iconOnly
          className={cn(
            'text-content-dark-1 hover:bg-data-light-grey-hover h-8 w-8 p-0',
            isOpen && 'bg-data-light-grey-hover'
          )}
          aria-label="Open actions menu"
          onClick={(event) => {
            // Prevent row-level click handler from triggering cursor-based menu
            event.stopPropagation()
          }}
        >
          <IconDotsthreeoutline size={24} />
        </Button>
      </PopoverTrigger>
      <PopoverContentPrimitive
        align="end"
        className={cn(
          'bg-content-light-1 border-border-1 w-max max-w-[28rem] min-w-[13rem] p-0',
          wrapperClassName
        )}
        sideOffset={4}
      >
        <div className="space-y-1" role="menu">
          {visibleActions.map((action: TableAction<TData>, index: number) => (
            <button
              type="button"
              key={index}
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation()
                action.onClick(row)
                setIsOpen(false) // Close popover after action
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                'hover:bg-data-light-grey-hover',
                action.variant === 'danger'
                  ? 'text-data-red-default hover:text-data-red-hover hover:bg-data-red-disabled'
                  : action.variant === 'success'
                    ? 'text-data-green-default hover:text-data-green-hover hover:bg-data-green-disabled'
                    : 'text-content-dark-1',
                'hover:cursor-pointer',
                'focus:outline-action-outline-default',
                action.className
              )}
            >
              {action.icon && (
                <span className="flex h-4 w-4 items-center justify-center">{action.icon}</span>
              )}
              <span className="whitespace-nowrap">{action.label}</span>
            </button>
          ))}
        </div>
      </PopoverContentPrimitive>
    </Popover>
  )
}

// Create the forwardRef component with proper generic typing
const TableActionMenu = forwardRef(TableActionMenuInner) as <TData>(
  props: TableActionMenuProps<TData> & { ref?: React.Ref<TableActionMenuRef> }
) => React.ReactElement | null

export { TableActionMenu }
