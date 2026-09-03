import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconCopy, IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import type { Collaborator } from '@/features/accounting/collaborators/services/collaborator-service.ts'
import { useColumnConfig } from '@/hooks/useColumnConfig'
import type { ColumnConfig } from '@/types/table'

type CollaboratorTableProps = {
  data: Collaborator[]
  isLoading: boolean
  error?: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onClone?: (record: Collaborator) => void
  onDelete?: (record: Collaborator) => void
  onClearFilter?: () => void
  hasFilter?: boolean
  isShowTableColumnConfig?: boolean
}

const CollaboratorTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onClone,
  onDelete,
  onClearFilter,
  hasFilter,
  isShowTableColumnConfig,
}: CollaboratorTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const allColumns: ColumnDef<Collaborator>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã CTV',
        cell: ({ getValue }) => <code>{String(getValue() ?? '')}</code>,
        meta: { width: 'w-[90px]' },
      },
      {
        accessorKey: 'name',
        header: 'Họ tên',
        cell: ({ getValue }) => (
          <span className="font-normal text-gray-900">{String(getValue() ?? '')}</span>
        ),
        meta: { width: 'w-[200px]' },
      },
      {
        id: 'id_number_or_tax_code',
        header: 'CMND/CCCD / MST',
        cell: ({ row }) => {
          const { id_number, tax_code } = row.original as any
          return tax_code || id_number || '-'
        },
        meta: { width: 'w-[160px]', sortable: false },
      },
      {
        accessorKey: 'phone',
        header: 'SĐT',
        cell: ({ getValue }) => String(getValue() || '-'),
        meta: { width: 'w-[110px]', sortable: false },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ getValue }) => String(getValue() || '-'),
        meta: { width: 'w-[200px]', sortable: false },
      },
      {
        id: 'bank_display',
        header: 'Ngân hàng',
        cell: ({ row }) => {
          const { bank_name, bank_account } = row.original
          if (!bank_name && !bank_account) return '-'
          return (
            <div className="flex flex-col">
              <span>{bank_name || '-'}</span>
              {bank_account && <span className="text-content-dark-3 text-xs">{bank_account}</span>}
            </div>
          )
        },
        meta: { width: 'w-[180px]', sortable: false },
      },
      {
        accessorKey: 'bank_branch',
        header: 'Chi nhánh NH',
        cell: ({ getValue }) => String(getValue() || '-'),
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        accessorKey: 'is_active',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const isActive = !!row.original.is_active
          return (
            <Chip
              variant={isActive ? ColoredValueVariant.GREEN : ColoredValueVariant.GREY}
              label={isActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}
            />
          )
        },
        meta: { width: 'w-[140px]', sortable: false },
      },
      {
        accessorKey: 'created_at',
        header: 'Ngày tạo',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          return value ? format(new Date(value), DATE_FORMAT) : '-'
        },
        meta: { width: 'w-[110px]' },
      },
    ],
    []
  )

  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'code', label: 'Mã CTV', visible: true, order: 0 },
      { id: 'name', label: 'Họ tên', visible: true, order: 1 },
      { id: 'id_number', label: 'CMND/CCCD', visible: true, order: 2 },
      { id: 'phone', label: 'SĐT', visible: true, order: 3 },
      { id: 'email', label: 'Email', visible: true, order: 4 },
      { id: 'bank_display', label: 'Ngân hàng', visible: true, order: 5 },
      { id: 'bank_branch', label: 'Chi nhánh NH', visible: true, order: 6 },
      { id: 'is_active', label: 'Trạng thái', visible: true, order: 7 },
      { id: 'created_at', label: 'Ngày tạo', visible: true, order: 8 },
    ],
    []
  )

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, {
    storageKey: 'accounting-collaborators',
  })

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) => allColumns.find((col) => (col as any).accessorKey === c.id || col.id === c.id))
      .filter(Boolean) as ColumnDef<Collaborator>[]
  }, [columnConfig, allColumns])

  const rowActions: TableAction<Collaborator>[] = useMemo(() => {
    const actions: TableAction<Collaborator>[] = []

    if (ability.can('retrieve', 'collaborator')) {
      actions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.COLLABORATOR_DETAIL.replace(':id', String(record.id))),
      })
    }

    if (ability.can('update', 'collaborator')) {
      actions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => navigate(APP_PATH.COLLABORATOR_EDIT.replace(':id', String(record.id))),
      })
    }

    if (ability.can('create', 'collaborator')) {
      actions.push({
        label: 'Nhân bản',
        icon: <IconCopy size={16} />,
        onClick: (record) => onClone?.(record),
      })
    }

    if (ability.can('destroy', 'collaborator')) {
      actions.push({
        label: 'Xóa',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => onDelete?.(record),
      })
    }

    return actions
  }, [ability, navigate, onClone, onDelete])

  if (error) {
    return <TableError />
  }

  return (
    <Table
      columns={visibleColumns}
      data={data}
      isLoading={isLoading}
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      showSTT
      showActions
      rowActions={rowActions}
      manualPagination
      manualSorting
      disableInnerOverflow={true}
      paginationPosition="static"
      stickyHeader
      className="flex-1"
      isShowTableColumnConfig={isShowTableColumnConfig}
      columnConfig={columnConfig}
      onColumnConfigApply={handleApply}
      onColumnConfigReset={handleReset}
    />
  )
}

export default CollaboratorTable
