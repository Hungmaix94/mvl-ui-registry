import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const textVariants = cva('text-base', {
  variants: {
    variant: {
      default: '',
      muted: 'text-muted-foreground',
      danger: 'text-destructive',
      success: 'text-green-600',
      warning: 'text-yellow-600',
    },
    size: {
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'base',
    weight: 'normal',
    align: 'left',
  },
})

export interface TextProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  as?: React.ElementType
}

const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ as: Comp = 'span', className, variant, size, weight, align, ...props }, ref) => {
    return (
      <Comp
        ref={ref}
        className={cn(textVariants({ variant, size, weight, align }), className)}
        {...props}
      />
    )
  }
)
Text.displayName = 'Text'

export { Text, textVariants }
