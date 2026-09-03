import { useMemo, useState } from 'react'
import { Popover, PopoverContentPrimitive, PopoverTrigger } from '@/components/ui/popover'
import { IconCaretdown } from '@/assets/icons'
import { cn } from '@/utils'
import type { AccountingPeriod } from '@/features/accounting/accounting-periods/services/accounting-period-service'

type AccountingPeriodSelectProps = {
  periods: AccountingPeriod[]
  selectedPeriodId?: number | null
  onSelect: (periodId: number) => void
}

function label(p?: AccountingPeriod): string {
  if (!p) return '—'
  return `${String(p.month).padStart(2, '0')}/${p.year}`
}

export default function AccountingPeriodSelect({
  periods,
  selectedPeriodId,
  onSelect,
}: AccountingPeriodSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedIndex = useMemo(
    () => periods.findIndex((p) => p.id === selectedPeriodId),
    [periods, selectedPeriodId]
  )
  const selected = selectedIndex >= 0 ? periods[selectedIndex] : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'border-action-primary-red-default text-action-primary-red-default bg-action-primary-red-disabled hover:bg-action-primary-red-default/10',
            'inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded border px-3 text-xs font-medium text-nowrap transition-colors'
          )}
        >
          <span>
            Kỳ: <strong className="font-bold">{label(selected)}</strong>
          </span>
          <IconCaretdown
            size={14}
            className={cn(
              'text-action-primary-red-default transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContentPrimitive
        align="start"
        sideOffset={6}
        className="bg-content-light-1 border-border-1 max-h-72 w-44 overflow-y-auto p-1"
      >
        {periods.length === 0 ? (
          <div className="text-content-dark-3 px-3 py-2 text-sm">Chưa có kỳ nào</div>
        ) : (
          periods.map((p) => {
            const isActive = p.id === selectedPeriodId
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => {
                  onSelect(p.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                  'hover:bg-background-2 hover:cursor-pointer',
                  isActive
                    ? 'bg-action-primary-red-disabled text-action-primary-red-default font-semibold'
                    : 'text-content-dark-1'
                )}
              >
                {label(p)}
              </button>
            )
          })
        )}
      </PopoverContentPrimitive>
    </Popover>
  )
}
