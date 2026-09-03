import { ColumnDef } from '@tanstack/react-table'
import { Checkbox, Button } from '@/components/ui'
import { TableAction } from '@/types/table'
import { TableActionMenu } from '@/components/ui/table/TableActionMenu'
import { cn } from '@/utils'

// Selection column helper
export function createSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: 'select',
    header: ({ table }) => {
      // "Chọn tất cả" chỉ có nghĩa khi thực sự có cái để chọn. Trang mà mọi dòng đều ngoài
      // diện chọn (vd worksheet đã duyệt) thì ô check đầu bảng bấm vào không đổi gì —
      // ẩn đi cho khớp với cột thân bảng vốn cũng đang trống.
      if (!table.getRowModel().rows.some((row) => row.getCanSelect())) {
        return null
      }
      return (
        <div className="flex h-full flex-col items-center justify-center px-2">
          {/* Page-scoped getters: the header is a "select all on this page" control. The global
              getIsSome/AllRowsSelected misreport when selection is controlled and spans pages
              (more keys than the current page) — the page variants stay correct. */}
          <Checkbox
            checked={
              table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(checked) => {
              table.toggleAllRowsSelected(!!checked)
            }}
          />
        </div>
      )
    },
    cell: ({ row }) => {
      if ((row.original as any)?._isPinned) {
        return null
      }
      // Dòng không chọn được thì bỏ hẳn ô check thay vì render checkbox mờ: ô mờ vẫn mời gọi
      // người dùng bấm rồi không phản hồi, còn ô trống nói ngay "dòng này không thuộc diện chọn".
      if (!row.getCanSelect()) {
        return null
      }
      return (
        <div className="flex h-full flex-col items-center justify-center px-2">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => {
              row.toggleSelected(!!checked)
            }}
          />
        </div>
      )
    },
    meta: {
      frozen: true,
      width: 'w-10',
      align: 'center',
      headerClassName: 'p-0 text-center bg-gray-50',
      cellClassName: 'p-0 text-center',
    },
    enableSorting: false,
    enableResizing: false,
  }
}

// STT column helper
export function createSTTColumn<TData>(
  startIndex = 0,
  frozen = true,
  enablePagination = true,
  metaOverride?: any
): ColumnDef<TData> {
  return {
    id: 'stt',
    header: 'STT',
    cell: ({ row, table }) => {
      if ((row.original as any)?._isPinned) {
        return null
      }
      // Calculate STT based on row position in displayed rows (always increasing from 1, regardless of sorting)
      const currentRows = table.getRowModel().rows
      const positionInDisplay = currentRows.findIndex((r) => r.id === row.id)
      const position = positionInDisplay >= 0 ? positionInDisplay : row.index

      if (enablePagination) {
        // STT = startIndex + position + 1 (startIndex = pageIndex * pageSize)
        return startIndex + position + 1
      } else {
        // STT = position + 1
        return position + 1
      }
    },
    meta: {
      frozen: frozen,
      width: 'w-16',
      align: 'center',
      cellClassName: 'text-nowrap',
      ...metaOverride,
    },
    enableSorting: false,
  }
}

// Actions column helper
export function createActionsColumn<TData>(
  actions: TableAction<TData>[],
  renderType: 'menu' | 'direct' = 'menu'
): ColumnDef<TData> {
  return {
    id: 'actions',
    header: '',
    cell: ({ row, table }) => {
      if ((row.original as any)?._isPinned) {
        return null
      }
      if (renderType === 'direct') {
        const visibleActions = actions.filter((action) =>
          action.show ? action.show(row.original) : true
        )

        return (
          <div className="flex items-center justify-center gap-2">
            {visibleActions.map((action, index) => (
              <Button
                key={index}
                type="button"
                variant="text"
                size="small"
                iconOnly
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  action.onClick(row.original)
                }}
                className={cn(
                  'h-8 w-8 p-0',
                  action.variant === 'danger'
                    ? 'text-data-red-default hover:text-data-red-hover'
                    : action.variant === 'success'
                      ? 'text-data-green-default hover:text-data-green-hover'
                      : 'text-content-dark-1'
                )}
                title={action.label}
              >
                {action.icon}
              </Button>
            ))}
          </div>
        )
      }

      // Get callback to register action menu ref
      const onRefReady = (table.options.meta as any)?.onActionMenuRefReady
      if (!onRefReady) {
        return <TableActionMenu row={row.original} actions={actions} />
      }

      return (
        <TableActionMenu
          row={row.original}
          actions={actions}
          onRefReady={(ref) => onRefReady(row.id, ref)}
        />
      )
    },
    meta: {
      width: renderType === 'direct' ? `w-[${actions.length * 36 + 8}px]` : 'w-12',
      align: 'center',
      frozen: true,
    },
    enableSorting: false,
  }
}

// Helper to convert width string to pixel value
export function getWidthInPixels(width: string): number {
  if (!width) {
    return 120
  }

  const normalized = width.trim()

  if (normalized.startsWith('w-[') && normalized.endsWith(']')) {
    const value = normalized.slice(3, -1).trim()

    if (value.endsWith('px')) {
      const numeric = Number.parseFloat(value.slice(0, -2))
      return Number.isFinite(numeric) ? numeric : 120
    }

    const numeric = Number.parseFloat(value)
    return Number.isFinite(numeric) ? numeric : 120
  }

  if (normalized.startsWith('w-')) {
    const widthMap: Record<string, number> = {
      'w-8': 32,
      'w-10': 40,
      'w-12': 48,
      'w-16': 64,
      'w-20': 80,
      'w-24': 96,
      'w-32': 128,
      'w-40': 160,
      'w-48': 192,
      'w-56': 224,
      'w-64': 256,
      'w-72': 288,
      'w-80': 320,
      'w-96': 384,
    }
    return widthMap[normalized] ?? 120
  }

  if (normalized.endsWith('px')) {
    const numeric = Number.parseFloat(normalized.slice(0, -2))
    return Number.isFinite(numeric) ? numeric : 120
  }

  const numeric = Number.parseFloat(normalized)
  return Number.isFinite(numeric) ? numeric : 120
}

/**
 * `cell.column.id` lúc chạy chuẩn hoá `accessorKey` kiểu `employee.fullname` thành
 * `employee_fullname`. Phải bắt chước y hệt ở đây, nếu không key của `frozenOffsets` không khớp
 * id mà `TableRow`/`TableHeader` dùng để tra.
 */
function resolveColumnId<TData>(column: ColumnDef<TData>): string | undefined {
  return (
    column.id ??
    ('accessorKey' in column && typeof column.accessorKey === 'string'
      ? column.accessorKey.replace(/\./g, '_')
      : undefined)
  )
}

function getColumnChildren<TData>(column: ColumnDef<TData>): ColumnDef<TData>[] | undefined {
  const children = (column as { columns?: ColumnDef<TData>[] }).columns
  return children && children.length > 0 ? children : undefined
}

/**
 * Bề rộng mặc định của TanStack khi cột không khai `size`. Phải trùng đúng con số của thư viện:
 * bảng render bằng `cell.column.getSize()`, nên offset tính ở đây mà lệch là cột đông cứng hở
 * khe và nội dung đang cuộn lộ qua.
 */
const TANSTACK_DEFAULT_COLUMN_SIZE = 150

/**
 * Bề rộng THẬT mà bảng sẽ render cho một cột — phản chiếu `column.getSize()` của TanStack.
 *
 * ⚠️ **Không được đọc `meta.width` ở đây.** `useTable` có quy đổi `meta.width` → `size`, nhưng
 * chỉ ở **cột cấp 1** (`columns.map(...)`, không đệ quy). Với bảng header nhiều tầng thì cột lá
 * không bao giờ đi qua bước đó ⇒ `size` rỗng ⇒ bảng render 150px trong khi `meta.width` ghi
 * 180px. Lấy theo `meta.width` là tính ra offset 180 cho một cột rộng 150 — đo được ngay trên
 * màn "Chia HH theo tháng": hở 30px giữa "Dự án" và "Mã BĐS", nội dung cuộn lộ qua khe.
 *
 * Bảng phẳng không đổi: `useTable` đã gán `size` nên nhánh `size` luôn trúng.
 */
function getRenderedColumnWidth<TData>(column: ColumnDef<TData>): number {
  return typeof column.size === 'number' ? column.size : TANSTACK_DEFAULT_COLUMN_SIZE
}

/**
 * Offset trái của các cột đông cứng, key theo `column.id`.
 *
 * **Bề rộng cộng dồn theo CỘT LÁ, không theo cột cấp 1.** Bảng có header nhiều tầng (nhóm chữ
 * cái Excel của hai màn worksheet kỳ) thì ô thân bảng thuộc về cột LÁ (`project_name_col`) còn ô
 * header thuộc về cột nhóm (`project_name`, `project_name_tier1`) — cả ba id đều phải có offset,
 * nếu không ô nào tra hụt sẽ nhận `left: "undefinedpx"`, trình duyệt bỏ qua, và phần đó trôi
 * theo khi kéo ngang trong khi phần kia đứng yên.
 *
 * Bề rộng chỉ cộng ở LÁ — cột nhóm không chiếm chỗ riêng, nó rộng đúng bằng tổng các lá của nó.
 * Tổ tiên nhận offset của lá TRÁI NHẤT trong nhánh, đúng chỗ mép trái của cả nhóm.
 *
 * Bảng phẳng không đổi hành vi: mỗi cột cấp 1 chính là lá của chính nó.
 */
export function calculateFrozenOffsets<TData>(columns: ColumnDef<TData>[]): Record<string, number> {
  const offsets: Record<string, number> = {}
  let leftOffset = 0

  // `inheritedFrozen`: nhóm cha đông cứng thì mọi lá bên dưới đông cứng theo, khỏi phải khai lại
  // ở từng tầng.
  const walk = (column: ColumnDef<TData>, inheritedFrozen: boolean): void => {
    const isFrozen = inheritedFrozen || column.meta?.frozen === true
    const columnId = resolveColumnId(column)
    const children = getColumnChildren(column)

    if (!isFrozen) {
      return
    }

    if (children) {
      // Offset của nhóm = offset của lá trái nhất ⇒ ghi TRƯỚC khi duyệt con, lúc `leftOffset`
      // còn đang đứng ở mép trái của nhánh.
      if (columnId) {
        offsets[columnId] = leftOffset
      }
      children.forEach((child) => walk(child, true))
      return
    }

    if (!columnId) {
      return
    }

    offsets[columnId] = leftOffset
    leftOffset += getRenderedColumnWidth(column)
  }

  columns.forEach((column) => walk(column, false))

  return offsets
}

// Helper to calculate right-frozen column offsets (sticky to the right edge).
// Walks columns right-to-left, accumulating widths of right-pinned columns
// (the special `actions` column is always right-pinned and contributes its width).
export function calculateFrozenRightOffsets<TData>(
  columns: ColumnDef<TData>[]
): Record<string, number> {
  const offsets: Record<string, number> = {}
  let rightOffset = 0

  for (let i = columns.length - 1; i >= 0; i--) {
    const column = columns[i]
    const isActions = column.id === 'actions'
    const isFrozenRight = column.meta?.frozenRight === true

    if (!isActions && !isFrozenRight) {
      continue
    }

    const columnId =
      column.id ??
      ('accessorKey' in column && typeof column.accessorKey === 'string'
        ? column.accessorKey.replace(/\./g, '_')
        : undefined)

    if (!columnId) {
      continue
    }

    // Only expose offsets for explicitly right-frozen columns; the `actions`
    // column keeps its own `right: 0` handling but still contributes width.
    if (isFrozenRight) {
      offsets[columnId] = rightOffset
    }

    // Cùng luật bề rộng với `calculateFrozenOffsets` — hai hàm anh em mà dùng hai nguồn khác
    // nhau là cái bẫy cho người sửa sau. Hiện là no-op: không màn nào khai `frozenRight`, còn
    // cột `actions` luôn được `useTable` gán `size`.
    rightOffset += getRenderedColumnWidth(column)
  }

  return offsets
}
