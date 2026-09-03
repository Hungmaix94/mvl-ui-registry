import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Loading } from '@/components/Loading'
import { cn } from '@/utils'

export type VirtualTreeColumnMeta = {
  width?: string | number
  frozen?: boolean
  align?: 'left' | 'center' | 'right'
  cellClassName?: string
}

export type VirtualTreeColumn<TData> = {
  id: string
  header: ReactNode
  cell: (row: TData) => ReactNode
  meta?: VirtualTreeColumnMeta
}

type WithId = { id: string }

/**
 * Virtualized tree table. The scroll container is pinned to a definite pixel
 * height computed from `window.innerHeight - wrapperTop`, so the virtualizer
 * always sees a real viewport even when an ancestor's flex chain is unbounded.
 */
export type VirtualTreeTableProps<TData extends WithId> = {
  data: TData[]
  columns: VirtualTreeColumn<TData>[]
  rowHeight?: number
  overscan?: number
  isLoading?: boolean
  emptyMessage?: string
  className?: string
  getRowClassName?: (row: TData) => string | undefined
  isRowClickable?: (row: TData) => boolean
  onRowClick?: (row: TData) => void
}

const DEFAULT_COL_WIDTH = 150

function parseWidth(value: string | number | undefined): number {
  if (value == null) return DEFAULT_COL_WIDTH
  if (typeof value === 'number') return value
  const trimmed = value.trim()
  if (trimmed.endsWith('px')) return parseFloat(trimmed) || DEFAULT_COL_WIDTH
  const num = parseFloat(trimmed)
  return Number.isFinite(num) ? num : DEFAULT_COL_WIDTH
}

function alignClass(align: 'left' | 'center' | 'right' | undefined): string {
  if (align === 'center') return 'justify-center text-center'
  if (align === 'right') return 'justify-end text-right'
  return 'justify-start text-left'
}

export function VirtualTreeTable<TData extends WithId>({
  data,
  columns,
  rowHeight = 56,
  overscan = 12,
  isLoading,
  emptyMessage = 'Không có dữ liệu',
  className,
  getRowClassName,
  isRowClickable,
  onRowClick,
}: VirtualTreeTableProps<TData>) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [viewportHeight, setViewportHeight] = useState(0)

  // Measure height as `window.innerHeight - wrapperTop` so we get a definite
  // viewport even when an ancestor's flex chain is unbounded (e.g. AppLayout's
  // outer div is `min-h-screen`, allowing body scroll). Reading wrapper's own
  // `clientHeight` collapses to 0 in that case.
  useLayoutEffect(() => {
    const node = wrapperRef.current
    if (!node) return

    const measure = () => {
      const top = node.getBoundingClientRect().top
      const next = Math.max(0, Math.floor(window.innerHeight - top))
      setViewportHeight((prev) => (prev === next ? prev : next))
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    if (node.parentElement) observer.observe(node.parentElement)

    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const colWidths = useMemo(() => columns.map((c) => parseWidth(c.meta?.width)), [columns])
  const totalWidth = useMemo(() => colWidths.reduce((sum, w) => sum + w, 0), [colWidths])

  // Frozen columns must be contiguous from the left. Compute their cumulative offsets.
  const frozenLeftOffsets = useMemo(() => {
    const lefts = new Array<number | null>(columns.length).fill(null)
    let acc = 0
    for (let i = 0; i < columns.length; i++) {
      if (!columns[i].meta?.frozen) break
      lefts[i] = acc
      acc += colWidths[i]
    }
    return lefts
  }, [columns, colWidths])

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const showLoading = isLoading
  const showEmpty = !isLoading && data.length === 0

  return (
    <div ref={wrapperRef} className={cn('relative min-h-0 flex-1', className)}>
      {showLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ height: viewportHeight }}
        >
          <Loading />
        </div>
      )}
      {showEmpty && (
        <div
          className="text-content-dark-3 absolute inset-0 flex items-center justify-center"
          style={{ height: viewportHeight }}
        >
          {emptyMessage}
        </div>
      )}
      <div
        ref={scrollRef}
        className={cn('overflow-auto', (showLoading || showEmpty) && 'invisible')}
        style={{ height: viewportHeight, width: '100%' }}
      >
        <div className="relative" style={{ width: '100%', minWidth: totalWidth }}>
          {/* Header */}
          <div
            className="bg-background-3 border-border-1 sticky top-0 z-20 flex border-b"
            style={{ height: rowHeight }}
          >
            {columns.map((col, i) => {
              const left = frozenLeftOffsets[i]
              const isFrozen = left != null
              const cellStyle: CSSProperties = {
                width: colWidths[i],
                flex: '0 0 auto',
              }
              if (isFrozen) {
                cellStyle.position = 'sticky'
                cellStyle.left = left
                cellStyle.zIndex = 21
              }
              return (
                <div
                  key={col.id}
                  style={cellStyle}
                  className={cn(
                    'bg-background-3 flex items-center px-3',
                    alignClass(col.meta?.align)
                  )}
                >
                  {col.header}
                </div>
              )
            })}
            {/* Filler stretches the header across leftover space when the viewport is wider than totalWidth. */}
            <div className="bg-background-3 flex-1" />
          </div>

          {/* Body */}
          <div style={{ height: rowVirtualizer.getTotalSize() }} className="relative">
            {virtualRows.map((vRow) => {
              const row = data[vRow.index]
              const rowClass = getRowClassName?.(row)
              const clickable = isRowClickable?.(row) ?? false
              return (
                <div
                  key={row.id}
                  style={{
                    position: 'absolute',
                    top: vRow.start,
                    left: 0,
                    right: 0,
                    height: vRow.size,
                  }}
                  className={cn(
                    'flex',
                    rowClass,
                    clickable && 'cursor-pointer hover:brightness-95'
                  )}
                  onClick={clickable ? () => onRowClick?.(row) : undefined}
                >
                  {columns.map((col, i) => {
                    const left = frozenLeftOffsets[i]
                    const isFrozen = left != null
                    const cellStyle: CSSProperties = {
                      width: colWidths[i],
                      flex: '0 0 auto',
                    }
                    if (isFrozen) {
                      cellStyle.position = 'sticky'
                      cellStyle.left = left
                      cellStyle.zIndex = 1
                    }
                    return (
                      <div
                        key={col.id}
                        style={cellStyle}
                        className={cn(
                          'flex min-w-0 items-center px-3',
                          alignClass(col.meta?.align),
                          rowClass,
                          col.meta?.cellClassName
                        )}
                      >
                        {col.cell(row)}
                      </div>
                    )
                  })}
                  {/* Filler keeps the row visually flush with the header on wide viewports. */}
                  <div className={cn('flex-1', rowClass)} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
