import { useMemo } from 'react'
import { ColumnDef, Chip, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import type { Position } from '@/features/org/services/position-service'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { useAbility } from '@/lib/ability.ts'
import { ColoredValueVariant } from '@/api/schema.ts'

type PositionTableProps = {
  data: Position[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeletePosition?: (position: Position) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const PositionTable = ({
  data: positions,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeletePosition,
  onClearFilter,
  hasFilter,
}: PositionTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  // Define columns according to Figma design
  const columns: ColumnDef<Position>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        meta: {
          width: 'w-[120px]',
          sortable: true,
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên chức vụ',
        meta: {
          width: 'w-[220px]',
          sortable: true,
        },
      },
      {
        accessorKey: 'is_leadership',
        header: 'Ban lãnh đạo',
        cell: ({ getValue }) => {
          const isLeadership = getValue() as boolean
          return (
            <Chip
              label={isLeadership ? 'Có' : 'Không'}
              variant={isLeadership ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
            />
          )
        },
        meta: {
          width: 'w-[140px]',
        },
      },
      {
        accessorKey: 'description',
        header: 'Mô tả',
        cell: ({ getValue }) => {
          const description = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words">{description || '-'}</span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
    ],
    []
  )

  // Define row actions
  const actions: TableAction<Position>[] = useMemo(() => {
    const tableActions: TableAction<Position>[] = []

    if (ability.can('retrieve', 'position')) {
      tableActions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.POSITION_MANAGEMENT_DETAIL.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      })
    }

    if (ability.can('update', 'position')) {
      tableActions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.POSITION_MANAGEMENT_EDIT.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      })
    }

    if (ability.can('destroy', 'position')) {
      tableActions.push({
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeletePosition?.(record)
        },
      })
    }

    return tableActions
  }, [ability, onDeletePosition, navigate])

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={positions}
      columns={columns}
      showSTT
      showActions
      rowActions={actions}
      enableSorting
      manualSorting
      manualPagination
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
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

export default PositionTable
