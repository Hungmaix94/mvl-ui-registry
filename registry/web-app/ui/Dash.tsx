import { cn } from '../lib/utils'

export function Dash({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="dash"
      className={cn('text-gray-300', className)}
      {...props}
    >
      —
    </span>
  )
}
