import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type ColumnDef, Table, type TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { APP_PATH } from '@/routes'
import type { Investor } from '@/services/realestate-service.ts'
import { useAbility } from '@/lib/ability.ts'
import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'

type InvestorTableProps = {
  data: Investor[]
  isLoading: boolean
  error: unknown
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteInvestor?: (investor: Investor) => void
  onClearFilter?: () => void
  hasFilter: boolean
}

const InvestorTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteInvestor,
  onClearFilter,
  hasFilter,
}: InvestorTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const columns: ColumnDef<Investor>[] = useMemo(
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
        header: 'Tên chủ đầu tư',
        meta: {
          width: 'w-48',
          sortable: true,
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
        //
        // Nhãn "Ngày sinh nhật" chỉ ở màn CĐT; hai màn sàn vẫn gọi "Ngày thành lập"
        // (`ExchangeTable`). Cùng MỘT cột dữ liệu `established_date`, khác cách gọi — quyết định
        // nghiệp vụ của user 26/08/2026. Đừng "thống nhất lại cho gọn" ở một phía.
        // Nhãn ô lọc tương ứng truyền qua prop `dateLabel` của `PartnerFilterForm`; đổi ở đây thì
        // phải đổi cả bên đó, nếu không tiêu đề cột và tiêu đề bộ lọc gọi hai tên cho một thứ.
        accessorKey: 'established_date',
        header: 'Ngày sinh nhật',
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

  const actions: TableAction<Investor>[] = useMemo(() => {
    const tableActions: TableAction<Investor>[] = []

    if (ability.can('retrieve', 'investor')) {
      tableActions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          const detailPath = APP_PATH.INVESTOR_MANAGEMENT_DETAIL.replace(':id', String(record.id))
          navigate(detailPath, {
            state: { from: window.location.pathname + window.location.search },
          })
        },
      })
    }

    if (ability.can('update', 'investor')) {
      tableActions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => {
          const editPath = APP_PATH.INVESTOR_MANAGEMENT_EDIT.replace(':id', String(record.id))
          navigate(editPath, {
            state: { from: window.location.pathname + window.location.search },
          })
        },
      })
    }

    if (ability.can('destroy', 'investor')) {
      tableActions.push({
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteInvestor?.(record)
        },
      })
    }

    return tableActions
  }, [ability, onDeleteInvestor, navigate])

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

export default InvestorTable
