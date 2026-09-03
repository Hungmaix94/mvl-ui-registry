import { ReactNode } from 'react'
import { Flex } from '@radix-ui/themes'
import { cn } from '@/lib/utils.ts'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

type DashboardSummaryCardProps = {
  title: string
  tooltip: string
  value: string | number
  unit: string
  icon: ReactNode
  onClick?: () => void
}

function DashboardSummaryCard({
  title,
  tooltip,
  value,
  unit,
  icon,
  onClick,
}: DashboardSummaryCardProps) {
  const cardContent = (
    <Flex
      className={cn(
        'bg-background-3',
        'min-h-[140px]',
        onClick && 'cursor-pointer',
        'rounded p-5',
        'gap-[10px]'
      )}
      onClick={onClick}
    >
      <Flex flexGrow={'1'} direction={'column'} justify={'between'}>
        <p className="typo-body-base-semibold text-content-dark-1">{title}</p>

        <div className="flex items-end gap-1">
          <p className="text-3xl font-medium text-blue-600">{value}</p>
          <p className="text-content-dark-3 h-fit text-sm font-semibold">{unit}</p>
        </div>
      </Flex>

      <Flex
        justify={'center'}
        align={'center'}
        className={cn('text-action-primary-red-default', 'size-8')}
      >
        {icon}
      </Flex>
    </Flex>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent side="top" align="center" className="max-w-[300px]">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return cardContent
}

export default DashboardSummaryCard
