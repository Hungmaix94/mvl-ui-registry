import { useMemo } from 'react'
import { ColumnDef, Table } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { Permission } from '@/services'

type PermissionDetailsTableProps = {
  permissions: Permission[]
}

const RolePermissionsTable = ({ permissions }: PermissionDetailsTableProps) => {
  // Define columns based on Figma design
  const columns: ColumnDef<Permission>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        meta: {
          width: 'w-[200px]',
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên quyền',
        cell: ({ getValue }) => {
          const name = getValue() as string
          return <span className="text-content-dark-1 text-sm">{name || '-'}</span>
        },
        meta: {
          width: 'w-[400px]',
        },
      },
      {
        accessorKey: 'description',
        header: 'Mô tả',
        cell: ({ getValue }) => {
          const description = getValue() as string
          return <span className="text-content-dark-1 text-sm">{description || '-'}</span>
        },
        meta: {
          width: 'flex-1',
        },
      },
    ],
    []
  )

  if (!permissions || permissions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-content-dark-3">Không có quyền nào được gán cho vai trò này</span>
      </div>
    )
  }

  return (
    <Flex direction="column" gap={'20px'} className={'pt-4 pb-8'}>
      <div className="space-y-4">
        <h3 className="text-content-dark-1 text-lg font-semibold">Phân quyền</h3>
        <Table
          data={permissions}
          columns={columns}
          showSTT
          showActions={false}
          enablePagination={false}
          enableSorting={false}
          emptyMessage="Không có quyền nào được gán cho vai trò này"
          className="flex-1 px-0"
        />
      </div>
    </Flex>
  )
}

export default RolePermissionsTable
