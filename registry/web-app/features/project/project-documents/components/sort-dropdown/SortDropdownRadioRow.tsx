import { cn } from '@/utils'

type RadioRowProps = {
  label: string
  active: boolean
  onClick: () => void
}

export default function SortDropdownRadioRow({ label, active, onClick }: RadioRowProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-2',
        'h-10 px-2 py-1.5',
        'hover:bg-data-light-grey-hover',
        'text-left'
      )}
      onClick={onClick}
    >
      <span
        className={cn(
          'flex size-4 shrink-0 rounded-full border-[1.5px]',
          active
            ? 'border-action-primary-red-default bg-action-primary-red-default'
            : 'border-border-1 bg-data-light-grey-default'
        )}
      >
        {active && (
          <span className="flex size-full items-center justify-center">
            <span className="bg-background-1 size-2 rounded-full" />
          </span>
        )}
      </span>
      <span className="typo-body-sm-medium text-content-dark-1">{label}</span>
    </button>
  )
}
