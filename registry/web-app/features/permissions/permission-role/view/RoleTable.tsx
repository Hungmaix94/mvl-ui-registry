import { useMemo, useCallback } from 'react'
import { ColumnDef, Table, TableAction } from '@/components/ui'
import Chip from '@/components/ui/chip/Chip.tsx'
import TableError from '@/components/ui/table/TableError'
import { IconCopy, IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type Role, useCloneRole } from '@/services/role-service.ts'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { useAbility } from '@/lib/ability.ts'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import {
  DATA_SCOPE_LEVEL_LABEL,
  DATA_SCOPE_LEVEL_VARIANT,
} from '@/features/permissions/permission-role/_shares/constants/data-scope.ts'

type RoleTableProps = {
  data: Role[]
  isLoading: boolean
  error: unknown
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteRole?: (role: Role) => void
  onClearFilter?: () => void
  hasFilter: boolean
}

const listFromState = () => ({
  from: window.location.pathname + window.location.search,
})

const RoleTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteRole,
  onClearFilter,
  hasFilter,
}: RoleTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const cloneRoleMutation = useCloneRole()

  const cloneRole = useCallback(
    async (roleId: number) => {
      try {
        const response = await cloneRoleMutation.mutateAsync(roleId)
        if (response?.id) {
          toastService.success('Tạo bản sao vai trò thành công')
          navigate(APP_PATH.PERMISSION_ROLE_MANAGEMENT_EDIT.replace(':id', String(response.id)), {
            state: listFromState(),
          })
        }
      } catch (err) {
        handleApiError(err)
      }
    },
    [cloneRoleMutation, navigate]
  )

  const columns: ColumnDef<Role>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        meta: {
          width: 'w-32',
          sortable: true,
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên vai trò',
        meta: {
          width: 'w-48',
          sortable: true,
        },
      },
      {
        accessorKey: 'created_by',
        header: 'Người tạo',
        meta: {
          width: 'w-36',
        },
      },
      {
        accessorKey: 'data_scope_level',
        header: 'Phạm vi dữ liệu',
        cell: ({ row }) => {
          const level = row.original.data_scope_level
          const display =
            row.original.data_scope_level_display || (level ? DATA_SCOPE_LEVEL_LABEL[level] : '')
          if (!display) {
            return <span className="text-content-dark-2 text-sm">-</span>
          }
          return (
            <Chip
              label={display}
              variant={level ? DATA_SCOPE_LEVEL_VARIANT[level] : undefined}
              type="outlined"
            />
          )
        },
        meta: {
          width: 'w-48',
        },
      },
      {
        accessorKey: 'description',
        header: 'Mô tả',
        cell: ({ getValue }) => {
          const description = getValue() as string
          return <span className="text-content-dark-2 text-sm">{description || '-'}</span>
        },
        meta: {
          width: 'flex-1',
        },
      },
    ],
    []
  )

  const actions: TableAction<Role>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(
            `${APP_PATH.PERMISSION_ROLE_MANAGEMENT_DETAIL.replace(':id', String(record.id))}`,
            { state: listFromState() }
          ),
        show: () => ability.can('retrieve', 'role'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(
            `${APP_PATH.PERMISSION_ROLE_MANAGEMENT_EDIT.replace(':id', String(record.id))}`,
            { state: listFromState() }
          ),
        show: (record) => !record.is_system_role && ability.can('update', 'role'),
      },
      {
        label: 'Tạo bản sao',
        icon: <IconCopy size={16} />,
        onClick: (record) => cloneRole(record.id),
        show: () => ability.can('clone', 'role'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteRole?.(record)
        },
        show: (record) => !record.is_system_role && ability.can('destroy', 'role'),
      },
    ],
    [ability, cloneRole, navigate, onDeleteRole]
  )

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
      className="flex-1"
    />
  )
}

export default RoleTable
