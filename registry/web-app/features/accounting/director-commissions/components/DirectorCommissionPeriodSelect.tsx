import { useMemo, useState } from 'react'
import { Popover, PopoverContentPrimitive, PopoverTrigger } from '@/components/ui/popover'
import { IconArrowleft, IconArrowright, IconCaretdown } from '@/assets/icons'
import { cn } from '@/utils'
import type { AccountingPeriod } from '@/features/accounting/accounting-periods/services/accounting-period-service'

type DirectorCommissionPeriodSelectProps = {
  periods: AccountingPeriod[]
  selectedPeriodId?: number | null
  onSelect: (periodId: number) => void
}

function label(p?: AccountingPeriod): string {
  if (!p) return '—'
  return `${String(p.month).padStart(2, '0')}/${p.year}`
}

export default function DirectorCommissionPeriodSelect({
  periods,
  selectedPeriodId,
  onSelect,
}: DirectorCommissionPeriodSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedIndex = useMemo(
    () => periods.findIndex((p) => p.id === selectedPeriodId),
    [periods, selectedPeriodId]
  )
  const selected = selectedIndex >= 0 ? periods[selectedIndex] : undefined
  // periods are sorted newest→oldest: older = next index, newer = previous index.
  const olderPeriod =
    selectedIndex >= 0 && selectedIndex < periods.length - 1
      ? periods[selectedIndex + 1]
      : undefined
  const newerPeriod = selectedIndex > 0 ? periods[selectedIndex - 1] : undefined

  const arrowBtn =
    'border-border-1 hover:bg-background-2 disabled:cursor-not-allowed disabled:opacity-40 flex h-9 w-9 items-center justify-center rounded-md border'

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={arrowBtn}
        disabled={!olderPeriod}
        title={olderPeriod ? `Kỳ trước (${label(olderPeriod)})` : 'Không có kỳ trước'}
        onClick={() => olderPeriod && onSelect(olderPeriod.id)}
      >
        <IconArrowleft size={16} />
      </button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'border-action-primary-red-default text-action-primary-red-default bg-action-primary-red-disabled hover:bg-action-primary-red-default/10',
              'flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors'
            )}
          >
            <span className="font-medium opacity-90">Kỳ tính hoa hồng</span>
            <span className="font-bold">{label(selected)}</span>
            <IconCaretdown size={14} className={cn('transition-transform', open && 'rotate-180')} />
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

      <button
        type="button"
        className={arrowBtn}
        disabled={!newerPeriod}
        title={newerPeriod ? `Kỳ sau (${label(newerPeriod)})` : 'Không có kỳ sau'}
        onClick={() => newerPeriod && onSelect(newerPeriod.id)}
      >
        <IconArrowright size={16} />
      </button>
    </div>
  )
}
