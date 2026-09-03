import React from 'react'
import { Table, Row } from '@tanstack/react-table'
import { TableRow } from './TableRow'
import { TableAction } from '@/types/table'
import { TableEmpty } from './TableEmpty'
import { TableNoData } from './TableNoData'

interface TableBodyProps<TData> {
  table: Table<TData>
  frozenOffsets: Record<string, number>
  frozenRightOffsets: Record<string, number>
  isLoading?: boolean
  hasFilter?: boolean
  emptyMessage?: string
  loadingRows?: number
  onRowClick?: (row: TData) => void
  onClearFilter?: () => void
  triggerActionMenu?: (rowId: string, position?: { x: number; y: number }) => void
  showActions?: boolean
  rowActions?: TableAction<TData>[]
  getRowClassName?: (row: TData) => string
  bordered?: boolean
  renderRowSubComponent?: (row: Row<TData>) => React.ReactNode
  getCellColSpan?: (row: TData, columnId: string) => number | undefined
}

function TableBody<TData>({
  table,
  frozenOffsets,
  frozenRightOffsets,
  isLoading = false,
  hasFilter = false,
  emptyMessage = 'No data available',
  loadingRows = 5,
  onRowClick,
  onClearFilter,
  triggerActionMenu,
  showActions,
  rowActions,
  getRowClassName,
  bordered,
  renderRowSubComponent,
  getCellColSpan,
}: TableBodyProps<TData>) {
  const rows = table.getRowModel().rows

  // Loading skeleton rows
  if (isLoading) {
    return (
      <tbody>
        {Array.from({ length: loadingRows }).map((_, index) => (
          <tr key={`loading-${index}`}>
            {table.getHeaderGroups()[0]?.headers.map((_, cellIndex) => (
              <td key={cellIndex} className="border-border-1 border-b bg-clip-padding px-4 py-3">
                <div className="bg-neutral-30 h-4 animate-pulse rounded" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    )
  }
  // Empty state - check hasFilter to determine which component to show
  if (rows.length === 0) {
    const columnCount = table.getHeaderGroups()[0]?.headers.length || 1

    return (
      <tbody>
        <tr>
          <td colSpan={columnCount} className="py-8" style={{ border: 'none' }}>
            <div
              style={{
                position: 'sticky',
                left: 0,
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                maxWidth: 'calc(100vw - var(--sidebar-width, 250px) - 3rem)',
              }}
            >
              {hasFilter ? (
                // Show when filters are applied but no results found
                <TableNoData onClearFilter={onClearFilter} />
              ) : (
                // Show when there's no data at all
                <TableEmpty message={emptyMessage} />
              )}
            </div>
          </td>
        </tr>
      </tbody>
    )
  }

  // Data rows
  return (
    <tbody className={'border-none'}>
      {rows.map((row) => (
        <React.Fragment key={row.id}>
          <TableRow
            row={row}
            frozenOffsets={frozenOffsets}
            frozenRightOffsets={frozenRightOffsets}
            onRowClick={onRowClick}
            triggerActionMenu={triggerActionMenu}
            showActions={showActions}
            rowActions={rowActions}
            getRowClassName={getRowClassName}
            bordered={bordered}
            getCellColSpan={getCellColSpan}
          />
          {renderRowSubComponent && row.getIsExpanded() && renderRowSubComponent(row)}
        </React.Fragment>
      ))}
    </tbody>
  )
}

export { TableBody }
