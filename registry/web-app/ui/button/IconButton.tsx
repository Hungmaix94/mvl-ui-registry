import React from 'react'
import Button, { ButtonProps } from './Button'

export interface IconButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: ButtonProps['variant'] | 'ghost'
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'text', ...props }, ref) => {
    // Map 'ghost' to 'text' variant since Button doesn't support ghost
    const buttonVariant = variant === 'ghost' ? 'text' : variant

    return <Button ref={ref} variant={buttonVariant} iconOnly {...props} />
  }
)

IconButton.displayName = 'IconButton'

export default IconButton
