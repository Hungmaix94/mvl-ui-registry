import { useMemo } from 'react'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconCheck, IconX, IconTrash } from '@/assets/icons'
import { parseDateTimeFromApi } from '@/utils/date-utils'
import { type LibraryAccessRequestRead } from '@/services/elibrary-service'
import {
  AccessRequestRole,
  AccessRequestStatus,
  getAccessRequestStatusDisplay,
  type AccessRequestRoleValue,
} from '@/features/elibrary/access-requests/constants'
import { useAccessRequestActions } from '@/features/elibrary/access-requests/hooks/useAccessRequestActions'

type AccessRequestsTableProps = {
  data: LibraryAccessRequestRead[]
  role: AccessRequestRoleValue
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const AccessRequestsTable = ({
  data,
  role,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onClearFilter,
  hasFilter = false,
}: AccessRequestsTableProps) => {
  const { openApproveDialog, openRejectDialog, openCancelDialog } = useAccessRequestActions()
  const isOwnerView = role === AccessRequestRole.owner

  const columns: ColumnDef<LibraryAccessRequestRead>[] = useMemo(() => {
    const cols: ColumnDef<LibraryAccessRequestRead>[] = [
      {
        accessorKey: 'item_name',
        header: 'Tài liệu',
        cell: ({ row }) => row.original.item_name || '-',
        meta: { width: '220px' },
      },
    ]

    if (isOwnerView) {
      cols.push({
        id: 'requester',
        header: 'Người xin',
        cell: ({ row }) => row.original.requester?.display_name || '-',
        meta: { width: '180px' },
      })
    }

    cols.push(
      {
        accessorKey: 'message',
        header: 'Lời nhắn',
        cell: ({ row }) => row.original.message || '-',
        meta: { width: 'flex-1' },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        meta: { width: '120px' },
        cell: ({ getValue }) => {
          const { label, variant } = getAccessRequestStatusDisplay(getValue() as string)
          return <Chip label={label} variant={variant} size="small" />
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Ngày gửi',
        cell: ({ row }) => parseDateTimeFromApi(row.original.created_at),
        meta: { width: '150px' },
      }
    )

    return cols
  }, [isOwnerView])

  const actions: TableAction<LibraryAccessRequestRead>[] = useMemo(() => {
    if (isOwnerView) {
      return [
        {
          label: 'Duyệt',
          icon: <IconCheck size={16} />,
          variant: 'success',
          show: (row) => row.status === AccessRequestStatus.pending,
          onClick: (row) => openApproveDialog(row),
        },
        {
          label: 'Từ chối',
          icon: <IconX size={16} className="text-action-primary-red-default" />,
          variant: 'danger',
          show: (row) => row.status === AccessRequestStatus.pending,
          onClick: (row) => openRejectDialog(row),
        },
      ]
    }
    return [
      {
        label: 'Huỷ yêu cầu',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        show: (row) => row.status === AccessRequestStatus.pending,
        onClick: (row) => openCancelDialog(row),
      },
    ]
  }, [isOwnerView, openApproveDialog, openRejectDialog, openCancelDialog])

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
      enablePagination
      manualPagination
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      className="flex-1"
    />
  )
}

export default AccessRequestsTable
