import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { LibraryCategoryRead } from '@/services/elibrary-service'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { ColoredValueVariant } from '@/api/schema.ts'

type CategoryTableProps = {
  data: LibraryCategoryRead[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange?: (field: string, direction: 'asc' | 'desc' | null) => void
  onDelete?: (category: LibraryCategoryRead) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const CategoryTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDelete,
  onClearFilter,
  hasFilter = false,
}: CategoryTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  // Define columns according to Category schema
  const columns: ColumnDef<LibraryCategoryRead>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Tên danh mục',
        meta: {
          width: '200px',
          sortable: true,
        },
      },
      {
        accessorKey: 'files_count',
        header: 'Số tài liệu',
        meta: {
          width: 'flex-1',
          align: 'center',
        },
      },
      {
        accessorKey: 'description',
        header: 'Mô tả',
        cell: ({ row }) => row.original.description || '-',
        meta: {
          width: '200px',
        },
      },
      {
        accessorKey: 'is_active',
        header: 'Trạng thái',
        meta: {
          width: '100px',
        },
        cell: ({ getValue }) => {
          const isActive = getValue() as boolean
          return (
            <Chip
              label={isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
              variant={isActive ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
              size="small"
            />
          )
        },
      },
    ],
    []
  )

  // Define row actions
  const actions: TableAction<LibraryCategoryRead>[] = useMemo(() => {
    const tableActions: TableAction<LibraryCategoryRead>[] = []

    if (ability.can('retrieve', 'elibrary_category')) {
      tableActions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          const detailPath = APP_PATH.ELIBRARY_CATEGORY_DETAIL.replace(':id', String(record.id))
          navigate(detailPath, {
            state: { from: window.location.pathname + window.location.search },
          })
        },
      })
    }

    if (ability.can('update', 'elibrary_category')) {
      tableActions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => {
          const editPath = APP_PATH.ELIBRARY_CATEGORY_EDIT.replace(':id', String(record.id))
          navigate(editPath, {
            state: { from: window.location.pathname + window.location.search },
          })
        },
      })
    }

    if (ability.can('destroy', 'elibrary_category')) {
      tableActions.push({
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          if (onDelete) onDelete(record)
        },
      })
    }

    return tableActions
  }, [ability, onDelete, navigate])

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
      showActions
      rowActions={actions}
      enableSorting
      manualSorting
      enablePagination
      manualPagination
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1} // table is 0-indexed
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      className="flex-1"
    />
  )
}

export default CategoryTable
