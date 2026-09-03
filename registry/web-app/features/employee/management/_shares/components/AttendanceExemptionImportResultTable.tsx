import { useMemo, useState } from 'react'
import { flexRender } from '@tanstack/react-table'
import * as TableComponents from '@radix-ui/themes'
import { TablePagination } from '@/components/ui'
import { useTable } from '@/hooks/useTable'
import { cn } from '@/utils'
import type { ImportColumnStructure, ImportResultRecord } from '@/types/hrm-import'
import { getWidthInPixels } from '@/utils/table/columnHelpers'

const COMPACT_PADDING = 'py-1.5 px-2'
const PAGE_SIZE = 25
const STICKY_COL_1_WIDTH = 120
const STICKY_Z_INDEX = 10

type AttendanceExemptionImportResultTableProps = {
  data: ImportResultRecord[]
  columnStructure: ImportColumnStructure[]
  highlightError: boolean
  emptyMessage?: string
  enablePagination?: boolean
}

/** Build flat list of accessorKeys in display order */
function getFlatColumns(
  structure: ImportColumnStructure[],
  highlightError: boolean
): Array<{ accessorKey: string; isErrorCol: boolean; isDateCol: boolean; width: string }> {
  const result: Array<{
    accessorKey: string
    isErrorCol: boolean
    isDateCol: boolean
    width: string
  }> = []
  for (const item of structure) {
    if (item.type === 'standalone') {
      const lower = item.header.toLowerCase()
      const isErrorCol =
        highlightError && (lower === 'thông tin lỗi' || lower.includes('import error'))
      result.push({
        accessorKey: item.accessorKey,
        isErrorCol,
        isDateCol: false,
        width: isErrorCol ? 'w-[320px]' : 'w-[120px]',
      })
    } else if (item.type === 'group') {
      const parentLower = item.parentHeader.toLowerCase()
      const isErrorGroup = highlightError && parentLower.includes('import error')
      for (const child of item.children) {
        const lower = child.header.toLowerCase()
        const isErrorCol =
          highlightError &&
          (isErrorGroup || lower === 'thông tin lỗi' || lower.includes('import error'))
        const isDateGroup = /^\d{2}$/.test(item.parentHeader)
        result.push({
          accessorKey: child.accessorKey,
          isErrorCol,
          isDateCol: isDateGroup,
          width: isErrorCol ? 'w-[320px]' : 'w-[40px]',
        })
      }
    }
  }
  return result
}

export default function AttendanceExemptionImportResultTable({
  data,
  columnStructure,
  highlightError,
  emptyMessage = 'Không có dữ liệu',
  enablePagination = true,
}: AttendanceExemptionImportResultTableProps) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })
  const flatColumns = useMemo(
    () => getFlatColumns(columnStructure, highlightError),
    [columnStructure, highlightError]
  )

  const paginatedData = useMemo(() => {
    if (!enablePagination || data.length <= pagination.pageSize) {
      return data
    }
    const start = pagination.pageIndex * pagination.pageSize
    return data.slice(start, start + pagination.pageSize)
  }, [data, enablePagination, pagination.pageIndex, pagination.pageSize])

  const columnDefs = useMemo(
    () =>
      flatColumns.map((col) => ({
        id: col.accessorKey,
        accessorFn: (row: ImportResultRecord) => row?.[col.accessorKey] ?? '',
        header: col.accessorKey,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          const value = `${getValue() ?? ''}`
          return (
            <span
              className={cn(
                'text-content-dark-1 block w-full text-xs whitespace-pre-line',
                col.isErrorCol && 'text-data-red-default',
                col.isDateCol && 'text-center'
              )}
            >
              {value}
            </span>
          )
        },
        meta: {
          width: col.width,
          align: col.isDateCol ? ('center' as const) : undefined,
        },
      })),
    [flatColumns]
  )

  const { table } = useTable({
    data: paginatedData,
    columns: columnDefs,
    enableSorting: false,
    enableFiltering: false,
    enablePagination,
    showSTT: false,
    pageSize: pagination.pageSize,
    manualPagination: true,
    pageCount: Math.ceil(data.length / pagination.pageSize),
    totalRecords: data.length,
    onPaginationChange: (pageIndex: number, pageSize: number) => {
      setPagination({ pageIndex, pageSize })
    },
    currentPageIndex: pagination.pageIndex,
  })

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-border-1 relative overflow-x-auto border">
        <TableComponents.Table.Root layout="fixed" className="w-full border-collapse text-xs">
          <thead className="!bg-background-1 border-border-1 border-b">
            {/* Row 0: Mã nhân viên (rowSpan 2), Họ tên (rowSpan 2), dates (colSpan 2), Import Error */}
            <TableComponents.Table.Row>
              {columnStructure.map((item) => {
                if (item.type === 'standalone') {
                  const isSpanRow = item.header === 'Mã nhân viên' || item.header === 'Họ tên'
                  const width = item.header.toLowerCase().includes('import error') ? 320 : 120
                  const isStickyCol1 = item.header === 'Mã nhân viên'
                  const isStickyCol2 = item.header === 'Họ tên'
                  const stickyStyle =
                    isStickyCol1 || isStickyCol2
                      ? {
                          position: 'sticky' as const,
                          left: isStickyCol1 ? 0 : STICKY_COL_1_WIDTH,
                          zIndex: isStickyCol2 ? STICKY_Z_INDEX + 1 : STICKY_Z_INDEX,
                        }
                      : undefined
                  return (
                    <TableComponents.Table.ColumnHeaderCell
                      key={item.accessorKey}
                      rowSpan={isSpanRow ? 2 : undefined}
                      className={cn(
                        'text-content-dark-2 border-border-1 border-r border-b !font-normal !shadow-none last:border-r-0',
                        COMPACT_PADDING,
                        (isStickyCol1 || isStickyCol2) && '!bg-background-1',
                        isStickyCol2 &&
                          'before:bg-border-1 after:bg-border-1 before:absolute before:top-0 before:right-0 before:bottom-0 before:z-10 before:w-[1px] before:content-[""] after:absolute after:top-0 after:bottom-0 after:left-0 after:z-10 after:w-[1px] after:content-[""]'
                      )}
                      style={{
                        minWidth: width,
                        width,
                        ...stickyStyle,
                      }}
                    >
                      {item.header}
                    </TableComponents.Table.ColumnHeaderCell>
                  )
                }
                if (item.type === 'group') {
                  const colSpan = item.children.length
                  const isDateGroup = /^\d{2}$/.test(item.parentHeader)
                  const width = isDateGroup ? 40 * colSpan : 320
                  return (
                    <TableComponents.Table.ColumnHeaderCell
                      key={`group-${item.parentHeader}`}
                      colSpan={colSpan}
                      className={cn(
                        'text-content-dark-2 border-border-1 border-r border-b !font-normal last:border-r-0',
                        COMPACT_PADDING,
                        isDateGroup && 'text-center'
                      )}
                      style={{ minWidth: width, width }}
                    >
                      {item.parentHeader}
                    </TableComponents.Table.ColumnHeaderCell>
                  )
                }
                return null
              })}
            </TableComponents.Table.Row>
            {/* Row 1: Only sub-cols S, C for each date group */}
            <TableComponents.Table.Row>
              {columnStructure
                .filter(
                  (item): item is Extract<ImportColumnStructure, { type: 'group' }> =>
                    item.type === 'group'
                )
                .flatMap((item) =>
                  item.children.map((child) => {
                    const isDateCol = /^\d{2}$/.test(item.parentHeader)
                    return (
                      <TableComponents.Table.ColumnHeaderCell
                        key={child.accessorKey}
                        className={cn(
                          'text-content-dark-2 border-border-1 border-r border-b !font-normal last:border-r-0',
                          COMPACT_PADDING,
                          isDateCol && 'text-center'
                        )}
                        style={{ minWidth: 40, width: 40 }}
                      >
                        {child.header}
                      </TableComponents.Table.ColumnHeaderCell>
                    )
                  })
                )}
            </TableComponents.Table.Row>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={flatColumns.length}
                  className="border-border-1 text-content-dark-3 px-4 py-8 text-center"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableComponents.Table.Row
                  key={row.id}
                  className="group hover:bg-data-light-grey-hover transition-colors"
                >
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    const colMeta = cell.column.columnDef.meta
                    const isStickyCol1 = cellIndex === 0
                    const isStickyCol2 = cellIndex === 1
                    const stickyStyle =
                      isStickyCol1 || isStickyCol2
                        ? {
                            position: 'sticky' as const,
                            left: isStickyCol1 ? 0 : STICKY_COL_1_WIDTH,
                            zIndex: isStickyCol2 ? STICKY_Z_INDEX + 1 : STICKY_Z_INDEX,
                          }
                        : undefined
                    return (
                      <TableComponents.Table.Cell
                        key={cell.id}
                        className={cn(
                          'border-border-1 border-r border-b last:border-r-0',
                          COMPACT_PADDING,
                          colMeta?.align === 'center' && 'text-center',
                          (isStickyCol1 || isStickyCol2) &&
                            '!bg-background-1 group-hover:bg-data-light-grey-hover',
                          isStickyCol2 &&
                            'before:bg-border-1 after:bg-border-1 before:absolute before:top-0 before:right-0 before:bottom-0 before:z-10 before:w-[1px] before:content-[""] after:absolute after:top-0 after:bottom-0 after:left-0 after:z-10 after:w-[1px] after:content-[""]'
                        )}
                        style={{
                          ...(colMeta?.width
                            ? {
                                minWidth: getWidthInPixels(colMeta.width as string),
                                width: getWidthInPixels(colMeta.width as string),
                              }
                            : {}),
                          ...stickyStyle,
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableComponents.Table.Cell>
                    )
                  })}
                </TableComponents.Table.Row>
              ))
            )}
          </tbody>
        </TableComponents.Table.Root>
      </div>
      {enablePagination && data.length > 10 && (
        <div className="mt-4 flex justify-end">
          <TablePagination table={table} totalRecords={data.length} position="static" />
        </div>
      )}
    </div>
  )
}
