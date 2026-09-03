import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type ColumnDef, Table, type TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { APP_PATH } from '@/routes'
import { type Holiday } from '@/features/attendance/services/holiday-service'
import { useAbility } from '@/lib/ability'
import { formatDate } from '@/utils/date-utils.ts'

type HolidayTableProps = {
  data: Holiday[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteHoliday?: (holiday: Holiday) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const HolidayTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteHoliday,
  onClearFilter,
  hasFilter,
}: HolidayTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const columns: ColumnDef<Holiday>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Tên ngày lễ',
        meta: {
          width: '200px',
          sortable: true,
        },
      },
      {
        id: 'date_range',
        header: 'Ngày bắt đầu - Ngày kết thúc',
        cell: ({ row }) => {
          const startDate = row.original.start_date ? formatDate(row.original.start_date) : '-'
          const endDate = row.original.end_date ? formatDate(row.original.end_date) : '-'
          return (
            <span className="text-content-dark-1 text-sm">
              {startDate} - {endDate}
            </span>
          )
        },
        meta: {
          width: '200px',
        },
      },
      {
        accessorKey: 'notes',
        header: 'Ghi chú',
        cell: ({ getValue }) => {
          const notes = getValue() as string
          return <span className="text-content-dark-1 text-sm break-words">{notes || '-'}</span>
        },
        meta: {
          width: 'flex-1',
        },
      },
    ],
    []
  )

  const actions: TableAction<Holiday>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.HOLIDAY_MANAGEMENT_DETAIL.replace(':id', String(record.id)), {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('retrieve', 'holiday'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.HOLIDAY_MANAGEMENT_EDIT.replace(':id', String(record.id)), {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('update', 'holiday'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteHoliday?.(record)
        },
        show: () => ability.can('destroy', 'holiday'),
      },
    ],
    [ability, onDeleteHoliday, navigate]
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

export default HolidayTable
