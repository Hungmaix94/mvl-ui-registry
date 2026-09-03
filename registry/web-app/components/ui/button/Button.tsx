import React from 'react'
import { cn } from '@/utils'

const IconButtonLoading = () => {
  return (
    <>
      <svg
        className="animate-spin"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="31.416"
          strokeDashoffset="31.416"
        >
          <animate
            attributeName="stroke-dasharray"
            dur="2s"
            values="0 31.416;15.708 15.708;0 31.416"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            dur="2s"
            values="0;-15.708;-31.416"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </>
  )
}

export type ButtonVariant = 'primary' | 'secondary' | 'secondary-border' | 'link' | 'text'

export type ButtonSize = 'extra-large' | 'large' | 'medium' | 'small'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content. For iconOnly buttons, this should be the icon component */
  children?: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  /** If true, button displays only an icon. Must provide icon via children, leftIcon, or rightIcon */
  iconOnly?: boolean
  /** Whether to show background. Only applies to iconOnly buttons */
  showBackground?: boolean
  /** Icon to display on the left side */
  leftIcon?: React.ReactNode
  /** Icon to display on the right side */
  rightIcon?: React.ReactNode
  disabled?: boolean
  loading?: boolean
  className?: string
  childrenClassName?: string
  leftIconClassName?: string
  rightIconClassName?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'medium',
      iconOnly = false,
      showBackground = true,
      leftIcon,
      rightIcon,
      disabled = false,
      loading = false,
      className,
      childrenClassName,
      leftIconClassName,
      rightIconClassName,
      onClick,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    // Validation: Icon-only buttons must have an icon
    if (iconOnly && !leftIcon && !rightIcon && !children) {
      console.warn(
        'Button: iconOnly is true but no icon provided. Please provide an icon via children, leftIcon, or rightIcon.'
      )
    }

    // Size configurations using exact Tailwind spacing calculations (--spacing = 4px)
    const sizeConfig = {
      'extra-large': {
        height: '', // Let content define height naturally
        padding: iconOnly ? 'p-3' : variant === 'text' ? 'px-3 py-1.5' : 'px-4.5 py-3', // p-3=12px, px-4.5=18px (18/4=4.5), py-3=12px, px-3 py-1.5=12px 6px
        text: 'text-lg font-medium leading-6', // text-lg=18px, leading-6=24px ≈ 1.33
        icon: 'w-6 h-6', // 24px (24/4=6)
        gap: 'gap-2', // 8px (8/4=2)
        minWidth: iconOnly ? 'min-w-12.75' : '', // 51px (51/4=12.75)
      },
      large: {
        height: '', // Let content define height naturally
        padding: iconOnly ? 'p-2.5' : variant === 'text' ? 'px-3 py-1.5' : 'px-4.5 py-2', // p-2.5=10px (10/4=2.5), px-4.5=18px (18/4=4.5), py-2=8px, px-3 py-1.5=12px 6px
        text: 'text-base font-medium leading-6', // text-base=16px, leading-6=24px ≈ 1.5
        icon: 'w-5 h-5', // 20px (20/4=5)
        gap: 'gap-2', // 8px (8/4=2)
        minWidth: iconOnly ? 'min-w-10' : '', // 40px (40/4=10)
      },
      medium: {
        height: '', // Let content define height naturally
        padding: iconOnly ? 'p-2.5' : variant === 'text' ? 'px-2 py-1' : 'px-3 py-2', // p-2.5=10px (10/4=2.5), px-3 py-2=12px 8px, px-2 py-1=8px 4px
        text: 'text-sm font-medium leading-5', // text-sm=14px, leading-5=20px ≈ 1.43
        icon: 'w-4 h-4', // 16px (16/4=4)
        gap: 'gap-2', // 8px (8/4=2)
        minWidth: iconOnly ? 'min-w-9.25' : '', // 37px (37/4=9.25)
      },
      small: {
        height: '', // Let content define height naturally
        padding: iconOnly ? 'p-2.25' : variant === 'text' ? 'px-2 py-1' : 'px-3 py-2', // p-2.25=9px (9/4=2.25), px-3 py-2=12px 8px, px-2 py-1=8px 4px
        text: 'text-xs font-medium leading-4', // text-xs=12px, leading-4=16px ≈ 1.33
        icon: 'w-3.5 h-3.5', // 14px (14/4=3.5)
        gap: 'gap-1', // 4px (4/4=1)
        minWidth: iconOnly ? 'min-w-8.25' : '', // 33px (33/4=8.25)
      },
    }

    // Variant configurations using Tailwind classes from Figma color system
    const variantConfig = {
      primary: {
        default: {
          bg: 'bg-action-primary-red-default hover:bg-action-primary-red-hover',
          text: 'text-content-light-1',
          border: 'border-0', // No border
          decoration: 'no-underline', // No underline
        },
        disabled: {
          bg: 'bg-action-primary-red-disabled',
          text: 'text-neutral-70',
          border: 'border-0', // No border
          decoration: 'no-underline', // No underline
        },
      },
      secondary: {
        default: {
          bg: 'bg-action-secondary-grey-default hover:bg-action-secondary-grey-hover', // #c7c7c7
          text: 'text-content-dark-1 hover:text-content-light-1', // #000000 (black)
          border: 'border-0', // No border
          decoration: 'no-underline', // No underline
        },
        disabled: {
          bg: 'bg-action-secondary-grey-disabled', // #f2f2f2
          text: 'text-neutral-70', // #c7c7c7
          border: 'border-0', // No border
          decoration: 'no-underline', // No underline
        },
      },
      'secondary-border': {
        default: {
          bg: 'bg-data-light-grey-default hover:bg-data-light-grey-hover', // #fdfdfd
          text: 'text-content-dark-2', // #4b4b4b
          border: 'border-[1.5px] border-solid border-content-dark-2', // 1.5px solid #4b4b4b
          decoration: 'no-underline', // No underline
        },
        disabled: {
          bg: 'bg-action-secondary-grey-disabled', // #f2f2f2
          text: 'text-neutral-70', // #c7c7c7
          border: 'border-[1.5px] border-solid border-neutral-70', // 1.5px solid #c7c7c7
          decoration: 'no-underline', // No underline
        },
      },
      link: {
        default: {
          bg: 'bg-transparent',
          text: 'text-data-blue-default hover:text-data-blue-hover', // #4976f4
          border: 'border-0', // No border
          decoration: 'no-underline hover:underline hover:decoration-solid', // No underline in default state
        },
        disabled: {
          bg: 'bg-transparent',
          text: 'text-data-blue-disabled', // #dbe4fd (Data/Blue/Disabled)
          border: 'border-0', // No border
          decoration: 'underline decoration-solid', // Has underline when disabled
        },
      },
      text: {
        default: {
          bg: 'bg-transparent',
          text: 'text-action-primary-red-default hover:text-action-primary-red-hover', // #b8292f
          border: 'border-0', // No border
          decoration: 'no-underline', // No underline
        },
        disabled: {
          bg: 'bg-transparent',
          text: 'text-neutral-70', // #c7c7c7
          border: 'border-0', // No border
          decoration: 'no-underline', // No underline
        },
      },
    }

    const currentSize = sizeConfig[size] || sizeConfig['medium']
    const currentVariant = variantConfig[variant] || variantConfig['primary']
    const currentState = isDisabled ? currentVariant.disabled : currentVariant.default

    // Handle background display logic
    // Text buttons and regular buttons always show padding
    // Only icon-only buttons with showBackground=false have no padding
    const shouldShowBackground = showBackground || !iconOnly
    const shouldHavePadding = !iconOnly || showBackground

    const baseClasses = [
      // Base styles - Reset Radix UI styles and apply our design system
      'font-inter', // Use Inter font family
      'inline-flex',
      'items-center',
      'justify-center',
      'relative',
      'rounded', // 4px border radius from Figma
      'transition-all',
      'duration-200',
      'focus:outline-none',
      'focus:ring-0', // No focus ring since Figma doesn't have focus state
      'focus:ring-offset-0', // No focus ring offset
      // Note: Don't reset borders here as secondary-border variant needs them
      'cursor-pointer',

      // Size styles
      shouldHavePadding ? currentSize.padding : 'p-0',
      currentSize.text, // Typography from Figma design system
      currentSize.gap,
      currentSize.minWidth, // Min width for icon-only buttons

      // Variant and state styles
      shouldShowBackground ? currentState.bg : 'bg-transparent',
      currentState.text,
      currentState.border,
      currentState.decoration, // Text decoration (underline for link buttons)

      // Disabled styles
      isDisabled && 'cursor-not-allowed opacity-60',
    ]

    // Handle click
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        e.preventDefault()
        return
      }
      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        onClick={handleClick}
        className={cn(baseClasses, className)}
        aria-disabled={isDisabled}
        {...props}
      >
        {/* Loading State - Show loading icon when loading */}
        {loading && (
          <span className={cn('flex items-center justify-center', currentSize.icon)}>
            <IconButtonLoading />
          </span>
        )}

        {/* Left Icon - Only show when not loading */}
        {!loading && leftIcon && (
          <span
            className={cn('flex items-center justify-center', currentSize.icon, leftIconClassName)}
          >
            {leftIcon}
          </span>
        )}

        {/* Content - Always show text unless it's icon-only */}
        {!iconOnly && children && (
          <span className={cn('min-w-0 flex-shrink flex-grow', childrenClassName)}>{children}</span>
        )}

        {/* Right Icon - Only show when not loading */}
        {!loading && rightIcon && (
          <div className={cn('flex items-center justify-center', rightIconClassName)}>
            {rightIcon}
          </div>
        )}

        {/* Icon Only - User must provide icon via children, show loading when loading */}
        {iconOnly && !leftIcon && !rightIcon && children && !loading && (
          <span
            className={cn('flex items-center justify-center', currentSize.icon, childrenClassName)}
          >
            {children}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
