import React from 'react'
import { cn } from '@/utils'
import Switch from '@/components/ui/switch/Switch'
import { IconDotssixvertical } from '@/assets/icons'

export type VisibilityRowProps = {
  text: string
  checked?: boolean
  onToggle?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

const VisibilityRow = React.forwardRef<HTMLDivElement, VisibilityRowProps>(
  ({ text, checked = false, onToggle, disabled = false, className, ...props }, ref) => {
    const handleCheckedChange = (isChecked: boolean) => {
      onToggle?.(isChecked)
    }

    // Extract drag listeners if provided
    const { style, ...dragProps } = props as any

    return (
      <div
        ref={ref}
        style={style}
        className={cn(
          'bg-content-light-1 flex w-full items-center justify-between px-[10px] py-[12px]',
          className
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-[6px]">
          {/* Drag handle icon */}
          <div
            className="flex h-[20px] w-[20px] cursor-grab items-center justify-center active:cursor-grabbing"
            {...dragProps}
          >
            <IconDotssixvertical />
          </div>

          {/* Column name */}
          <span
            className="text-content-dark-1 block min-w-0 truncate text-sm leading-[1.5] font-normal"
            title={text}
          >
            {text}
          </span>
        </div>

        {/* Custom Switch */}
        <Switch
          checked={checked}
          onChange={handleCheckedChange}
          disabled={disabled}
          size="large"
          tooltip={checked ? 'Tắt hiển thị' : 'Bật hiển thị'}
          className="shrink-0"
        />
      </div>
    )
  }
)

VisibilityRow.displayName = 'VisibilityRow'

export default VisibilityRow
