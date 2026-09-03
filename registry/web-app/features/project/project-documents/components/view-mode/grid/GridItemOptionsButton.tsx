import { IconDotsthreeoutline } from '@/assets/icons'
import { cn } from '@/utils'

type GridItemOptionsButtonProps = {
  onOpenOptionsMenu: (event: React.MouseEvent) => void
}

export default function GridItemOptionsButton({ onOpenOptionsMenu }: GridItemOptionsButtonProps) {
  return (
    <button
      type="button"
      title="Mở menu thao tác"
      className={cn(
        'absolute top-1 right-1',
        'rounded',
        'p-1',
        'transition-all duration-150 ease-out',
        'pointer-events-none opacity-0',
        'group-hover:pointer-events-auto group-hover:opacity-100',
        'focus-visible:outline-action-outline-default focus-visible:pointer-events-auto focus-visible:opacity-100',
        'text-content-dark-3 hover:text-content-dark-1'
      )}
      onClick={(e) => {
        e.stopPropagation()
        onOpenOptionsMenu(e)
      }}
    >
      <IconDotsthreeoutline size={14} />
    </button>
  )
}
