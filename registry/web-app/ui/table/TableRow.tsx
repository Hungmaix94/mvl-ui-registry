import React, { useRef } from 'react'
import { flexRender, Row } from '@tanstack/react-table'
import { cn } from '@/utils'
import { TableAction, NON_MERGEABLE_COLUMN_IDS } from '@/types/table'

interface TableRowProps<TData> {
  row: Row<TData>
  frozenOffsets: Record<string, number>
  frozenRightOffsets: Record<string, number>
  onRowClick?: (row: TData) => void
  triggerActionMenu?: (rowId: string, position?: { x: number; y: number }) => void
  showActions?: boolean
  rowActions?: TableAction<TData>[]
  getRowClassName?: (row: TData) => string
  bordered?: boolean
  getCellColSpan?: (row: TData, columnId: string) => number | undefined
}

/** Không có gộp ô nào — dùng chung một object để bảng không khai báo `getCellColSpan` khỏi cấp
 *  phát hai mảng mỗi dòng, mỗi lần render. */
const NO_CELL_SPANS = { spans: null, swallowed: null } as const

/**
 * Resolve each cell's colSpan, and which cells a merge swallows.
 *
 * Three clamps keep a merge from breaking the grid: it never runs past the last column, it never
 * starts on or crosses a frozen column — a merged cell carries a single sticky offset, so a
 * swallowed frozen neighbour would lose its own anchoring and drift on horizontal scroll — and
 * it never swallows a control column (`actions`, `expander`), the same list `TableFooter` keeps.
 * `actions` also happens to be frozen, but `expander` is declared per-feature with no `meta`, so
 * checking `frozen` alone would let a full-width merge eat the expand toggle and strand every
 * sub-row behind it.
 */
function resolveCellSpans<TData>(
  cells: ReturnType<Row<TData>['getVisibleCells']>,
  original: TData,
  getCellColSpan?: (row: TData, columnId: string) => number | undefined
) {
  if (!getCellColSpan) return NO_CELL_SPANS

  const spans = cells.map(() => 1)
  const swallowed = cells.map(() => false)

  const isBlocked = (index: number) => {
    const column = cells[index]?.column
    if (!column) return true
    const meta = column.columnDef.meta
    return (
      Boolean(meta?.frozen || meta?.frozenRight) || NON_MERGEABLE_COLUMN_IDS.includes(column.id)
    )
  }

  cells.forEach((cell, index) => {
    if (swallowed[index] || isBlocked(index)) return
    // `Math.floor`: một `requested` lẻ như 2.5 mà để nguyên thì vòng lặp dưới chạy tới 3 — gộp
    // dư đúng một cột so với thứ người gọi yêu cầu.
    const raw = getCellColSpan(original, cell.column.id) ?? 1
    const requested = Number.isFinite(raw) ? Math.floor(raw) : raw
    if (!(requested > 1)) return

    let span = 1
    while (span < requested && index + span < cells.length && !isBlocked(index + span)) {
      span += 1
    }
    if (span <= 1) return

    spans[index] = span
    for (let offset = 1; offset < span; offset += 1) swallowed[index + offset] = true
  })

  return { spans, swallowed }
}

function TableRowComponent<TData>({
  row,
  frozenOffsets,
  frozenRightOffsets,
  onRowClick,
  triggerActionMenu,
  showActions,
  rowActions,
  bordered,
  getRowClassName,
  getCellColSpan,
}: TableRowProps<TData>) {
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
    const td = (event.target as HTMLElement).closest('td')
    if (td?.dataset.columnId === 'select') return

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      return
    }

    const x = event.clientX
    const y = event.clientY

    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null

      if (showActions && rowActions && rowActions.length > 0) {
        const visibleActions = rowActions.filter((action) =>
          action.show ? action.show(row.original) : true
        )
        if (visibleActions.length > 0 && triggerActionMenu) {
          triggerActionMenu(row.id, { x, y })
          return
        }
      }

      if (onRowClick) {
        onRowClick(row.original)
      }
    }, 300)
  }

  const handleDoubleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
  }

  const visibleCells = row.getVisibleCells()
  const { spans, swallowed } = resolveCellSpans(visibleCells, row.original, getCellColSpan)

  // Check if row has visible actions
  const hasVisibleActions =
    showActions &&
    rowActions &&
    rowActions.length > 0 &&
    rowActions.some((action) => (action.show ? action.show(row.original) : true))

  return (
    <tr
      className={cn(
        'transition-colors',
        'group hover:bg-data-light-grey-hover',
        (onRowClick || hasVisibleActions) && 'cursor-pointer',
        getRowClassName && getRowClassName(row.original)
      )}
      onClick={handleRowClick}
      onDoubleClick={handleDoubleClick}
    >
      {visibleCells.map((cell, index) => {
        if (swallowed?.[index]) return null

        const colSpan = spans?.[index] ?? 1
        const isFrozen = cell.column.columnDef.meta?.frozen
        const isFrozenRight = cell.column.columnDef.meta?.frozenRight
        const isSticky = isFrozen || isFrozenRight
        const offset = frozenOffsets[cell.column.id]
        const rightOffset = frozenRightOffsets[cell.column.id]
        const align = cell.column.columnDef.meta?.align || 'left'
        const rowClassName = getRowClassName ? getRowClassName(row.original) : ''
        // A merged cell has to be as wide as everything it swallowed, or `table-layout: fixed`
        // pins it to the first column's width and the whole grid shifts.
        //
        // Đường tắt `colSpan === 1` là đường đi của MỌI ô trên mọi bảng không dùng gộp ô: không
        // có nó thì một trang 100 dòng × 25 cột cấp phát 2.500 mảng một-phần-tử mỗi lần render
        // chỉ để cộng đúng một số hạng.
        const width =
          colSpan === 1
            ? cell.column.getSize()
            : visibleCells
                .slice(index, index + colSpan)
                .reduce((total, spanned) => total + spanned.column.getSize(), 0)

        return (
          <td
            key={cell.id}
            colSpan={colSpan > 1 ? colSpan : undefined}
            data-column-id={cell.column.id}
            className={cn(
              'border-border-1 border-b',
              bordered && 'border-r last:border-r-0',
              'bg-clip-padding',
              'bg-clip-padding',
              cell.column.id === 'actions' ? '' : 'px-3 py-[10px]',
              'break-words whitespace-normal', // Add text wrapping
              cell.column.columnDef.meta?.cellClassName,
              isSticky && 'sticky z-20',
              isFrozen && 'shadow-[2px_0_4px_rgba(0,0,0,0.1)]',
              isFrozenRight && 'shadow-[-2px_0_4px_rgba(0,0,0,0.1)]',
              isSticky && !rowClassName && 'bg-background-1',
              isSticky && rowClassName,
              isSticky && 'group-hover:bg-data-light-grey-hover transition-colors',
              align === 'center' && 'text-center',
              align === 'right' && 'text-right'
            )}
            style={{
              ...(isFrozen
                ? {
                    ...(cell.column.id === 'actions' ? { right: '0px' } : { left: `${offset}px` }),
                  }
                : {}),
              ...(isFrozenRight ? { right: `${rightOffset}px` } : {}),
              ...(width > 0
                ? {
                    width: `${width}px`,
                    minWidth: `${width}px`,
                    maxWidth: `${width}px`,
                  }
                : {}),
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        )
      })}
    </tr>
  )
}

// Memoized version for performance optimization
export const TableRow = React.memo(TableRowComponent) as typeof TableRowComponent
