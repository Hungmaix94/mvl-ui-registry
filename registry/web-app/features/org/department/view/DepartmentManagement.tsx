import { useMemo } from 'react'
import { Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { TableAction, TableConfig } from '@/types/table.ts'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import type { Department } from '@/features/org/services/department-service'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { Flex } from '@radix-ui/themes'

type DepartmentManagementProps = {
  data: Department[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteDepartment?: (department: Department) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

function DepartmentManagement({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteDepartment,
  onClearFilter,
  hasFilter,
}: DepartmentManagementProps) {
  const navigate = useNavigate()
  const ability = useAbility()

  const columns: TableConfig<Department>['columns'] = useMemo(
    () => [
      { accessorKey: 'code', header: 'Mã', meta: { sortable: true } },
      { accessorKey: 'name', header: 'Tên phòng ban', meta: { sortable: true } },
      {
        accessorKey: 'is_main_department',
        header: 'Cấp',
        cell: ({ row }) => (row.original.is_main_department ? 'Đầu mối' : ''),
      },
      {
        accessorKey: 'block.name',
        header: 'Khối',
        cell: ({ row }) => {
          const blockName = typeof row.original.block === 'object' ? row.original.block.name : '-'
          return (
            <span className="text-content-dark-1 text-sm" title={blockName || ''}>
              {blockName || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'branch.name',
        header: 'Chi nhánh',
        cell: ({ row }) => {
          const branchName =
            typeof row.original.branch === 'object' ? row.original.branch.name : '-'
          return (
            <span className="text-content-dark-1 text-sm" title={branchName || ''}>
              {branchName || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'leader',
        header: 'Trưởng phòng',
        cell: ({ row }) => {
          if (!row.original.leader) {
            return <></>
          }
          return (
            <>
              <Flex
                direction={'column'}
                align={'start'}
                className={'text-content-dark-1 typo-body-sm-medium'}
              >
                <span>{row.original.leader?.code || '-'}</span>
                <span>{row.original.leader?.fullname || '-'}</span>
              </Flex>
            </>
          )
        },
      },
    ],
    []
  )

  const actions: TableAction<Department>[] = useMemo(() => {
    const tableActions: TableAction<Department>[] = []

    if (ability.can('retrieve', 'department')) {
      tableActions.push({
        label: 'Xem chi tiết',
        icon: <IconEye className="h-4 w-4" />,
        onClick: (row) =>
          navigate(`${APP_PATH.DEPARTMENT_MANAGEMENT_DETAIL.replace(':id', String(row.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      })
    }

    if (ability.can('update', 'department')) {
      tableActions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple className="h-4 w-4" />,
        onClick: (row) =>
          navigate(`${APP_PATH.DEPARTMENT_MANAGEMENT_EDIT.replace(':id', String(row.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      })
    }

    if (ability.can('destroy', 'department')) {
      tableActions.push({
        label: 'Xóa',
        icon: <IconTrash className="h-4 w-4" />,
        variant: 'danger',
        onClick: (row) => onDeleteDepartment?.(row),
      })
    }

    return tableActions
  }, [ability, navigate, onDeleteDepartment])

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
      emptyMessage="Không có dữ liệu phòng ban"
      className="flex-1"
    />
  )
}

export default DepartmentManagement
