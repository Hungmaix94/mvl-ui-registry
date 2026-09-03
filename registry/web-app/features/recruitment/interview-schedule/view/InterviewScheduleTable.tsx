import { useCallback, useMemo } from 'react'
import { ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash, IconPaperplane } from '@/assets/icons'
import type { InterviewSchedule } from '@/features/recruitment/services/interview-service'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { useAbility } from '@/lib/ability.ts'

type InterviewScheduleTableProps = {
  data: InterviewSchedule[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords?: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteInterviewSchedule?: (schedule: InterviewSchedule) => void
  onSendInterviewInvite?: (schedule: InterviewSchedule) => void
  canSendInterviewInvite?: boolean
  onClearFilter?: () => void
  hasFilter?: boolean
}

const InterviewScheduleTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  onPaginationChange,
  onSortingChange,
  onDeleteInterviewSchedule,
  onSendInterviewInvite,
  canSendInterviewInvite = false,
  onClearFilter,
  hasFilter = false,
}: InterviewScheduleTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  // Define columns according to Figma design
  const columns: ColumnDef<InterviewSchedule>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        id: 'title',
        header: 'Lịch phỏng vấn',
        cell: ({ getValue }) => {
          const title = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={title}>
              {title || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[200px]',
          sortable: true,
        },
      },
      {
        accessorKey: 'recruitment_request',
        id: 'recruitment_request',
        header: 'Đề nghị tuyển dụng',
        cell: ({ getValue }) => {
          const recruitmentRequest = getValue() as InterviewSchedule['recruitment_request']
          const name = recruitmentRequest?.name
          return (
            <span className="text-content-dark-1 text-sm break-words" title={name}>
              {name || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
          sortable: false,
        },
      },
      {
        accessorKey: 'location',
        id: 'location',
        header: 'Vị trí phỏng vấn',
        cell: ({ getValue }) => {
          const location = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={location}>
              {location || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[200px]',
          sortable: false,
        },
      },
      {
        accessorKey: 'number_of_candidates',
        id: 'number_of_candidates',
        header: 'SL Ư.Tuyển',
        cell: ({ getValue }) => {
          const count = getValue() as number
          return (
            <span className="text-content-dark-1 text-center text-sm" title={String(count)}>
              {count || 0}
            </span>
          )
        },
        meta: {
          width: 'w-[85px]',
          headerClassName: 'text-nowrap',
          sortable: false,
        },
      },
      {
        accessorKey: 'time',
        id: 'time',
        header: 'Thời gian',
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
          width: 'w-[120px]',
          sortable: true,
        },
      },
    ],
    []
  )

  // Handle delete interview schedule
  const handleDeleteInterviewSchedule = useCallback(
    (schedule: InterviewSchedule) => {
      onDeleteInterviewSchedule?.(schedule)
    },
    [onDeleteInterviewSchedule]
  )

  // Navigate to detail page with state for back navigation
  const navigateToDetail = useCallback(
    (path: string) => {
      navigate(path, {
        state: { from: window.location.pathname + window.location.search },
      })
    },
    [navigate]
  )

  // Define row actions
  const actions: TableAction<InterviewSchedule>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigateToDetail(
            APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_DETAIL.replace(':id', String(record.id))
          ),
        show: () => ability.can('retrieve', 'interview_schedule'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigateToDetail(
            APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_EDIT.replace(':id', String(record.id))
          ),
        show: () => ability.can('update', 'interview_schedule'),
      },
      {
        label: 'Gửi email',
        icon: <IconPaperplane size={16} />,
        onClick: (record) => {
          onSendInterviewInvite?.(record)
        },
        show: () => canSendInterviewInvite,
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          handleDeleteInterviewSchedule(record)
        },
        show: () => ability.can('destroy', 'interview_schedule'),
      },
    ],
    [
      navigateToDetail,
      handleDeleteInterviewSchedule,
      onSendInterviewInvite,
      canSendInterviewInvite,
      ability,
    ]
  )

  // Handle pagination change - convert to 0-based index for parent
  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      onPaginationChange(pageIndex, newPageSize)
    },
    [onPaginationChange]
  )

  // Handle sorting change
  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      onSortingChange(field, direction)
    },
    [onSortingChange]
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
      currentPageIndex={currentPage - 1}
      pageCount={pageCount}
      onPaginationChange={handlePaginationChange}
      onSortingChange={handleSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      emptyMessage="Không có lịch phỏng vấn nào"
    />
  )
}

export default InterviewScheduleTable
