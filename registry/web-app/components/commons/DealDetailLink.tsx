import { type ReactNode } from 'react'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { cn } from '@/utils'

type DealDetailLinkProps = {
  /** Deal id. When missing, children render as plain text (no link). */
  dealId?: number | null
  children: ReactNode
  className?: string
  title?: string
}

/**
 * Renders a deal code as a link that opens the deal (Giao dịch) detail page in a new
 * browser tab. Falls back to plain text when the viewer lacks the `deal.retrieve`
 * permission or no id is available. Stops click propagation so it can sit inside
 * clickable table rows without triggering row-level navigation.
 */
const DealDetailLink = ({ dealId, children, className, title }: DealDetailLinkProps) => {
  const ability = useAbility()
  const canViewDeal = ability.can('retrieve', 'deal')

  if (!dealId || !canViewDeal) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    )
  }

  const href = APP_PATH.DEAL_DETAIL.replace(':id', String(dealId))

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'text-action-primary-red-default hover:underline focus-visible:underline',
        className
      )}
    >
      {children}
    </a>
  )
}

export default DealDetailLink
