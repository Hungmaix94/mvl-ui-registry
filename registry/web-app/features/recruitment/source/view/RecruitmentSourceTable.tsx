import { useMemo } from 'react'
import { ColumnDef, Table, TableAction } from '@/components/ui'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import type { RecruitmentSource } from '@/features/recruitment/services/recruitment-source-service'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import TableError from '@/components/ui/table/TableError.tsx'

type RecruitmentSourceTableProps = {
  data: RecruitmentSource[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteRecruitmentSource?: (source: RecruitmentSource) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const RecruitmentSourceTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteRecruitmentSource,
  onClearFilter,
  hasFilter,
}: RecruitmentSourceTableProps) => {
  const navigate = useNavigate()

  const columns: ColumnDef<RecruitmentSource>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã nguồn',
        meta: {
          width: 'w-[120px]',
          sortable: true,
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên nguồn',
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
          width: 'flex-1',
        },
      },
    ],
    []
  )

  const actions: TableAction<RecruitmentSource>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.RECRUITMENT_SOURCE_DETAIL.replace(':id', String(record.id))}`),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.RECRUITMENT_SOURCE_EDIT.replace(':id', String(record.id))}`),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteRecruitmentSource?.(record)
        },
      },
    ],
    [onDeleteRecruitmentSource, navigate]
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
      enablePagination
      manualPagination
      manualSorting
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      pageCount={pageCount}
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

export default RecruitmentSourceTable
