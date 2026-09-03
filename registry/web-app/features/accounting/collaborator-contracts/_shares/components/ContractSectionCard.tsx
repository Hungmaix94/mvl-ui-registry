import { type ReactNode } from 'react'

import { cn } from '@/utils'

export type SectionAccent = 'blue' | 'emerald' | 'amber' | 'violet' | 'slate'

const ACCENT_MAP: Record<SectionAccent, { strip: string; icon: string }> = {
  blue: { strip: 'bg-blue-50/60', icon: 'bg-blue-100 text-blue-600' },
  emerald: { strip: 'bg-emerald-50/60', icon: 'bg-emerald-100 text-emerald-600' },
  amber: { strip: 'bg-amber-50/60', icon: 'bg-amber-100 text-amber-600' },
  violet: { strip: 'bg-violet-50/60', icon: 'bg-violet-100 text-violet-600' },
  slate: { strip: 'bg-slate-50', icon: 'bg-slate-100 text-slate-600' },
}

type ContractSectionCardProps = {
  title: string
  description?: string
  icon?: ReactNode
  accent?: SectionAccent
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/**
 * Card with a coloured header strip used to group collaborator-contract detail
 * and edit sections. Keeps the two screens visually consistent.
 */
const ContractSectionCard = ({
  title,
  description,
  icon,
  accent = 'slate',
  action,
  children,
  className,
  bodyClassName,
}: ContractSectionCardProps) => {
  const a = ACCENT_MAP[accent]
  return (
    <section
      className={cn(
        'border-border-1 overflow-hidden rounded-xl border bg-white shadow-sm',
        className
      )}
    >
      <header
        className={cn(
          'border-border-1 flex items-center justify-between gap-3 border-b px-5 py-3.5',
          a.strip
        )}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', a.icon)}
            >
              {icon}
            </div>
          )}
          <div>
            <h3 className="typo-body-lg-semibold text-content-dark-1">{title}</h3>
            {description && (
              <p className="typo-body-small-regular text-content-dark-3 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={cn('px-5 py-1', bodyClassName)}>{children}</div>
    </section>
  )
}

export default ContractSectionCard
