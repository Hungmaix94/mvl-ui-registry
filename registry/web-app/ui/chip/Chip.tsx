import { IconX } from '@/assets/icons/math-finance'
import { cn } from '@/utils'
import { ColoredValueVariant } from '@/api/schema.ts'

export type ChipVariant = ColoredValueVariant
export type ChipType = 'outlined' | 'contained'
export type ChipSize = 'small' | 'large'

export type ChipProps = {
  label: string
  variant?: ChipVariant
  type?: ChipType
  size?: ChipSize
  showDot?: boolean
  className?: string
  onRemove?: () => void
}

/**
 * Chip Component
 *
 * A reusable badge/chip component with different color variants, types, and sizes.
 * Uses design tokens for consistent theming based on Figma design system.
 *
 * @example
 * ```tsx
 * <Chip label="Web việc làm" variant={ColoredValueVariant.GREEN} type="outlined" size="small" showDot />
 * <Chip label="Marketing" variant={ColoredValueVariant.BLUE} type="contained" size="large" />
 * ```
 */
const Chip = ({
  label,
  variant = ColoredValueVariant.GREEN,
  type = 'outlined',
  size = 'small',
  showDot = false,
  className,
  onRemove,
}: ChipProps) => {
  // Color styles for each variant (text and background)
  const colorStyles = {
    outlined: {
      [ColoredValueVariant.GREEN]: 'text-data-green-default bg-data-green-disabled',
      [ColoredValueVariant.BLUE]: 'text-data-blue-default bg-data-blue-disabled',
      [ColoredValueVariant.YELLOW]: 'text-data-yellow-default bg-data-yellow-disabled',
      [ColoredValueVariant.PURPLE]: 'text-data-purple-default bg-data-purple-disabled',
      [ColoredValueVariant.RED]: 'text-data-red-default bg-data-red-disabled',
      [ColoredValueVariant.ORANGE]: 'text-data-orange-default bg-data-orange-disabled',
      [ColoredValueVariant.GREY]: 'text-content-dark-3 bg-data-light-grey-disabled',
    },
    contained: {
      [ColoredValueVariant.GREEN]: 'text-data-green-default bg-data-green-focus',
      [ColoredValueVariant.BLUE]: 'text-data-blue-default bg-data-blue-focus',
      [ColoredValueVariant.YELLOW]: 'text-data-yellow-default bg-data-yellow-focus',
      [ColoredValueVariant.PURPLE]: 'text-data-purple-default bg-data-purple-focus',
      [ColoredValueVariant.RED]: 'text-data-red-default bg-data-red-focus',
      [ColoredValueVariant.ORANGE]: 'text-data-orange-default bg-data-orange-focus',
      [ColoredValueVariant.GREY]: 'text-content-dark-3 bg-data-light-grey-hover',
    },
  }

  // Dot background colors
  const dotStyles = {
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
    small: 'px-2 py-0.5 typo-body-sm gap-1',
    large: 'px-3 py-1 typo-body-base-regular gap-1.5',
  }

  return (
    <span
      // `max-w-full` + nhãn `truncate`: chip hẹp hơn nhãn thì cắt CÓ dấu `…`, không đứt giữa
      // chữ. Trước đây chỉ có `whitespace-nowrap` nên ô bảng hẹp cắt ngang thân chữ và người
      // đọc tưởng dữ liệu hỏng ("Chờ người nhận x").
      title={label}
      className={cn(
        'inline-flex max-w-full items-center',
        'rounded-full',
        'break-normal whitespace-nowrap',
        colorStyles[type][variant],
        sizeStyles[size],
        className
      )}
    >
      {showDot && type === 'outlined' && (
        <span className={cn('size-[8px] shrink-0 rounded-full', dotStyles[variant])} />
      )}
      <span className="truncate">{label}</span>
      {onRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="flex cursor-pointer items-center justify-center p-0.5 hover:opacity-75"
        >
          <IconX size={size === 'small' ? 12 : 14} />
        </span>
      )}
    </span>
  )
}

export default Chip
