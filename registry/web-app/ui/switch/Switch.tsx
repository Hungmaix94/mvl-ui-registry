import React from 'react'
import { cn } from '@/utils'

export type SwitchProps = {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: 'small' | 'medium' | 'large'
  tooltip?: string
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    { checked = false, onChange, disabled = false, className, size = 'medium', tooltip, ...props },
    ref
  ) => {
    const handleClick = () => {
      if (!disabled && onChange) {
        onChange(!checked)
      }
    }

    const sizeConfig = {
      small: {
        container: 'h-[14px] w-[26px]',
        thumb: 'h-[10px] w-[10px]',
        translate: checked ? 'translate-x-[13px]' : 'translate-x-[2px]',
      },
      medium: {
        container: 'h-[18px] w-[32px]',
        thumb: 'h-[12px] w-[12px]',
        translate: checked ? 'translate-x-[15px]' : 'translate-x-[3px]',
      },
      large: {
        container: 'h-[22px] w-[40px]',
        thumb: 'h-[16px] w-[16px]',
        translate: checked ? 'translate-x-[19px]' : 'translate-x-[3px]',
      },
    }

    const currentSize = sizeConfig[size]

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        title={tooltip || undefined}
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          'relative',
          'inline-flex shrink-0 ease-in-out focus:ring-0 focus:outline-none',
          'transition-colors duration-200',
          'rounded-full border-[1px] border-solid',
          'cursor-pointer',
          currentSize.container,
          checked
            ? 'bg-data-light-grey-default border-action-primary-red-default'
            : 'bg-data-light-grey-default border-action-outline-disabled',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none',
            'inline-block',
            'transform transition duration-200 ease-in-out',
            'rounded-full',
            'shadow-lg ring-0',
            'absolute top-1/2 -translate-y-1/2',
            currentSize.thumb,
            currentSize.translate,
            checked ? 'bg-data-red-default' : 'bg-data-light-grey-disabled'
          )}
        />
      </button>
    )
  }
)

Switch.displayName = 'Switch'

export default Switch
