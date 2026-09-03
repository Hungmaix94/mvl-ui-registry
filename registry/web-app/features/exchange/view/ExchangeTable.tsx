import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type ColumnDef, Table, type TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { APP_PATH } from '@/routes'
import type { Exchange } from '@/services/realestate-service.ts'
import { useAbility } from '@/lib/ability.ts'
import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'

type ExchangeTableProps = {
  data: Exchange[]
  isLoading: boolean
  error: unknown
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteExchange?: (exchange: Exchange) => void
  onClearFilter?: () => void
  hasFilter: boolean
  type: 'f2' | 'f0'
}

const ExchangeTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteExchange,
  onClearFilter,
  hasFilter,
  type,
}: ExchangeTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const columns: ColumnDef<Exchange>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        meta: {
          width: 'w-40',
          sortable: true,
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên sàn',
        meta: {
          width: 'w-48',
          sortable: true,
        },
      },
      {
        accessorKey: 'tax_code',
        header: 'Mã số thuế',
        cell: ({ row }) => row.original.tax_code || '-',
        meta: {
          width: 'w-40',
        },
      },
      {
        accessorKey: 'contact_person',
        header: 'Người liên hệ',
        cell: ({ row }) => row.original.contact_person || '-',
        meta: {
          width: 'w-48',
        },
      },
      {
        accessorKey: 'phone',
        header: 'Số điện thoại',
        cell: ({ row }) => row.original.phone || '-',
        meta: {
          width: 'w-40',
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email || '-',
        meta: {
          width: 'w-48',
        },
      },
      {
        // CR56 (86eyqwq7h). `established_date` là DateField(null=True) ở DB — chỉ bắt buộc từ
        // CR STT27 (20/08) nên bản ghi cũ vẫn null; `formatDate` tự trả '-' cho ca đó.
        accessorKey: 'established_date',
        header: 'Ngày thành lập',
        cell: ({ row }) => formatDate(row.original.established_date),
        meta: {
          width: 'w-32',
        },
      },
      {
        // CR56 (86eyqwq7h). `<td>` đã có sẵn `break-words whitespace-normal` nên địa chỉ dài
        // tự xuống dòng, không cần bọc span.
        accessorKey: 'address',
        header: 'Địa chỉ',
        cell: ({ row }) => row.original.address || '-',
        meta: {
          width: 'w-56',
        },
      },
      {
        accessorKey: 'is_active',
        header: 'Hoạt động',
        cell: ({ row }) => {
          const isActive = row.original.is_active ?? true
          return (
            <Chip
              label={isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
              variant={isActive ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
              size="small"
            />
          )
        },
        meta: {
          width: 'w-40',
        },
      },
    ],
    []
  )

  const actions: TableAction<Exchange>[] = useMemo(() => {
    const tableActions: TableAction<Exchange>[] = []

    // Adjusting permission names based on typical project patterns, though they may need verification
    if (ability.can('retrieve', 'exchange')) {
      tableActions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          const detailPathTemplate =
            type === 'f0'
              ? APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_DETAIL
              : APP_PATH.EXCHANGE_MANAGEMENT_DETAIL
          const detailPath = detailPathTemplate?.replace(':id', String(record.id))
          if (detailPath) {
            navigate(detailPath, {
              state: { from: window.location.pathname + window.location.search, type },
            })
          }
        },
      })
    }

    if (ability.can('update', 'exchange')) {
      tableActions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => {
          const editPathTemplate =
            type === 'f0'
              ? APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_EDIT
              : APP_PATH.EXCHANGE_MANAGEMENT_EDIT
          const editPath = editPathTemplate?.replace(':id', String(record.id))
          if (editPath) {
            navigate(editPath, {
              state: { from: window.location.pathname + window.location.search, type },
            })
          }
        },
      })
    }

    if (ability.can('destroy', 'exchange')) {
      tableActions.push({
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteExchange?.(record)
        },
      })
    }

    return tableActions
  }, [ability, onDeleteExchange, navigate])

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
      disableInnerOverflow
      paginationPosition="static"
      stickyHeader
    />
  )
}

export default ExchangeTable
