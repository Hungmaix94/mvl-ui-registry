import { cn } from '@/utils'
import { ColoredValueVariant } from '@/api/schema.ts'

export type DotVariant = ColoredValueVariant
export type DotSize = 'small' | 'base'

export type DotProps = {
  variant?: DotVariant
  size?: DotSize
  className?: string
}

/**
 * Dot Component
 *
 * A reusable dot indicator component with different color variants and sizes.
 * Uses design tokens for consistent theming based on Figma design system.
 * Commonly used to show status indicators.
 *
 * @example
 * ```tsx
 * <Dot variant={ColoredValueVariant.GREEN} size="small" />
 * <Dot variant={ColoredValueVariant.PURPLE} size="base" />
 * ```
 */
const Dot = ({ variant = ColoredValueVariant.GREEN, size = 'small', className }: DotProps) => {
  // Dot background colors matching Chip component
  const variantStyles = {
    [ColoredValueVariant.GREEN]: 'bg-data-green-default',
    [ColoredValueVariant.BLUE]: 'bg-data-blue-default',
    [ColoredValueVariant.YELLOW]: 'bg-data-yellow-default',
    [ColoredValueVariant.PURPLE]: 'bg-data-purple-default',
    [ColoredValueVariant.RED]: 'bg-data-red-default',
    [ColoredValueVariant.ORANGE]: 'bg-data-orange-default',
    [ColoredValueVariant.GREY]: 'bg-content-dark-3',
  }

  // Size styles
  const sizeStyles = {
    small: 'size-2',
    base: 'size-[10px]',
  }

  return (
    <span
      className={cn('shrink-0 rounded-full', variantStyles[variant], sizeStyles[size], className)}
    />
  )
}

export default Dot
