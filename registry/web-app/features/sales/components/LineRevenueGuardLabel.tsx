import { ReactNode } from 'react'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/utils'

export type LineRevenueGuardLabelProps = {
  children: ReactNode
  countAsLineRevenue?: boolean
  tooltipText?: string
  className?: string
}

export const LineRevenueGuardLabel = ({
  children,
  countAsLineRevenue,
  tooltipText = 'Không tính vào doanh thu KPI của quản lý line',
  className,
}: LineRevenueGuardLabelProps) => {
  if (countAsLineRevenue === false) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'text-content-dark-4 decoration-content-dark-4 [&_a]:!text-content-dark-4 [&_a]:!decoration-content-dark-4 cursor-help line-through',
                className
              )}
            >
              {children}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return <>{children}</>
}
