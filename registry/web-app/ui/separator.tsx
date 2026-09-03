import * as React from 'react'

import { cn } from '../lib/utils'

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <div
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        'border-border-1 shrink-0',
        orientation === 'horizontal' ? 'w-full border-b' : 'h-full border-r',
        className
      )}
      {...props}
    />
  )
}

export { Separator }
