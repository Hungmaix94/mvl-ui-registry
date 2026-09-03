import { ColumnDef } from '@tanstack/react-table'

/**
 * Cột điều khiển: không bao giờ bị một ô gộp nuốt, và không bao giờ mang nhãn của dòng tổng.
 *
 * `actions` tình cờ cũng là cột đông cứng nên kiểm `meta.frozen` đã chặn được; `expander` thì
 * do từng feature tự khai (`{ id: 'expander', size: 44 }`, không `meta`), nên chỉ có danh sách
 * theo id này mới giữ được nút bung dòng khỏi bị một ô gộp cả hàng nuốt mất — kéo theo toàn bộ
 * dòng con không còn cách nào mở ra.
 *
 * `TableFooter` và `TableRow` cùng đọc hằng này để hai chỗ không lệch nhau.
 */
export const NON_MERGEABLE_COLUMN_IDS = ['actions', 'expander']

// Extend ColumnMeta cho custom properties
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    headerClassName?: string
    cellClassName?: string
    frozen?: boolean // Frozen column (sticky left)
    frozenRight?: boolean // Frozen column (sticky right, e.g. status next to actions)
    width?: string // Fixed width (e.g., '200px', 'w-48')
    align?: 'left' | 'center' | 'right'
    sortable?: boolean // Enable sorting for this specific column
    padding?: string
    hiddenHeader?: boolean // Ẩn ô header của cột (TableHeader lọc bỏ), cell vẫn render bình thường
    rowSpan?:
      | number
      | ((context: import('@tanstack/react-table').CellContext<TData, TValue>) => number)
  }
}

// Action definition
export type TableAction<TData> = {
  label: string
  icon?: React.ReactNode
  onClick: (row: TData) => void
  variant?: 'default' | 'danger' | 'success'
  show?: (row: TData) => boolean // Conditional visibility
  className?: string // Extra classes applied to the action button (e.g. whitespace-nowrap)
}

// Column configuration types
export type ColumnConfig = {
  id: string
  label: string
  visible: boolean
  order: number
  frozen?: boolean
}

export type TableColumnStorage = {
  columns: ColumnConfig[]
  version: number
}

// Main table config
export type TableConfig<TData> = {
  // Data
  data: TData[]
  columns: ColumnDef<TData>[]

  // Core features
  enableSorting?: boolean
  enableFiltering?: boolean
  enablePagination?: boolean
  enableRowSelection?: boolean | ((row: import('@tanstack/react-table').Row<TData>) => boolean)

  // Selection
  selectMode?: 'single' | 'multiple'
  onSelectionChange?: (selectedRows: TData[]) => void
  selectedRows?: TData[] // Controlled selection (by row object — page-scoped)
  // Controlled selection by id (keyed via getRowId) — robust for cross-page selection.
  // When provided, useTable treats selection as fully controlled and skips the object-based sync.
  rowSelection?: import('@tanstack/react-table').RowSelectionState
  onRowSelectionChange?: (next: import('@tanstack/react-table').RowSelectionState) => void

  // STT Column
  showSTT?: boolean // Default: true
  sttFrozen?: boolean // Default: true - Control whether STT column is frozen
  sttMeta?: any

  // Actions
  showActions?: boolean
  rowActions?: TableAction<TData>[]
  actionRenderType?: 'menu' | 'direct'
  actionMenuPosition?: 'cell' | 'cursor'
  actionMenuContentClassName?: string // Extra classes applied to the action menu popover content (e.g. 'w-max min-w-52')

  // Pagination
  pageSize?: number
  pageSizeOptions?: number[]
  manualPagination?: boolean // For server-side pagination
  pageCount?: number // Total pages (for manual pagination)
  totalRecords?: number // Total records from API (for manual pagination)
  currentPageIndex?: number // Controlled page index (0-based) for syncing with parent
  onPaginationChange?: (pageIndex: number, pageSize: number) => void

  // Pagination behavior
  // - 'fixed': pagination fixed at bottom of viewport
  // - 'static': pagination fixed at bottom with horizontal scroll bar
  // - 'inline': pagination inline within content flow (for dialogs/modals)
  paginationPosition?: 'fixed' | 'static' | 'inline'
  paginationVariant?: 'default' | 'simple'

  // Sorting
  manualSorting?: boolean // For server-side sorting
  onSortingChange?: (field: string, direction: 'asc' | 'desc' | null) => void
  // Controlled sorting state (e.g. derived from URL) so header sort indicators
  // reflect server-side ordering on first load and after navigation.
  sortingState?: import('@tanstack/react-table').SortingState

  // Styling
  className?: string
  density?: 'compact' | 'comfortable' | 'spacious'
  bordered?: boolean
  enableHover?: boolean
  // Control inner overflow container (for external scroll container)
  disableInnerOverflow?: boolean

  /**
   * Giữ hàng tiêu đề đứng yên khi cuộn dọc (mặc định `false`).
   *
   * ⚠️ `sticky top-0` mà `TableHeader` khai sẵn **KHÔNG tự đủ** — scrollport gần nhất của
   * `<thead>` là `.rt-ScrollAreaViewport` của Radix, và viewport đó cao bằng nội dung nên không
   * bao giờ cuộn; thứ cuộn là cả trang. Cờ này chặn chiều cao viewport để nó thành scrollport
   * thật, khi đó sticky có sẵn mới ăn. Chi tiết + số đo: xem docstring trong `Table.tsx`.
   *
   * Bật cho màn danh sách/đối soát dài mà mất tiêu đề là mất nghĩa của con số. Đổi lại, vùng bảng
   * tự cuộn thay vì trang cuộn — nếu màn còn nội dung khác cần cuộn cùng thì cân nhắc.
   */
  stickyHeader?: boolean

  // States
  emptyMessage?: string
  isLoading?: boolean
  hasFilter?: boolean
  loadingRows?: number

  // Row props
  getRowId?: (row: TData, index: number) => string
  onRowClick?: (row: TData) => void
  tableContainerClassName?: string
  getRowClassName?: (row: TData) => string

  // Filter actions
  onClearFilter?: () => void

  // Column configuration trigger
  isShowTableColumnConfig?: boolean

  // Column configuration
  columnConfig?: ColumnConfig[]
  onColumnConfigApply?: (columns: ColumnConfig[]) => void
  onColumnConfigReset?: () => void

  // Summary ("TỔNG CỘNG") row — sticky at the bottom of the table, above the pagination bar.
  // Per-column values come from TanStack's native `ColumnDef.footer`; this flag only turns
  // the row on. The label lands in the first column that has no `footer` of its own.
  // NOTE: on a server-paginated list the values MUST come from an API-level total over the
  // whole filtered set — never from summing the current page.
  showSummaryRow?: boolean
  summaryLabel?: string // Default: 'TỔNG CỘNG'
  summaryRowCount?: number | null // Rendered next to the label as "(N bản ghi)"

  // Table instance callback (for external pagination rendering)
  onTableInstance?: (table: import('@tanstack/react-table').Table<TData>) => void

  // Row sub-component (for rendering nested rows/collapsible details)
  renderRowSubComponent?: (row: import('@tanstack/react-table').Row<TData>) => React.ReactNode

  /**
   * Seed the expansion state instead of starting every row collapsed.
   *
   * `true` opens every row, which is what a table wants when the sub-rows are part of the
   * reading — a report whose detail lines only appear after a click reads as if the detail
   * were missing. Tables that expand on demand leave this unset.
   */
  defaultExpanded?: import('@tanstack/react-table').ExpandedState

  /**
   * Merge body cells horizontally — how many columns the cell of `columnId` should swallow.
   *
   * For rows a table synthesises rather than fetches (a "Chi nhánh › Khối" section header, a
   * "Cộng nhóm" subtotal), one label spread over the whole row reads as a divider, while the
   * same label crammed into whichever narrow column it happened to land in reads as a broken
   * data row. Return `Infinity` to run to the end of the row.
   *
   * Clamped three ways: to the columns that actually remain; short of any frozen column — a
   * merged cell can only carry one sticky offset, so swallowing a frozen neighbour would strip
   * its own left/right anchoring; and short of any `NON_MERGEABLE_COLUMN_IDS` control column,
   * the same list `TableFooter` honours.
   *
   * Đừng nhầm với `getCellColSpan` của `TableTree` — trùng tên, trùng mục đích, nhưng tham số
   * thứ hai của nó là CHỈ SỐ cột (number), không phải `columnId`.
   */
  getCellColSpan?: (row: TData, columnId: string) => number | undefined
}
