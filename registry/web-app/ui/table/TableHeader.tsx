import { flexRender, Table } from '@tanstack/react-table'
import { cn } from '@/utils'
import * as TableComponents from '@radix-ui/themes'
import IconUnion from '../../ui/icon/IconUnion.tsx'
import { IconCaretdoubledown, IconCaretdoubleup } from '../../icons'

interface TableHeaderProps<TData> {
  table: Table<TData>
  frozenOffsets: Record<string, number>
  frozenRightOffsets: Record<string, number>
  bordered?: boolean
}

function TableHeader<TData>({
  table,
  frozenOffsets,
  frozenRightOffsets,
  bordered,
}: TableHeaderProps<TData>) {
  const visibleLeafColumns = table.getVisibleLeafColumns()
  const lastLeafColId =
    visibleLeafColumns.length > 0 ? visibleLeafColumns[visibleLeafColumns.length - 1].id : null

  return (
    <TableComponents.Table.Header className="bg-content-light-1 border-border-1 sticky top-0 z-40 border-b">
      {table.getHeaderGroups().map((headerGroup, groupIndex) => {
        const visibleHeaders = headerGroup.headers.filter((header) => {
          if (header.column.columnDef.meta?.hiddenHeader) return false

          const hasRowSpan = typeof header.column.columnDef.meta?.rowSpan === 'number'
          const hasMultipleHeaderRows = table.getHeaderGroups().length > 1

          if (hasRowSpan && hasMultipleHeaderRows) {
            // Check if this is a true leaf column (no sub-columns) — e.g. STT
            const isLeafColumn = header.column.columns.length === 0
            if (isLeafColumn) {
              // Flat leaf with rowSpan: keep only the placeholder at depth 0 spanning down.
              // Hide the real header (it would duplicate at the deepest row).
              return header.isPlaceholder && groupIndex === 0
            } else {
              // Group column with rowSpan (e.g. _tier1 spanning into the leaf row):
              // Show at its natural depth (real header), skip any placeholder rows.
              return !header.isPlaceholder
            }
          }
          return true
        })

        // Skip entirely-empty rows (e.g., leaf row in 3-tier headers where all cells are hiddenHeader)
        if (visibleHeaders.length === 0) return null

        return (
          <TableComponents.Table.Row key={headerGroup.id}>
            {visibleHeaders.map((header) => {
              const isFrozen = header.column.columnDef.meta?.frozen
              const isFrozenRight = header.column.columnDef.meta?.frozenRight
              const isSticky = isFrozen || isFrozenRight
              // Tra offset theo `column.id`, KHÔNG theo `header.id`. Bảng phẳng thì hai giá trị
              // trùng nhau, nhưng khi có group column TanStack đặt id cho header placeholder là
              // `${depth}_${column.id}` (vd `0_stt`) — key đó không có trong `frozenOffsets`
              // (map này key theo column.id, xem `calculateFrozenOffsets`). Offset `undefined`
              // sinh ra `left: "undefinedpx"`, trình duyệt bỏ qua, và ô header mất điểm neo:
              // thân bảng vẫn đứng yên khi kéo ngang còn header thì trôi theo.
              const offset = frozenOffsets[header.column.id]
              const rightOffset = frozenRightOffsets[header.column.id]
              const align = header.column.columnDef.meta?.align || 'left'
              const isRightmost =
                lastLeafColId && header.column.getLeafColumns().some((c) => c.id === lastLeafColId)
              return (
                <TableComponents.Table.ColumnHeaderCell
                  key={header.id}
                  data-column-id={header.column.id}
                  className={cn(
                    'text-content-dark-2 typo-body-base-medium !font-normal !shadow-none',
                    // Remove padding for actions column, keep for others
                    header.column.id === 'actions' ? '' : 'px-3 py-[10px]',
                    'border-border-1 border-b', // Add border-b for nested headers
                    bordered && 'border-r',
                    bordered && isRightmost && 'border-r-0',
                    '!bg-neutral-20',
                    'break-words whitespace-normal', // Add text wrapping for headers
                    header.column.columnDef.meta?.headerClassName,
                    'sticky top-0',
                    isSticky ? 'z-50' : 'z-20',
                    // Add background for frozen columns to prevent content overlap
                    isSticky && 'bg-content-light-1',
                    isFrozenRight && 'shadow-[-2px_0_4px_rgba(0,0,0,0.1)]',
                    align === 'center' && 'text-center',
                    align === 'right' && 'text-right',
                    header.column.getCanSort() &&
                      header.column.columnDef.meta?.sortable === true &&
                      'hover:bg-data-light-grey-hover cursor-pointer transition-colors'
                  )}
                  style={{
                    ...(isFrozen
                      ? {
                          ...(header.column.id === 'actions'
                            ? { right: '0px' }
                            : { left: `${offset}px` }),
                        }
                      : {}),
                    ...(isFrozenRight ? { right: `${rightOffset}px` } : {}),
                    ...(header.getSize() > 0
                      ? {
                          width: `${header.getSize()}px`,
                          minWidth: `${header.getSize()}px`,
                          maxWidth: `${header.getSize()}px`,
                        }
                      : {}),
                  }}
                  colSpan={header.colSpan}
                  rowSpan={
                    typeof header.column.columnDef.meta?.rowSpan === 'number'
                      ? header.column.columnDef.meta.rowSpan
                      : undefined
                  }
                  onClick={
                    header.column.getCanSort() && header.column.columnDef.meta?.sortable === true
                      ? header.column.getToggleSortingHandler()
                      : undefined
                  }
                >
                  <div
                    className={cn(
                      'flex items-center gap-2',
                      'h-full',
                      align === 'center' && 'justify-center',
                      align === 'right' && 'justify-end'
                    )}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}

                    {/* Sort indicator - only show if column is sortable */}
                    {header.column.getCanSort() &&
                      header.column.columnDef.meta?.sortable === true && (
                        <div className="flex flex-col">
                          {header.column.getIsSorted() === 'asc' ? (
                            <IconCaretdoubledown
                              size={12}
                              className="text-action-primary-red-default"
                            />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <IconCaretdoubleup
                              size={12}
                              className="text-action-primary-red-default"
                            />
                          ) : (
                            <div className="flex flex-col">
                              <IconUnion size={12} />
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </TableComponents.Table.ColumnHeaderCell>
              )
            })}
          </TableComponents.Table.Row>
        )
      })}
    </TableComponents.Table.Header>
  )
}

export { TableHeader }
