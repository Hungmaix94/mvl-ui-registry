import type { ReactNode } from 'react'
import { cn } from '@/utils'

export type ContextMenuAction = {
  key: string
  label: string
  icon: ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

type ProjectDocumentContextMenuProps = {
  open: boolean
  x: number
  y: number
  actions: ContextMenuAction[]
  onClose: () => void
}

export default function DocumentContentContextMenu({
  open,
  x,
  y,
  actions,
  onClose,
}: ProjectDocumentContextMenuProps) {
  if (!open || actions.length === 0) return null

  return (
    <div
      className="border-border-1 bg-background-1 fixed z-50 w-48 rounded border shadow-md"
      style={{ top: y, left: x }}
    >
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          className={cn(
            'flex w-full items-center gap-2 px-3 py-2 text-left',
            action.variant === 'danger'
              ? 'hover:bg-action-primary-red-activated'
              : 'hover:bg-data-light-grey-hover'
          )}
          onClick={() => {
            onClose()
            action.onClick()
          }}
        >
          <span
            className={cn(
              'flex items-center justify-center',
              action.variant === 'danger'
                ? 'text-action-primary-red-default'
                : 'text-content-dark-1'
            )}
          >
            {action.icon}
          </span>
          <span
            className={cn(
              'typo-body-xs-regular',
              action.variant === 'danger'
                ? 'text-action-primary-red-default'
                : 'text-content-dark-1'
            )}
          >
            {action.label}
          </span>
        </button>
      ))}
    </div>
  )
}
