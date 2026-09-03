import { ColumnDef, Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import type { Permission } from '@/services/permission-service.ts'
import { useMemo } from 'react'

type PermissionManagementTableProps = {
  data: Permission[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onClearAll?: () => void
  hasFilter?: boolean
}

const PermissionManagementTable = ({
  data: permissions,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onClearAll,
  hasFilter,
}: PermissionManagementTableProps) => {
  // Define columns
  const columns: ColumnDef<Permission>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        meta: {
          width: 'w-36',
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên quyền',
        meta: {
          width: 'w-48',
        },
      },
      {
        accessorKey: 'description',
        header: 'Mô tả',
        meta: {
          width: 'flex-1',
        },
      },
    ],
    []
  )

  if (error) {
    return <TableError />
  }

  return (
    <>
      <Table
        data={permissions}
        columns={columns}
        showSTT
        enableSorting
        manualSorting
        enablePagination
        manualPagination
        pageCount={pageCount}
        pageSize={pageSize}
        currentPageIndex={currentPage - 1}
        totalRecords={totalRecords}
        onPaginationChange={onPaginationChange}
        onSortingChange={onSortingChange}
        isLoading={isLoading}
        hasFilter={hasFilter}
        emptyMessage="Không có dữ liệu quyền"
        className="flex-1 px-7"
        onClearFilter={onClearAll}
      />
    </>
  )
}

export default PermissionManagementTable
