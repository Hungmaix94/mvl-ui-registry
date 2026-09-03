import { useMemo } from 'react'
import { ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import type { RecruitmentChannel } from '@/features/recruitment/services/recruitment-channel-service'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'

type RecruitmentChannelTableProps = {
  data: RecruitmentChannel[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteRecruitmentChannel?: (channel: RecruitmentChannel) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const RecruitmentChannelTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteRecruitmentChannel,
  onClearFilter,
  hasFilter,
}: RecruitmentChannelTableProps) => {
  const navigate = useNavigate()

  const columns: ColumnDef<RecruitmentChannel>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã kênh',
        meta: {
          width: 'w-[120px]',
          sortable: true,
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên kênh',
        meta: {
          width: 'w-[220px]',
          sortable: true,
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
          headerClassName: 'flex-1',
        },
      },
    ],
    []
  )

  const actions: TableAction<RecruitmentChannel>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.RECRUITMENT_CHANNEL_DETAIL.replace(':id', String(record.id))}`),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.RECRUITMENT_CHANNEL_EDIT.replace(':id', String(record.id))}`),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteRecruitmentChannel?.(record)
        },
      },
    ],
    [onDeleteRecruitmentChannel, navigate]
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
      manualPagination
      manualSorting
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

export default RecruitmentChannelTable
