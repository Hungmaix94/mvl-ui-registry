import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/utils'
import type { TableAction } from '@/types/table'

export type CursorMenuPosition = { x: number; y: number }

export type CursorActionMenuOverlayProps<TRow> = {
  position: CursorMenuPosition | null
  row: TRow | null
  actions: TableAction<TRow>[]
  onClose: () => void
  className?: string
}

/**
 * Renders a backdrop + fixed-position action menu anchored at the user's cursor.
 *
 * Pure presentation. The consumer owns `{position, row}` state and toggles it on
 * row click via `e.clientX/e.clientY`. Closed when either `position` or `row` is
 * `null`, or no action passes its `show(row)` predicate.
 *
 * Use this for hand-rolled tables that don't go through `useTable`/`Table`. For
 * tables that DO use `Table`, set `actionMenuPosition="cursor"` on the config
 * and the menu renders inside the Table component instead.
 *
 * See `_docs/guide/cursor-position-action-menu.md`.
 */
export function CursorActionMenuOverlay<TRow>({
  position,
  row,
  actions,
  onClose,
  className,
}: CursorActionMenuOverlayProps<TRow>) {
  const isOpen = position !== null && row !== null
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedLeft, setAdjustedLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useLayoutEffect(() => {
    if (!position || !menuRef.current) {
      setAdjustedLeft(null)
      return
    }
    const actualWidth = menuRef.current.offsetWidth
    const viewportWidth = window.innerWidth
    let left = position.x

    if (left + actualWidth > viewportWidth - 16) {
      left = left - actualWidth
    }
    // Clamp to screen
    left = Math.max(16, Math.min(left, viewportWidth - actualWidth - 16))

    setAdjustedLeft(left)
  }, [position])

  if (!position || !row) return null

  const visibleActions = actions.filter((a) => (a.show ? a.show(row) : true))
  if (visibleActions.length === 0) return null

  const left = adjustedLeft ?? position.x

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="animate-in fade-in-0 fixed inset-0 z-40 duration-200"
        onClick={onClose}
      />
      <div
        ref={menuRef}
        className={cn(
          'border-border-1 bg-content-light-1 z-50 rounded border p-0 shadow-md',
          'animate-in fade-in-0 zoom-in-90 duration-300 ease-out',
          className ?? 'w-max max-w-[min(28rem,calc(100vw-2rem))] min-w-[13rem]'
        )}
        style={{ position: 'fixed', top: position.y, left }}
        role="menu"
      >
        <div className="space-y-1 p-1">
          {visibleActions.map((action, index) => (
            <button
              type="button"
              key={index}
              role="menuitem"
              onClick={() => {
                action.onClick(row)
                onClose()
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                'hover:bg-data-light-grey-hover',
                action.variant === 'danger'
                  ? 'text-data-red-default hover:text-data-red-hover hover:bg-data-red-disabled'
                  : action.variant === 'success'
                    ? 'text-data-green-default hover:text-data-green-hover hover:bg-data-green-disabled'
                    : 'text-content-dark-1',
                'hover:cursor-pointer',
                'focus:outline-action-outline-default',
                action.className
              )}
            >
              {action.icon && (
                <span className="flex h-4 w-4 items-center justify-center">{action.icon}</span>
              )}
              <span className="whitespace-nowrap">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default CursorActionMenuOverlay
