import { useMemo, useCallback } from 'react'
import { ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash, IconCopy } from '@/assets/icons'
import { type JobDescription } from '@/features/recruitment/services/job-description-service'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'

type JobDescriptionTableProps = {
  data: JobDescription[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteJobDescription?: (jobDescription: JobDescription) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const JobDescriptionTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteJobDescription,
  onClearFilter,
  hasFilter,
}: JobDescriptionTableProps) => {
  const navigate = useNavigate()

  // Define columns according to Figma design
  const columns: ColumnDef<JobDescription>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        id: 'code',
        header: 'Mã JD',
        meta: {
          width: 'w-[100px]',
          sortable: true,
        },
      },
      {
        accessorKey: 'title',
        id: 'title',
        header: 'Tiêu đề',
        cell: ({ getValue }) => {
          const title = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={title}>
              {title || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
          sortable: true,
        },
      },
      {
        accessorKey: 'position_title',
        id: 'position_title', // Use unique id for this column
        header: 'Vị trí tuyển dụng',
        meta: {
          width: 'w-[250px]',
          sortable: false, // Not sortable since it's derived from title
        },
      },
      {
        accessorKey: 'created_at',
        id: 'created_at',
        header: 'Ngày tạo',
        cell: ({ getValue }) => {
          const dateString = getValue() as string
          const formattedDate = dateString ? format(new Date(dateString), DATE_FORMAT) : '-'
          return (
            <span className="text-content-dark-1 text-sm" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: {
          width: 'w-[150px]',
          sortable: true,
        },
      },
    ],
    []
  )

  // Handle copy job description - navigate to create page with initial data
  const handleCopyJobDescription = useCallback(
    (jobDescription: JobDescription) => {
      navigate(APP_PATH.RECRUITMENT_JOB_DESCRIPTION_CREATE, {
        state: {
          copyFrom: jobDescription,
        },
      })
    },
    [navigate]
  )

  // Handle delete job description with refresh callback
  const handleDeleteJobDescription = useCallback(
    (jobDescription: JobDescription) => {
      onDeleteJobDescription?.(jobDescription)
    },
    [onDeleteJobDescription]
  )

  // Define row actions
  const actions: TableAction<JobDescription>[] = useMemo(
    () => [
      // View detail
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(
            `${APP_PATH.RECRUITMENT_JOB_DESCRIPTION_DETAIL.replace(':id', String(record.id))}`,
            { state: { from: window.location.pathname + window.location.search } }
          ),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(
            `${APP_PATH.RECRUITMENT_JOB_DESCRIPTION_EDIT.replace(':id', String(record.id))}`,
            { state: { from: window.location.pathname + window.location.search } }
          ),
      },
      {
        label: 'Tạo bản sao',
        icon: <IconCopy size={16} />,
        onClick: (record) => {
          handleCopyJobDescription(record)
        },
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          handleDeleteJobDescription(record)
        },
      },
    ],
    [navigate, handleCopyJobDescription, handleDeleteJobDescription]
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
      enablePagination
      manualPagination
      pageSize={pageSize}
      pageCount={pageCount}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      emptyMessage="Không có mô tả công việc nào"
    />
  )
}

export default JobDescriptionTable
