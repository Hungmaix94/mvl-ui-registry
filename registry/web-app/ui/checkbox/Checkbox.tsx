import React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { IconCheck } from '../../icons/system-devices'
import { cn } from '@/utils'
import { IconMinus } from '../../icons'
import { FormCaption } from '../../ui/form'

export interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  className?: string
  childrenClassName?: string
  label?: string
  error?: string
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps & { value?: any; onChange?: (value: any) => void }
>(
  (
    {
      className,
      childrenClassName,
      label,
      error,
      checked,
      value,
      onChange,
      onCheckedChange,
      ...props
    },
    ref
  ) => {
    const isChecked = checked ?? value

    // `htmlFor` bên dưới trỏ vào `props.id`; không ai truyền `id` thì React bỏ hẳn thuộc tính,
    // `<label>` chẳng buộc vào đâu và `CheckboxPrimitive.Root` — vốn là `<button role="checkbox">`
    // rỗng ruột — không có tên khả truy cập nào. Kết quả: bấm vào chữ không ăn, còn trình đọc
    // màn hình đọc mọi ô là "checkbox, not checked". Tự cấp một id khi call site không cho.
    const fallbackId = React.useId()
    const inputId = props.id ?? fallbackId

    const handleChange = React.useCallback(
      (newChecked: boolean | 'indeterminate') => {
        onCheckedChange?.(newChecked)
        onChange?.(newChecked)
      },
      [onCheckedChange, onChange]
    )
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center space-x-2">
          <CheckboxPrimitive.Root
            ref={ref}
            className={cn(
              // Base
              'peer border-border-1 h-4 w-4 shrink-0 rounded-sm border',
              'ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',

              // State colors
              'data-[state=checked]:bg-action-primary-red-default data-[state=checked]:text-content-light-1',
              'data-[state=checked]:border-action-primary-red-default',
              'data-[state=indeterminate]:bg-action-primary-red-default data-[state=indeterminate]:text-content-light-1',
              'data-[state=indeterminate]:border-action-primary-red-default',
              'hover:data-[state=unchecked]:bg-data-light-grey-hover',

              // Error state
              error && 'border-action-primary-red-default',

              className
            )}
            checked={isChecked}
            onCheckedChange={handleChange}
            {...props}
            id={inputId}
          >
            <CheckboxPrimitive.Indicator
              className={cn('flex items-center justify-center text-current', childrenClassName)}
            >
              {isChecked === 'indeterminate' ? (
                <IconMinus className="h-3 w-3" />
              ) : (
                isChecked && <IconCheck className="h-3 w-3" />
              )}
            </CheckboxPrimitive.Indicator>
          </CheckboxPrimitive.Root>
          {label && (
            <label
              htmlFor={inputId}
              className="text-sm leading-none font-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          )}
        </div>
        {error && <FormCaption error={error} disabled={props.disabled} />}
      </div>
    )
  }
)

Checkbox.displayName = CheckboxPrimitive.Root.displayName

export default Checkbox
