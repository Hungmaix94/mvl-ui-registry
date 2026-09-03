import { cn } from '@/utils'

type F2VatBadgeProps = {
  includeVat: boolean
  className?: string
}

export function F2VatBadge({ includeVat, className }: F2VatBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap',
        includeVat
          ? 'bg-data-green-disabled text-data-green-default'
          : 'bg-data-yellow-disabled text-data-yellow-default',
        className
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          includeVat ? 'bg-data-green-default' : 'bg-data-yellow-default'
        )}
      />
      {includeVat ? 'Gồm VAT' : 'Không VAT'}
    </span>
  )
}
