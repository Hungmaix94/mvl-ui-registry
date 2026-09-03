import { useState, useMemo, useCallback, useRef, useLayoutEffect, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  PaginationState,
  ColumnDef,
  ExpandedState,
} from '@tanstack/react-table'
import type { TableConfig } from '@/types/table'
import {
  createSelectionColumn,
  createSTTColumn,
  createActionsColumn,
  calculateFrozenOffsets,
  calculateFrozenRightOffsets,
  getWidthInPixels,
} from '@/utils/table/columnHelpers.tsx'
import type { TableActionMenuRef } from '../ui/table/TableActionMenu'

/**
 * Số tầng header mà bộ cột sẽ render: 1 khi mọi cột đều phẳng, 2 khi có group column
 * (`{ header, columns: [...] }`), sâu hơn nữa thì đệ quy tiếp.
 */
function getHeaderDepth<TData>(cols: ColumnDef<TData>[]): number {
  let depth = 1
  for (const col of cols) {
    const children = (col as { columns?: ColumnDef<TData>[] }).columns
    if (Array.isArray(children) && children.length > 0) {
      depth = Math.max(depth, 1 + getHeaderDepth(children))
    }
  }
  return depth
}

export function useTable<TData>(config: TableConfig<TData>) {
  const {
    data,
    columns,
    enableSorting = true,
    enableFiltering = true,
    enablePagination = true,
    enableRowSelection = false,
    selectMode = 'multiple',
    showSTT = true,
    showActions = false,
    rowActions = [],
    pageSize = 25,
    manualPagination = false,
    manualSorting = false,
    pageCount,
    currentPageIndex, // New prop for controlled pagination
    onPaginationChange,
    onSortingChange,
    sortingState,
    onSelectionChange,
    getRowId,
    rowSelection: controlledRowSelection,
    onRowSelectionChange: controlledOnRowSelectionChange,
    isShowTableColumnConfig,
    sttFrozen = true, // New prop to control STT column frozen state
    actionMenuPosition = 'cursor',
  } = config

  // State management
  const [sorting, setSorting] = useState<SortingState>(sortingState ?? [])

  // Keep internal sorting in sync with a controlled sortingState (e.g. URL-driven),
  // so header sort indicators reflect server-side ordering on load / navigation.
  useEffect(() => {
    if (sortingState === undefined) return
    setSorting((prev) =>
      JSON.stringify(prev) === JSON.stringify(sortingState) ? prev : sortingState
    )
  }, [sortingState])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  // Selection can be uncontrolled (internal state) or controlled by id via `rowSelection`
  // + `onRowSelectionChange` (robust for cross-page selection — keys come from getRowId).
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})
  const isSelectionControlled = controlledRowSelection !== undefined
  const rowSelection = controlledRowSelection ?? internalRowSelection
  const setRowSelection = useCallback(
    (updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => {
      if (isSelectionControlled) {
        const next =
          typeof updater === 'function'
            ? (updater as (p: RowSelectionState) => RowSelectionState)(controlledRowSelection ?? {})
            : updater
        controlledOnRowSelectionChange?.(next)
      } else {
        setInternalRowSelection(updater)
      }
    },
    [isSelectionControlled, controlledRowSelection, controlledOnRowSelectionChange]
  )
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })
  const [expanded, setExpanded] = useState<ExpandedState>(config.defaultExpanded ?? {})

  const [isShowConfigColumn, setIsShowConfigColumn] = useState<boolean>(false)

  // Sync pageSize when it changes from props
  useEffect(() => {
    if (pageSize !== pagination.pageSize) {
      setPagination((prev) => ({ ...prev, pageSize }))
    }
  }, [pageSize])

  // Sync pageIndex when currentPageIndex prop changes (controlled mode)
  useEffect(() => {
    if (currentPageIndex !== undefined && currentPageIndex !== pagination.pageIndex) {
      setPagination((prev) => ({ ...prev, pageIndex: currentPageIndex }))
    }
  }, [currentPageIndex])

  // Sync rowSelection state with controlled selectedRows prop (object-based, page-scoped).
  // Skipped entirely when selection is controlled by id (rowSelection prop) — that path is
  // authoritative and the object-identity sync below would clobber cross-page selections.
  useEffect(() => {
    if (isSelectionControlled) return
    if (config.selectedRows) {
      const newSelection: RowSelectionState = {}
      config.selectedRows.forEach((row) => {
        const index = data.indexOf(row)
        if (index >= 0) {
          const id = getRowId ? getRowId(row, index) : index.toString()
          newSelection[id] = true
        } else {
          const idProp = (row as any)?.id
          if (idProp !== undefined) {
            const dataIndex = data.findIndex((d) => (d as any)?.id === idProp)
            if (dataIndex >= 0) {
              const id = getRowId ? getRowId(data[dataIndex], dataIndex) : dataIndex.toString()
              newSelection[id] = true
            }
          }
        }
      })

      const isDifferent =
        Object.keys(newSelection).length !== Object.keys(rowSelection).length ||
        Object.keys(newSelection).some((k) => newSelection[k] !== rowSelection[k])

      if (isDifferent) {
        setRowSelection(newSelection)
      }
    }
  }, [config.selectedRows, data, getRowId, isSelectionControlled])

  // Respond to trigger prop - trigger when prop is true
  useLayoutEffect(() => {
    if (isShowTableColumnConfig) {
      setIsShowConfigColumn(true)
    }
  }, [isShowTableColumnConfig])

  // Reset trigger when dialog closes
  const handleDialogClose = useCallback((open: boolean) => {
    setIsShowConfigColumn(open)
  }, [])

  // Action menu refs management (for cell-based action menu)
  const actionMenuRefs = useRef<Map<string, TableActionMenuRef>>(new Map())

  const onActionMenuRefReady = useCallback((rowId: string, ref: TableActionMenuRef) => {
    actionMenuRefs.current.set(rowId, ref)
  }, [])

  // Cursor-based action menu state
  const [activeActionRowId, setActiveActionRowId] = useState<string | null>(null)
  const [cursorActionMenuPosition, setCursorActionMenuPosition] = useState<{
    x: number
    y: number
  } | null>(null)

  const triggerActionMenu = useCallback(
    (rowId: string, position?: { x: number; y: number }) => {
      if (actionMenuPosition === 'cursor' && position) {
        setActiveActionRowId(rowId)
        setCursorActionMenuPosition(position)
        return
      }

      const ref = actionMenuRefs.current.get(rowId)
      if (ref) {
        ref.trigger()
      }
    },
    [actionMenuPosition]
  )

  const closeActionMenu = useCallback(() => {
    setActiveActionRowId(null)
    setCursorActionMenuPosition(null)
  }, [])

  // Calculate STT start index based on pagination
  const calculatedSttStartIndex = useMemo(() => {
    if (!showSTT) return 0

    // startIndex = pageIndex * pageSize
    return pagination.pageIndex * pagination.pageSize
  }, [showSTT, pagination.pageIndex, pagination.pageSize])

  // Build final columns array with special columns
  const finalColumns = useMemo(() => {
    const cols: ColumnDef<TData>[] = []

    // Cột tiện ích (select / stt / actions) do chính hook chèn nên luôn phẳng — chúng không tự
    // biết bộ cột người dùng có group column hay không. `TableHeader` chỉ bỏ bớt bản sao ở tầng
    // dưới khi cột khai báo `meta.rowSpan`, nên thiếu nó là chúng render ở CẢ hai tầng header:
    // checkbox hiện 2 lần, ô actions rỗng nhân đôi. Gán rowSpan = số tầng để chúng span hết.
    // Caller đã tự khai (vd `sttMeta={{ rowSpan: 2 }}`) thì tôn trọng, không ghi đè.
    const headerDepth = getHeaderDepth(columns)
    const spanUtilityColumn = (col: ColumnDef<TData>): ColumnDef<TData> =>
      headerDepth > 1 && col.meta?.rowSpan == null
        ? { ...col, meta: { ...col.meta, rowSpan: headerDepth } }
        : col

    if (enableRowSelection) {
      const selectColumn = createSelectionColumn<TData>()
      // Add size based on meta.width
      selectColumn.size = getWidthInPixels(selectColumn.meta?.width || 'w-12')
      cols.push(spanUtilityColumn(selectColumn))
    }

    if (showSTT) {
      const sttColumn = createSTTColumn<TData>(
        calculatedSttStartIndex,
        sttFrozen,
        enablePagination,
        config.sttMeta
      )
      // Apply size to STT column
      sttColumn.size = getWidthInPixels(sttColumn.meta?.width || 'w-12')
      cols.push(spanUtilityColumn(sttColumn))
    }

    // Process user columns to set sortable and size based on meta properties
    const processedColumns = columns.map((column) => ({
      ...column,
      enableSorting: column.meta?.sortable === true,
      size: column.meta?.width ? getWidthInPixels(column.meta.width) : column.size,
    }))

    cols.push(...processedColumns)

    if (showActions && rowActions && rowActions.length > 0) {
      const actionRenderType = config.actionRenderType || 'menu'
      const actionsColumn = createActionsColumn<TData>(rowActions, actionRenderType)
      // Apply size to Actions column
      actionsColumn.size = getWidthInPixels(actionsColumn.meta?.width || 'w-10')
      cols.push(spanUtilityColumn(actionsColumn))
    }

    return cols
  }, [
    columns,
    enableRowSelection,
    showSTT,
    calculatedSttStartIndex,
    sttFrozen,
    showActions,
    rowActions,
  ])

  // Calculate frozen column offsets
  const frozenOffsets = useMemo(() => {
    return calculateFrozenOffsets(finalColumns)
  }, [finalColumns])

  // Calculate right-frozen column offsets (sticky to the right edge)
  const frozenRightOffsets = useMemo(() => {
    return calculateFrozenRightOffsets(finalColumns)
  }, [finalColumns])

  // Handle controlled vs uncontrolled selection
  const handleRowSelectionChange = useCallback(
    (updater: any) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
      setRowSelection(newSelection)

      if (onSelectionChange) {
        // Get selected rows data
        const selectedRowIds = Object.keys(newSelection).filter((key) => newSelection[key])
        const selectedRowsData = selectedRowIds
          .map((id) =>
            data.find(
              (_, index) => (getRowId ? getRowId(data[index], index) : index.toString()) === id
            )
          )
          .filter(Boolean) as TData[]

        onSelectionChange(selectedRowsData)
      }
    },
    [rowSelection, onSelectionChange, data, getRowId]
  )

  // Create table instance
  const table = useReactTable({
    data,
    columns: finalColumns,

    // State
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination,
      expanded,
    },

    // State setters
    onExpandedChange: setExpanded,
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(newSorting)

      // Notify parent component for manual sorting
      if (manualSorting && onSortingChange && newSorting.length > 0) {
        const sort = newSorting[0]
        onSortingChange(sort.id, sort.desc ? 'desc' : 'asc')
      } else if (manualSorting && onSortingChange && newSorting.length === 0) {
        onSortingChange('', null)
      }
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: handleRowSelectionChange,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater
      const isPageSizeChanged = newPagination.pageSize !== pagination.pageSize

      // Reset to first page when page size changes
      if (isPageSizeChanged) {
        newPagination.pageIndex = 0
      }

      setPagination(newPagination)

      // Always call onPaginationChange when page size changes, even if pageIndex stays at 0
      if (onPaginationChange) {
        onPaginationChange(newPagination.pageIndex, newPagination.pageSize)
      }
    },

    // Row models
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: enableSorting && !manualSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,

    // Column sizing
    enableColumnResizing: true,
    columnResizeMode: 'onChange',

    // Sorting config
    manualSorting,

    // Selection config
    enableRowSelection: enableRowSelection,
    enableMultiRowSelection: selectMode === 'multiple',

    // Pagination config
    // manualPagination only makes sense when enablePagination is true
    // When enablePagination is false, pagination is disabled regardless of manualPagination
    manualPagination: enablePagination ? manualPagination : false,
    pageCount:
      enablePagination && manualPagination
        ? pageCount
        : enablePagination
          ? data.length
            ? Math.ceil(data.length / pagination.pageSize)
            : 0
          : undefined,

    // Row identification
    getRowId: getRowId || ((_, index) => index.toString()),

    // Meta for action menu refs
    meta: {
      onActionMenuRefReady,
    },
  })

  // Get selected rows
  const selectedRowsData = useMemo(() => {
    return table.getSelectedRowModel().rows.map((row) => row.original)
  }, [table, rowSelection])

  // Helper methods
  const clearSelection = useCallback(() => {
    setRowSelection({})
  }, [])

  const selectAll = useCallback(() => {
    setRowSelection(
      data.reduce((acc, _, index) => {
        const id = getRowId ? getRowId(data[index], index) : index.toString()
        acc[id] = true
        return acc
      }, {} as RowSelectionState)
    )
  }, [data, getRowId])

  return {
    table,
    selectedRows: selectedRowsData,
    globalFilter,
    setGlobalFilter,
    frozenOffsets,
    frozenRightOffsets,
    clearSelection,
    selectAll,
    isAllSelected: table.getIsAllRowsSelected(),
    isSomeSelected: table.getIsSomeRowsSelected(),
    selectionCount: Object.keys(rowSelection).length,
    triggerActionMenu,
    showActions,
    rowActions,
    activeActionRowId,
    cursorActionMenuPosition,
    closeActionMenu,

    isShowConfigColumn,
    setIsShowConfigColumn: handleDialogClose,
  }
}
