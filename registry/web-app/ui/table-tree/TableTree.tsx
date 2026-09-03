import React from 'react'
import * as TableComponents from '@radix-ui/themes'
import { cn } from '@/utils'
import { useTableTree } from '../../hooks/useTableTree'

export type TreeColumnMeta = {
  headerClassName?: string
  cellClassName?: string
  frozen?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  headerStyle?: React.CSSProperties // Inline styles for header
  cellStyle?: React.CSSProperties | ((row: any) => React.CSSProperties) // Inline styles for cells (can be a function)
  /** When set to 'fit-content', frozen cell with colspan uses fit-content width instead of column size. */
  colspanWidth?: 'fit-content'
}

export type TreeColumn<TData> = {
  id: string
  header: React.ReactNode
  cell?: (row: TData) => React.ReactNode
  meta?: TreeColumnMeta
}

export type GroupedHeader = {
  id: string
  title: React.ReactNode
  children?: GroupedHeader[]
  colSpan?: number
  rowSpan?: number
  hasChildren?: boolean
  align?: 'left' | 'center' | 'right'
  headerClassName?: string // Custom className for this header cell
  headerStyle?: React.CSSProperties // Inline styles for header
}

export type TableTreeConfig<TData> = {
  data: TData[]
  columns: TreeColumn<TData>[]
  groupedHeaders?: GroupedHeader[]
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>
  className?: string
  density?: 'compact' | 'comfortable' | 'spacious'
  emptyMessage?: string
  isLoading?: boolean
  enableColspanMerging?: boolean // Enable special colspan merging for level 1 rows (default: true for backward compatibility)
  customLevel1RowClassName?: string // Custom className for level 1 rows (optional, default applies background and red text)
  customLevel2RowClassName?: string // Custom className for level 2 rows
  /** Return colSpan for this cell; cells covered by a previous colspan are skipped. */
  getCellColSpan?: (row: TData, colIdx: number) => number | undefined
  /** Return rowSpan for this cell; cells covered by a previous rowSpan are skipped. */
  getCellRowSpan?: (row: TData, colIdx: number) => number | undefined
  /** Custom row className (overrides level-based className when provided). */
  getRowClassName?: (row: TData) => string | undefined
  /** Optional row click handler. */
  onRowClick?: (row: TData) => void
  /** Optional per-row clickable state for cursor/interaction style. */
  isRowClickable?: (row: TData) => boolean
}

export function TableTree<TData>(config: TableTreeConfig<TData>) {
  const {
    data,
    columns,
    groupedHeaders,
    scrollContainerRef,
    className,
    density = 'comfortable',
    emptyMessage = 'No data available',
    isLoading = false,
    enableColspanMerging = true,
    customLevel1RowClassName,
    customLevel2RowClassName,
    getCellColSpan,
    getCellRowSpan,
    getRowClassName,
    onRowClick,
    isRowClickable,
  } = config

  const { frozenOffsets, columnSizes } = useTableTree(columns)
  const hasFrozenColumns = columns.some((col) => col.meta?.frozen)

  const totalColumnsMinWidth = React.useMemo(() => {
    const sum = Object.values(columnSizes).reduce((a, b) => a + b, 0)
    return sum > 0 ? sum : undefined
  }, [columnSizes])

  const densityClasses = {
    compact: 'text-xs',
    comfortable: 'text-sm',
    spacious: 'text-base',
  }

  // Helper function to get max depth of a tree
  const getMaxDepth = (node: GroupedHeader): number => {
    if (!node.children || node.children.length === 0) return 1
    return 1 + Math.max(...node.children.map(getMaxDepth))
  }

  // Helper function to collect all cells at a specific level
  const collectCellsAtLevel = (node: GroupedHeader, targetLevel: number): GroupedHeader[] => {
    // For level 1, return direct children
    if (targetLevel === 1 && node.children) {
      return node.children
    }
    // For deeper levels, recursively collect from children
    if (node.children && targetLevel > 1) {
      const result: GroupedHeader[] = []
      node.children.forEach((child) => {
        result.push(...collectCellsAtLevel(child, targetLevel - 1))
      })
      return result
    }
    return []
  }

  // Helper function to collect all child column IDs from grouped headers
  const collectChildColumnIds = (headers: GroupedHeader[]): Set<string> => {
    const childIds = new Set<string>()
    const traverse = (nodes: GroupedHeader[]) => {
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          node.children.forEach((child) => {
            childIds.add(child.id)
            traverse(node.children || [])
          })
        }
      })
    }
    traverse(headers)
    return childIds
  }

  // Collect child column IDs if grouped headers exist
  const childColumnIds = groupedHeaders ? collectChildColumnIds(groupedHeaders) : new Set<string>()

  // Precompute rowSpan matrix: for each (rowIdx, colIdx) whether cell is covered or has rowSpan
  const cellRowSpanMatrix = React.useMemo(() => {
    if (!getCellRowSpan || data.length === 0 || columns.length === 0) return null
    const matrix: Array<Array<{ rowSpan: number; isCovered: boolean }>> = []
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      matrix[rowIdx] = []
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        matrix[rowIdx][colIdx] = { rowSpan: 1, isCovered: false }
      }
    }
    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      let rowIdx = 0
      while (rowIdx < data.length) {
        const n = getCellRowSpan(data[rowIdx], colIdx)
        if (typeof n === 'number' && n >= 1) {
          const span = Math.min(n, data.length - rowIdx)
          matrix[rowIdx][colIdx] = { rowSpan: span, isCovered: false }
          for (let k = 1; k < span; k++) {
            matrix[rowIdx + k][colIdx] = { rowSpan: 1, isCovered: true }
          }
          rowIdx += span
        } else {
          matrix[rowIdx][colIdx] = { rowSpan: 1, isCovered: false }
          rowIdx++
        }
      }
    }
    return matrix
  }, [data, columns.length, getCellRowSpan])

  const renderHeaderRows = () => {
    // If groupedHeaders provided, render multiple header rows
    if (groupedHeaders && groupedHeaders.length > 0) {
      // Build rows by BFS levels
      const rows: GroupedHeader[][] = []
      const dfs = (nodes: GroupedHeader[], level: number): number => {
        rows[level] = rows[level] || []
        let span = 0
        nodes.forEach((n) => {
          if (n.children && n.children.length > 0) {
            const childSpan = dfs(n.children, level + 1)
            rows[level].push({ ...n, colSpan: childSpan, hasChildren: true })
            span += childSpan
          } else {
            rows[level].push({ ...n, colSpan: 1, hasChildren: false })
            span += 1
          }
        })
        return span
      }
      dfs(groupedHeaders, 0)

      // Calculate rowSpan for cells without children
      const maxDepth = rows.length
      rows.forEach((row) => {
        row.forEach((cell) => {
          if (!cell.hasChildren) {
            cell.rowSpan = maxDepth
          }
        })
      })

      // If we have more than 1 row, build sub-rows for nodes with children only
      if (rows.length > 1) {
        // For each level after 0, add cells only for nodes with children
        for (let level = 1; level < rows.length; level++) {
          const newRow: GroupedHeader[] = []

          groupedHeaders.forEach((node) => {
            if (node.children && node.children.length > 0) {
              // Node has children, add children cells for this level
              const childCells = collectCellsAtLevel(node, level)
              newRow.push(...childCells)
            }
            // Nodes without children are handled by rowSpan in row[0]
          })

          rows[level] = newRow
        }
      }

      return rows.map((row, idx) => (
        <TableComponents.Table.Row
          key={`gh-${idx}`}
          className={idx < rows.length - 1 ? 'border-border-1 border-b' : ''}
        >
          {row.map((cell, cellIdx) => {
            // Find matching column to get meta properties
            const column = columns.find((col) => col.id === cell.id)
            const isFrozen = column?.meta?.frozen
            const offset = frozenOffsets[cell.id]
            // Use align from GroupedHeader if specified, otherwise fallback to column meta
            const align = cell.align || column?.meta?.align || 'left'
            // For cells with colSpan > 1 (grouped headers), calculate total width from children
            let size = columnSizes[cell.id]
            if (!size && cell.colSpan && cell.colSpan > 1) {
              // Calculate total width from children in next row
              if (rows.length > idx + 1) {
                const nextRow = rows[idx + 1]
                // Get the next N cells where N = colSpan
                let startIdx = 0
                for (let i = 0; i < cellIdx; i++) {
                  startIdx += rows[idx][i].colSpan || 1
                }
                const childSize = nextRow
                  .slice(startIdx, startIdx + cell.colSpan)
                  .reduce((sum, c) => sum + (columnSizes[c.id] || 0), 0)
                if (childSize > 0) size = childSize
              }
            }

            // Determine if we should show border-right
            let shouldShowBorder = false
            if (idx === 0) {
              // Row 0: always show border for all cells
              shouldShowBorder = true
            } else {
              // Row > 0: sub-columns - only show border if next cell is from different parent
              const nextCell = row[cellIdx + 1]
              // If there's no next cell, show border
              if (!nextCell) {
                shouldShowBorder = true
              } else {
                // Check if current and next cells are from different parent groups
                // Both should be sub-columns (child cells)
                const currentIsSubColumn = childColumnIds.has(cell.id)
                const nextIsSubColumn = childColumnIds.has(nextCell.id)
                // If next is not a sub-column, show border
                shouldShowBorder = !nextIsSubColumn
                // If both are sub-columns, check if from different parent
                if (currentIsSubColumn && nextIsSubColumn) {
                  const currentPrefix = cell.id.match(/^(m\d+)/)?.[1]
                  const nextPrefix = nextCell.id.match(/^(m\d+)/)?.[1]
                  shouldShowBorder = currentPrefix !== nextPrefix
                }
              }
            }

            return (
              <TableComponents.Table.ColumnHeaderCell
                key={cell.id}
                colSpan={cell.colSpan}
                rowSpan={cell.rowSpan}
                className={cn(
                  'text-content-dark-2 px-4 py-3 !shadow-none',
                  // Don't apply default background if this is a custom styled header
                  !cell.headerClassName && !cell.headerStyle && 'border-border-1 !bg-neutral-20',
                  shouldShowBorder &&
                    'before:bg-border-1 before:absolute before:top-0 before:right-0 before:bottom-0 before:z-10 before:w-[1px]',
                  // First row (idx === 0) and cell has children -> bold
                  idx === 0 && cell.hasChildren
                    ? 'typo-body-base-semibold'
                    : !cell.headerStyle && 'typo-body-base-medium !font-normal',
                  // If cell has rowSpan, center vertically
                  cell.rowSpan && cell.rowSpan > 1 ? '!align-middle' : '',
                  // Frozen column styling
                  isFrozen && 'bg-content-light-1 sticky z-20',
                  align === 'center' && 'text-center',
                  align === 'right' && 'text-right',
                  // Apply custom header className
                  cell.headerClassName
                )}
                style={{
                  ...(isFrozen ? { position: 'sticky' as const, left: `${offset}px` } : {}),
                  ...(shouldShowBorder && !isFrozen ? { position: 'relative' } : {}),
                  ...(size
                    ? {
                        width: `${size}px`,
                        minWidth: `${size}px`,
                        maxWidth: `${size}px`,
                        boxSizing: 'border-box',
                      }
                    : {}),
                  // Apply custom header style if provided
                  ...(cell.headerStyle || {}),
                }}
              >
                {cell.title}
              </TableComponents.Table.ColumnHeaderCell>
            )
          })}
        </TableComponents.Table.Row>
      ))
    }

    // Fallback single row from columns
    return (
      <TableComponents.Table.Row>
        {columns.map((col, colIdx) => {
          const isFrozen = col.meta?.frozen
          const offset = frozenOffsets[col.id]
          const align = col.meta?.align || 'left'
          const size = columnSizes[col.id]
          // Show border if current is frozen and next is not frozen
          const nextCol = columns[colIdx + 1]
          const shouldShowBorder = isFrozen && nextCol && !nextCol.meta?.frozen
          return (
            <TableComponents.Table.ColumnHeaderCell
              key={col.id}
              className={cn(
                'text-content-dark-2 typo-body-base-medium px-4 py-3 !font-normal !shadow-none',
                'border-border-1 !bg-neutral-20 last:border-r-0',
                shouldShowBorder &&
                  'before:bg-border-1 before:absolute before:top-0 before:right-0 before:bottom-0 before:z-10 before:w-[1px]',
                col.meta?.headerClassName,
                isFrozen && 'bg-content-light-1 sticky z-20',
                align === 'center' && 'text-center',
                align === 'right' && 'text-right',
                '!align-middle'
              )}
              style={{
                ...(isFrozen ? { position: 'sticky' as const, left: `${offset}px` } : {}),
                ...(size
                  ? {
                      width: `${size}px`,
                      minWidth: `${size}px`,
                      maxWidth: `${size}px`,
                      boxSizing: 'border-box',
                    }
                  : {}),
              }}
            >
              {col.header}
            </TableComponents.Table.ColumnHeaderCell>
          )
        })}
      </TableComponents.Table.Row>
    )
  }

  return (
    <div className={cn('min-w-0 flex-1 space-y-4 px-10 pb-6', className)}>
      <div
        ref={scrollContainerRef}
        data-table-tree-scroll={hasFrozenColumns ? 'frozen' : undefined}
        className={cn(
          'relative',
          'border-border-1 bg-content-light-1 relative overflow-x-scroll border',
          scrollContainerRef && 'scrollbar-hide'
        )}
      >
        <TableComponents.Table.Root
          layout={'auto'}
          className={cn(
            'w-full border-collapse [&_td]:box-border [&_th]:box-border',
            densityClasses[density],
            // Radix Table.Root wraps content in ScrollArea - disable its scroll so our outer div is the scroll container for sticky columns
            hasFrozenColumns &&
              '[&_.rt-ScrollAreaViewport]:!overflow-visible [&_.rt-TableRootTable]:!overflow-visible [&_table]:!overflow-visible'
          )}
          style={totalColumnsMinWidth ? { minWidth: `${totalColumnsMinWidth}px` } : undefined}
        >
          <TableComponents.Table.Header className="bg-content-light-1 border-border-1 sticky top-0 z-30 border-b">
            {renderHeaderRows()}
          </TableComponents.Table.Header>

          {/* Body */}
          <TableComponents.Table.Body>
            {isLoading && (
              <TableComponents.Table.Row>
                <TableComponents.Table.Cell className="px-4 py-3" colSpan={columns.length}>
                  Loading...
                </TableComponents.Table.Cell>
              </TableComponents.Table.Row>
            )}

            {!isLoading && data.length === 0 && (
              <TableComponents.Table.Row>
                <TableComponents.Table.Cell
                  className="text-content-dark-3 px-4 py-8 text-center"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </TableComponents.Table.Cell>
              </TableComponents.Table.Row>
            )}

            {!isLoading &&
              data.map((row: any, rowIdx) => {
                const defaultRowClassName = cn(
                  row.level === 1 &&
                    (customLevel1RowClassName ||
                      'bg-background-6 text-action-primary-red-default typo-body-base-semibold'),
                  row.level === 2 && customLevel2RowClassName,
                  (row as any).isSummary &&
                    'bg-background-6 text-action-primary-red-default typo-body-base-semibold'
                )
                const rowClassName =
                  getRowClassName != null
                    ? (getRowClassName(row) ?? defaultRowClassName)
                    : defaultRowClassName
                const rowBgFromClass =
                  getRowClassName != null && rowClassName
                    ? rowClassName.match(/\bbg-[a-zA-Z0-9-]+\b/)?.[0]
                    : undefined
                const rowHasBottomBorder = rowClassName?.includes('border-b') ?? false
                const clickable = isRowClickable?.(row) ?? onRowClick != null
                return (
                  <TableComponents.Table.Row
                    key={row.id ?? rowIdx}
                    className={cn(rowClassName, clickable && 'cursor-pointer')}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns
                      .map((col, colIdx) => {
                        const isFrozen = col.meta?.frozen
                        const offset = frozenOffsets[col.id]
                        const align = col.meta?.align || 'left'
                        const size = columnSizes[col.id]

                        const customColSpan = getCellColSpan?.(row, colIdx)
                        const isCoveredByPrevColSpan =
                          getCellColSpan &&
                          columns.some(
                            (_, i) =>
                              i < colIdx &&
                              (() => {
                                const s = getCellColSpan(row, i)
                                return s !== undefined && i + s > colIdx
                              })()
                          )
                        if (isCoveredByPrevColSpan) return null

                        const rowSpanInfo = cellRowSpanMatrix?.[rowIdx]?.[colIdx]
                        if (rowSpanInfo?.isCovered) return null
                        const cellRowSpan =
                          rowSpanInfo?.rowSpan && rowSpanInfo.rowSpan > 1
                            ? rowSpanInfo.rowSpan
                            : undefined

                        // Check if this is a sub-column using collected child IDs
                        const isSubColumn = childColumnIds.has(col.id)

                        // Determine border logic - only apply if there are sub-columns
                        let shouldShowBorder = false
                        if (childColumnIds.size > 0) {
                          // Only calculate border logic if we have sub-columns
                          if (!isSubColumn) {
                            // Not a sub-column, always show border
                            shouldShowBorder = true
                          } else {
                            // Sub-column: check if next column is from different parent
                            const nextCol = columns[colIdx + 1]
                            if (!nextCol) {
                              // Last column, show border
                              shouldShowBorder = true
                            } else {
                              // Check if next column is also a sub-column
                              const nextIsSubColumn = childColumnIds.has(nextCol.id)
                              // Show border if next column is not a sub-column or from different parent
                              shouldShowBorder = !nextIsSubColumn
                              // If both are sub-columns, need to check if they're from same parent
                              if (nextIsSubColumn) {
                                // Extract parent prefix (e.g., 'm0' from 'm0_total')
                                const currentPrefix = col.id.match(/^(m\d+)/)?.[1]
                                const nextPrefix = nextCol.id.match(/^(m\d+)/)?.[1]
                                shouldShowBorder = currentPrefix !== nextPrefix
                              }
                            }
                          }
                        } else {
                          // No grouped headers: show border if current is frozen and next is not frozen
                          // BUT skip this logic for level 1 rows when enableColspanMerging is true and colIdx is 1 or 2
                          // (those columns are handled by the colspan merging logic below)
                          const isColspanMergingCase =
                            enableColspanMerging &&
                            row.level === 1 &&
                            (colIdx === 1 || colIdx === 2)
                          if (!isColspanMergingCase) {
                            const nextCol = columns[colIdx + 1]
                            if (isFrozen && nextCol && !nextCol.meta?.frozen) {
                              shouldShowBorder = true
                            }
                          }
                        }

                        // For level 1 rows, handle colspan for merging columns 1 and 2 (employeeCode and employeeName)
                        // Only enabled if enableColspanMerging is true (and no custom colSpan for this cell)
                        let colSpanValue: number | undefined = customColSpan
                        let shouldShowFrozenBorder = false
                        if (
                          colSpanValue === undefined &&
                          enableColspanMerging &&
                          row.level === 1 &&
                          colIdx === 1
                        ) {
                          colSpanValue = 2
                          // Don't show border for the colspan cell itself in level 1 rows
                          // The cell spans employeeCode and employeeName, so it should NOT have a border
                          shouldShowFrozenBorder = false
                        }
                        // Skip third cell in level 1 rows when second cell spans 2 columns
                        if (
                          colSpanValue === undefined &&
                          enableColspanMerging &&
                          row.level === 1 &&
                          colIdx === 2
                        ) {
                          return null
                        }
                        // For level 2 rows, show border after employeeName (colIdx 2)
                        if (enableColspanMerging && row.level === 2 && colIdx === 2) {
                          shouldShowFrozenBorder = true
                        }

                        // Determine if we should show border: use shouldShowBorder only when there's no colSpan,
                        // otherwise use shouldShowFrozenBorder for merged cells
                        const shouldApplyBorder = colSpanValue
                          ? shouldShowFrozenBorder
                          : shouldShowBorder || shouldShowFrozenBorder

                        const cellBgClass =
                          rowBgFromClass ||
                          (isFrozen &&
                            ((row as any).isSummary
                              ? 'bg-background-6'
                              : row.level === 1
                                ? customLevel1RowClassName === undefined ||
                                  customLevel1RowClassName?.includes('bg-background-6')
                                  ? 'bg-background-6'
                                  : 'bg-background-1'
                                : row.level === 2
                                  ? (() => {
                                      if (customLevel2RowClassName) {
                                        const bgMatch =
                                          customLevel2RowClassName.match(/bg-[a-zA-Z0-9-]+/)
                                        if (bgMatch) return bgMatch[0]
                                      }
                                      return 'bg-background-2'
                                    })()
                                  : 'bg-background-1'))
                        const frozenBgStyle =
                          isFrozen && cellBgClass
                            ? {
                                backgroundColor: `var(--color-${cellBgClass.replace(/^bg-/, '')})`,
                              }
                            : {}

                        // Sticky does not work reliably on <td> with colspan; use a sticky wrapper div instead
                        const isFrozenWithColspan = isFrozen && (colSpanValue ?? 0) > 1

                        const cellContent = col.cell ? col.cell(row) : (row as any)[col.id]
                        const innerContent = isFrozenWithColspan ? (
                          <div
                            className={cn(
                              'sticky box-border px-4 py-3',
                              col.id === 'name' && 'truncate',
                              cellBgClass && `!${cellBgClass}`,
                              (row.level === 1 || (row as any).isSummary) &&
                                !customLevel1RowClassName &&
                                'text-action-primary-red-default',
                              row.level === 2 &&
                                col.id === 'employeeCode' &&
                                'typo-body-base-semibold',
                              align === 'center' && 'text-center',
                              align === 'right' && 'text-right',
                              (shouldApplyBorder || shouldShowFrozenBorder) &&
                                'before:bg-border-1 before:absolute before:top-0 before:right-0 before:bottom-0 before:z-10 before:w-[1px]'
                            )}
                            style={{
                              left: `${offset}px`,
                              zIndex: 20,
                              ...(col.meta?.colspanWidth === 'fit-content'
                                ? {
                                    width: 'fit-content' as const,
                                    minWidth: 'min-content' as const,
                                  }
                                : {
                                    minWidth: size ? `${size}px` : undefined,
                                    width: size ? `${size}px` : undefined,
                                  }),
                              boxSizing: 'border-box',
                              ...frozenBgStyle,
                            }}
                          >
                            {cellContent}
                          </div>
                        ) : (
                          cellContent
                        )

                        return (
                          <TableComponents.Table.Cell
                            key={`${rowIdx}-${col.id}`}
                            colSpan={colSpanValue}
                            rowSpan={cellRowSpan}
                            className={cn(
                              col.id === 'name' && !isFrozenWithColspan && 'truncate',
                              cellRowSpan && cellRowSpan > 1 && 'align-middle',
                              // Vertical align for rowSpan cells can be set via column meta.cellStyle
                              // Only apply sticky to td when no colspan (sticky on td doesn't work with colspan)
                              isFrozen && !isFrozenWithColspan && 'sticky !z-20',
                              cellBgClass && !isFrozenWithColspan && `!${cellBgClass}`,
                              // For non-frozen cells, only apply background for summary rows (when not using getRowClassName bg)
                              !cellBgClass &&
                                !isFrozen &&
                                (row as any).isSummary &&
                                '!bg-background-6',
                              'px-4 py-3',
                              isFrozenWithColspan && '!p-0',
                              rowHasBottomBorder && 'border-border-1 border-b',
                              shouldApplyBorder &&
                                'before:bg-border-1 before:absolute before:top-0 before:right-0 before:bottom-0 before:z-10 before:w-[1px]',
                              (row.level === 1 || (row as any).isSummary) &&
                                !customLevel1RowClassName &&
                                'text-action-primary-red-default',
                              row.level === 2 &&
                                col.id === 'employeeCode' &&
                                'typo-body-base-semibold',
                              align === 'center' && 'text-center',
                              align === 'right' && 'text-right',
                              col.meta?.cellClassName
                            )}
                            style={{
                              ...(isFrozen && !isFrozenWithColspan
                                ? { left: `${offset}px`, position: 'sticky' as const }
                                : {}),
                              ...(!isFrozenWithColspan ? frozenBgStyle : {}),
                              ...((shouldShowBorder || shouldShowFrozenBorder) && !isFrozen
                                ? { position: 'relative' }
                                : {}),
                              ...(size && !isFrozenWithColspan
                                ? {
                                    width: `${size}px`,
                                    minWidth: `${size}px`,
                                    maxWidth: `${size}px`,
                                    boxSizing: 'border-box',
                                  }
                                : {}),
                              // Apply custom cell style if provided
                              ...(typeof col.meta?.cellStyle === 'function'
                                ? col.meta.cellStyle(row)
                                : col.meta?.cellStyle || {}),
                            }}
                            title={col.id === 'name' ? row.name : undefined}
                          >
                            {innerContent}
                          </TableComponents.Table.Cell>
                        )
                      })
                      .filter(Boolean)}
                  </TableComponents.Table.Row>
                )
              })}
          </TableComponents.Table.Body>
        </TableComponents.Table.Root>
      </div>
    </div>
  )
}

export default TableTree
