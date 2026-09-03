import { useMemo } from 'react'
import { ColumnDef, Table, TableAction } from '@/components/ui'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type Branch } from '@/features/org/services/branch-service'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { useAbility } from '@/lib/ability.ts'
import TableError from '@/components/ui/table/TableError'

type BranchTableProps = {
  data: Branch[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteBranch?: (branch: Branch) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const BranchTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteBranch,
  onClearFilter,
  hasFilter,
}: BranchTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  // Define columns according to Figma design
  const columns: ColumnDef<Branch>[] = useMemo(
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
        header: 'Tên chi nhánh',
        meta: {
          width: 'w-[220px]',
          sortable: true,
        },
      },
      {
        accessorKey: 'phone',
        header: 'Số điện thoại',
        cell: ({ getValue }) => {
          const phone = getValue() as string
          return <span className="text-content-dark-1 text-sm">{phone || '-'}</span>
        },
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ getValue }) => {
          const email = getValue() as string
          return <span className="text-content-dark-1 text-sm">{email || '-'}</span>
        },
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'director',
        header: 'Giám đốc chi nhánh',
        cell: ({ row }) => {
          const director = row.original.director
          if (!director) {
            return <span className="text-content-dark-1 text-sm">-</span>
          }
          return (
            <div className="text-content-dark-1 typo-body-sm-medium">
              <div>{director.code || '-'}</div>
              <div className="break-words">{director.fullname || '-'}</div>
            </div>
          )
        },
        meta: {
          width: 'w-[180px]',
        },
      },
      {
        accessorKey: 'address',
        header: 'Địa chỉ',
        cell: ({ getValue }) => {
          const address = getValue() as string
          return (
            <span className="text-content-dark-1 typo-body-sm-medium break-words">
              {address || '-'}
            </span>
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
  const actions: TableAction<Branch>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.BRANCH_MANAGEMENT_DETAIL.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('retrieve', 'branch'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.BRANCH_MANAGEMENT_EDIT.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('update', 'branch'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => onDeleteBranch?.(record),
        show: () => ability.can('destroy', 'branch'),
      },
    ],
    [ability, onDeleteBranch, navigate]
  )

  if (error) {
    return <TableError />
  }

  // Handle sorting change - convert to URL format
  const handleSortingChange = (field: string, direction: 'asc' | 'desc' | null) => {
    onSortingChange(field, direction)
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
      manualPagination
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={handleSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      className="flex-1"
    />
  )
}

export default BranchTable
