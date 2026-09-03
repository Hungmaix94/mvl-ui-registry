import React from 'react'
import { cn } from '@/lib/utils'

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  cols?: number | string
  rows?: number | string
  gap?: number | string
  gapX?: number | string
  gapY?: number | string
  className?: string
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ children, cols, rows, gap, gapX, gapY, className, ...props }, ref) => {
    const gridStyles = cn(
      'grid',
      cols && `grid-cols-${cols}`,
      rows && `grid-rows-${rows}`,
      gap && `gap-${gap}`,
      gapX && `gap-x-${gapX}`,
      gapY && `gap-y-${gapY}`,
      className
    )

    return (
      <div ref={ref} className={gridStyles} {...props}>
        {children}
      </div>
    )
  }
)

Grid.displayName = 'Grid'

export default Grid
